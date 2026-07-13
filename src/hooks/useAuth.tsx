import { useTranslation } from 'react-i18next';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailOtpType, MobileOtpType } from '@supabase/supabase-js';
import { identifyUser, resetUser } from '@/lib/analytics';
import { setSentryUser } from '@/lib/sentry';

const PHONE_EMAIL_MAP_KEY = 'apnabazar_phone_email_map';

interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_blocked?: boolean;
  email_confirmed?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (
    phone: string,
    name: string,
    email: string,
    password: string,
    isIntern?: boolean,
  ) => Promise<{ error: Error | null }>;
  signIn: {
    sendOtp: (phone: string) => Promise<void>;
    verifyOtp: (phone: string, otp: string) => Promise<{ error: Error | null }>;
    password: (
      identifier: string,
      password: string,
    ) => Promise<{ error: Error | null }>;
  };
  verifyOtp: (params: {
    email?: string;
    phone?: string;
    token: string;
    type: EmailOtpType | MobileOtpType;
  }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resendOtp: (
    email: string,
    type?: EmailOtpType,
  ) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function storePhoneEmail(phone: string, email: string) {
  try {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return;
    const raw = localStorage.getItem(PHONE_EMAIL_MAP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[digits] = email;
    localStorage.setItem(PHONE_EMAIL_MAP_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable
  }
}

function getEmailForPhone(phone: string) {
  try {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const raw = localStorage.getItem(PHONE_EMAIL_MAP_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[digits] || null;
  } catch {
    return null;
  }
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return phone;
  return digits.startsWith('91') && digits.length === 12
    ? `+${digits}`
    : `+91${digits}`;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_KEY = 'apnabazar_auth_rate_limit';

function getRateLimitData(): Record<
  string,
  { count: number; lockedUntil: number | null }
> {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRateLimitData(data: Record<string, any>) {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

function checkLockout(identifier: string): {
  isLocked: boolean;
  remainingMs: number;
} {
  const data = getRateLimitData();
  const entry = data[identifier];
  if (!entry || !entry.lockedUntil) return { isLocked: false, remainingMs: 0 };

  const now = Date.now();
  if (now >= entry.lockedUntil) {
    // Lockout expired
    delete data[identifier];
    saveRateLimitData(data);
    return { isLocked: false, remainingMs: 0 };
  }

  return { isLocked: true, remainingMs: entry.lockedUntil - now };
}

function recordFailure(identifier: string) {
  const data = getRateLimitData();
  const entry = data[identifier] || { count: 0, lockedUntil: null };
  entry.count += 1;

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  data[identifier] = entry;
  saveRateLimitData(data);
  return entry;
}

function recordSuccess(identifier: string) {
  const data = getRateLimitData();
  delete data[identifier];
  saveRateLimitData(data);
}

function normalizePasswordLoginError(error: Error) {
  const msg = error.message || 'Login failed';
  if (
    /invalid login credentials|user not found|email not confirmed/i.test(msg)
  ) {
    return new Error(
      'Account not found or incorrect password. Please check your credentials or create a new account.',
    );
  }
  if (/network error|fetch|network/i.test(msg)) {
    return new Error(
      'Unable to connect. Please check your internet connection and try again.',
    );
  }
  return error;
}

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
};

type AuthAction =
  | { type: 'SET_AUTH'; payload: { user: AuthUser | null; loading: boolean } }
  | { type: 'SET_LOADING'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        user: action.payload.user,
        loading: action.payload.loading,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
  });

  useEffect(() => {
    const checkUser = async (session: any) => {
      if (!session?.user) {
        dispatch({ type: 'SET_AUTH', payload: { user: null, loading: false } });
        return;
      }

      const meta = session.user.user_metadata || {};
      let role = meta.role || 'seller';
      let is_blocked = false;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_blocked')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          role = profile.role || role;
          is_blocked = !!profile.is_blocked;

          // If not already blocked by profile, check seller status
          if (!is_blocked && role === 'seller') {
            const { data: seller } = await supabase
              .from('sellers')
              .select('status')
              .eq('user_id', session.user.id)
              .maybeSingle();
            if (seller?.status === 'blocked') {
              is_blocked = true;
            }
          }
        } else {
          // Profile missing - create one
          await supabase
            .from('profiles')
            .upsert(
              {
                id: session.user.id,
                email: session.user.email,
                role: role,
              },
              { onConflict: 'id' },
            )
            .maybeSingle();
        }
      } catch (e) {
        console.warn('[Auth] Profile check failed:', e);
      }

      if (is_blocked) {
        await supabase.auth.signOut();
        dispatch({ type: 'SET_AUTH', payload: { user: null, loading: false } });
        // Set a flag in session storage to show the blocked message on the Auth page
        sessionStorage.setItem('apnabazar_blocked_alert', 'true');
      } else {
        dispatch({
          type: 'SET_AUTH',
          payload: {
            user: {
              id: session.user.id,
              email: session.user.email,
              name: meta.name || '',
              phone: meta.phone || meta.phone_number || '',
              role,
              is_blocked,
              email_confirmed: !!session.user.email_confirmed_at,
            },
            loading: false,
          },
        });
      }
    };

    const restore = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await checkUser(session);
    };
    restore();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_AUTH', payload: { user: null, loading: false } });
        return;
      }
      checkUser(session);
    });

    // Real-time subscription to current user's profile status
    let profileSubscription: any = null;

    const setupProfileSubscription = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        profileSubscription = supabase
          .channel(`profile-status-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${session.user.id}`,
            },
            payload => {
              if (payload.new && (payload.new as any).is_blocked) {
                supabase.auth.signOut().then(() => {
                  dispatch({
                    type: 'SET_AUTH',
                    payload: { user: null, loading: false },
                  });
                  sessionStorage.setItem('apnabazar_blocked_alert', 'true');
                  window.location.href = '/auth';
                });
              }
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'sellers',
              filter: `user_id=eq.${session.user.id}`,
            },
            payload => {
              if (payload.new && (payload.new as any).status === 'blocked') {
                supabase.auth.signOut().then(() => {
                  dispatch({
                    type: 'SET_AUTH',
                    payload: { user: null, loading: false },
                  });
                  sessionStorage.setItem('apnabazar_blocked_alert', 'true');
                  window.location.href = '/auth';
                });
              }
            },
          )
          .subscribe();
      }
    };

    setupProfileSubscription();

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) profileSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state.user) {
      identifyUser(state.user.id, {
        email: state.user.email,
        role: state.user.role,
      });
      setSentryUser({
        id: state.user.id,
        email: state.user.email,
        role: state.user.role,
      });
    } else if (!state.loading) {
      resetUser();
      setSentryUser(null);
    }
  }, [state.user, state.loading]);

  const signUp = async (
    phone: string,
    name: string,
    email: string,
    password: string,
    isBuyer = false,
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone: normalizePhone(phone),
            role: isBuyer ? 'buyer' : 'seller',
          },
        },
      });

      if (error) {
        return { error };
      }

      storePhoneEmail(phone, email);

      if (data.session && data.user) {
        try {
          await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              email,
              role: isBuyer ? 'buyer' : 'seller',
            },
            { onConflict: 'id' },
          );
        } catch (profileErr) {
          console.warn(
            '[Auth] Profile upsert exception (non-fatal):',
            profileErr,
          );
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error') };
    }
  };

  const sendOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  const genericVerifyOtp = async (params: {
    email?: string;
    phone?: string;
    token: string;
    type: EmailOtpType | MobileOtpType;
  }) => {
    try {
      const verifyParams: any = {
        token: params.token,
        type: params.type,
      };
      if (params.email) verifyParams.email = params.email;
      if (params.phone) verifyParams.phone = normalizePhone(params.phone);

      const { data, error } = await supabase.auth.verifyOtp(verifyParams);
      if (error) return { error: new Error(error.message) };

      if (data.session?.user?.email && params.phone) {
        storePhoneEmail(params.phone, data.session.user.email);
      }

      // If this was a signup verification, ensure profile exists
      if (params.type === 'signup' && data.user) {
        const meta = data.user.user_metadata || {};
        await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email || params.email,
              role: meta.role || 'seller',
            },
            { onConflict: 'id' },
          )
          .maybeSingle();
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error') };
    }
  };

  const passwordLogin = async (identifier: string, password: string) => {
    try {
      const cleanIdentifier = identifier.trim().toLowerCase();

      // Check rate limit
      const { isLocked, remainingMs } = checkLockout(cleanIdentifier);
      if (isLocked) {
        const minutes = Math.ceil(remainingMs / 60000);
        return {
          error: new Error(
            `Too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? t('auto.s') : ''} for security reasons.`,
          ),
        };
      }

      const email = cleanIdentifier.includes('@')
        ? cleanIdentifier
        : getEmailForPhone(cleanIdentifier) ||
          `${cleanIdentifier.replace(/\D/g, '')}@snapshop.app`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        recordFailure(cleanIdentifier);
        return { error: normalizePasswordLoginError(error) };
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_blocked, role')
          .eq('id', data.user.id)
          .single();
        let blocked = profile?.is_blocked;

        if (!blocked && profile?.role === 'seller') {
          const { data: seller } = await supabase
            .from('sellers')
            .select('status')
            .eq('user_id', data.user.id)
            .maybeSingle();
          if (seller?.status === 'blocked') blocked = true;
        }

        if (blocked) {
          await supabase.auth.signOut();
          return {
            error: new Error(
              'You have been blocked by the admin. Please contact the admin for any queries at koushikreddybanuri@gmail.com',
            ),
          };
        }
      }

      recordSuccess(cleanIdentifier);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error') };
    }
  };

  const signOut = async () => {
    resetUser();
    setSentryUser(null);
    dispatch({ type: 'SET_AUTH', payload: { user: null, loading: false } });
    await supabase.auth.signOut({ scope: 'global' });
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-')) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error') };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error') };
    }
  };

  const resendOtp = async (email: string, type: EmailOtpType = 'signup') => {
    try {
      const { error } = await supabase.auth.resend({
        email: email.trim().toLowerCase(),
        type,
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error') };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        loading: state.loading,
        signUp,
        signIn: {
          sendOtp,
          verifyOtp: (phone: string, otp: string) =>
            genericVerifyOtp({ phone, token: otp, type: 'sms' }),
          password: passwordLogin,
        },
        verifyOtp: genericVerifyOtp,
        signOut,
        resetPassword,
        updatePassword,
        resendOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
