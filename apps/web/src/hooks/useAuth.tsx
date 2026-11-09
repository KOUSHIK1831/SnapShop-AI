import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from 'react';
import { apiClient, setAccessToken, ApiError } from '@/lib/apiClient';
import { identifyUser, resetUser } from '@/lib/analytics';
import { setSentryUser } from '@/lib/sentry';

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'seller' | 'buyer' | 'volunteer' | null;
  onboarded?: boolean;
  is_blocked?: boolean;
  isBlocked?: boolean;
  email_confirmed?: boolean;
  emailVerified?: boolean;
  seller?: {
    id: string;
    store_name: string | null;
    store_slug: string | null;
    verification_status: string;
    status: string;
    ai_daily_limit: number;
  } | null;
}

export interface AuthContextType {
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
  signInWithGoogle: (
    credential: string,
  ) => Promise<{ error: Error | null; user?: AuthUser }>;
  updateRole: (
    role: 'seller' | 'buyer',
  ) => Promise<{ error: Error | null; user?: AuthUser }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (
    newPassword: string,
    token?: string,
  ) => Promise<{ error: Error | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp?: (params: any) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

function normalizeUser(raw: any): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name ?? undefined,
    phone: raw.phone ?? undefined,
    role: raw.role ?? null,
    onboarded: raw.onboarded ?? false,
    is_blocked: raw.isBlocked ?? raw.is_blocked ?? false,
    isBlocked: raw.isBlocked ?? raw.is_blocked ?? false,
    email_confirmed: raw.emailVerified ?? raw.email_confirmed ?? false,
    emailVerified: raw.emailVerified ?? raw.email_confirmed ?? false,
    seller: raw.seller ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiClient.post('/auth/refresh');
      if (res?.accessToken && res?.user) {
        setAccessToken(res.accessToken);
        const user = normalizeUser(res.user);
        dispatch({ type: 'SET_AUTH', payload: { user, loading: false } });
        identifyUser(user.id, { email: user.email, role: user.role });
        setSentryUser({ id: user.id, email: user.email, role: user.role });
        return;
      }
    } catch {
      // Refresh token absent or expired
    }
    setAccessToken(null);
    dispatch({ type: 'SET_AUTH', payload: { user: null, loading: false } });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signUp = async (
    phone: string,
    name: string,
    email: string,
    password: string,
    _isIntern?: boolean,
  ): Promise<{ error: Error | null }> => {
    try {
      const res = await apiClient.post('/auth/register', {
        email,
        password,
        name: name || undefined,
      });

      if (res?.accessToken && res?.user) {
        setAccessToken(res.accessToken);
        let user = normalizeUser(res.user);

        if (phone) {
          try {
            const updated = await apiClient.patch('/auth/me', { phone });
            if (updated?.user) user = normalizeUser(updated.user);
          } catch {
            // Ignore optional phone save failure
          }
        }

        dispatch({ type: 'SET_AUTH', payload: { user, loading: false } });
        identifyUser(user.id, { email: user.email, role: user.role });
        setSentryUser({ id: user.id, email: user.email, role: user.role });
        return { error: null };
      }
      return { error: new Error('Registration failed') };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signInPassword = async (
    identifier: string,
    password: string,
  ): Promise<{ error: Error | null; user?: AuthUser }> => {
    try {
      const res = await apiClient.post('/auth/login', {
        email: identifier.trim().toLowerCase(),
        password,
      });

      if (res?.accessToken && res?.user) {
        setAccessToken(res.accessToken);
        const user = normalizeUser(res.user);
        dispatch({ type: 'SET_AUTH', payload: { user, loading: false } });
        identifyUser(user.id, { email: user.email, role: user.role });
        setSentryUser({ id: user.id, email: user.email, role: user.role });
        return { error: null, user };
      }
      return { error: new Error('Login failed') };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signInWithGoogle = async (
    credential: string,
  ): Promise<{ error: Error | null; user?: AuthUser }> => {
    try {
      const res = await apiClient.post('/auth/google', { credential });
      if (res?.accessToken && res?.user) {
        setAccessToken(res.accessToken);
        const user = normalizeUser(res.user);
        dispatch({ type: 'SET_AUTH', payload: { user, loading: false } });
        identifyUser(user.id, { email: user.email, role: user.role });
        setSentryUser({ id: user.id, email: user.email, role: user.role });
        return { error: null, user };
      }
      return { error: new Error('Google sign-in failed') };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updateRole = async (
    role: 'seller' | 'buyer',
  ): Promise<{ error: Error | null; user?: AuthUser }> => {
    try {
      const res = await apiClient.patch('/auth/role', { role });
      if (res?.user) {
        const user = normalizeUser(res.user);
        dispatch({ type: 'SET_AUTH', payload: { user, loading: false } });
        identifyUser(user.id, { email: user.email, role: user.role });
        return { error: null, user };
      }
      return { error: new Error('Role update failed') };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignored
    } finally {
      setAccessToken(null);
      resetUser();
      dispatch({ type: 'SET_AUTH', payload: { user: null, loading: false } });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await apiClient.post('/auth/forgot-password', { email });
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updatePassword = async (newPassword: string, token?: string) => {
    try {
      if (token) {
        await apiClient.post('/auth/reset-password', {
          token,
          password: newPassword,
        });
      } else {
        await apiClient.post('/auth/change-password', { newPassword });
      }
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const resendOtp = async (email: string) => {
    try {
      await apiClient.post('/auth/resend-verification');
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const verifyOtp = async (params: any) => {
    try {
      const token = typeof params === 'string' ? params : params?.token;
      await apiClient.post('/auth/verify-email', { token });
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signIn = {
    password: signInPassword,
    sendOtp: async (_phone: string) => {
      throw new Error(
        'Phone OTP login is deprecated. Please sign in with email/password or Google.',
      );
    },
    verifyOtp: async (_phone: string, _otp: string) => {
      return {
        error: new Error(
          'Phone OTP login is deprecated. Please sign in with email/password or Google.',
        ),
      };
    },
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        loading: state.loading,
        signUp,
        signIn,
        signInWithGoogle,
        updateRole,
        signOut,
        resetPassword,
        updatePassword,
        resendOtp,
        verifyOtp,
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
