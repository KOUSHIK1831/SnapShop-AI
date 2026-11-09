import { useTranslation } from 'react-i18next';
import { useReducer, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Loader2,
  Store,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
} from 'lucide-react';

interface BuyerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone?: string) => void;
  storeName?: string;
}

const OTP_INPUT_ID = 'otp-input';

type ModalMode = 'login' | 'signup' | 'otp';

interface BuyerAuthState {
  mode: ModalMode;
  email: string;
  password: string;
  name: string;
  phone: string;
  otp: string;
  showPassword: boolean;
  submitting: boolean;
  error: string;
}

type BuyerAuthAction =
  | { type: 'SET_MODE'; payload: ModalMode; error?: string }
  | {
      type: 'SET_FIELD';
      payload: Partial<Omit<BuyerAuthState, 'mode' | 'submitting' | 'error'>>;
    }
  | { type: 'TOGGLE_PASSWORD' }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

const initialState: BuyerAuthState = {
  mode: 'login',
  email: '',
  password: '',
  name: '',
  phone: '',
  otp: '',
  showPassword: false,
  submitting: false,
  error: '',
};

function reducer(
  state: BuyerAuthState,
  action: BuyerAuthAction,
): BuyerAuthState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...initialState,
        mode: action.payload,
        email: state.email,
        name: state.name,
        phone: state.phone,
        password: state.password,
        error: action.error || '',
      };
    case 'SET_FIELD':
      return { ...state, ...action.payload };
    case 'TOGGLE_PASSWORD':
      return { ...state, showPassword: !state.showPassword };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export default function BuyerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  storeName,
}: BuyerAuthModalProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { signIn, signUp, verifyOtp, resendOtp } = useAuth();
  const { t } = useTranslation();

  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const MAX_RESENDS = 3;

  useEffect(() => {
    if (isOpen && !state.email) {
      // Check if user is already logged in but unverified
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && !session.user.email_confirmed_at) {
          dispatch({
            type: 'SET_FIELD',
            payload: { email: session.user.email || '', mode: 'otp' as any },
          });
        }
      });
    }
  }, [isOpen, state.email]);

  useEffect(() => {
    if (!isOpen || !state.email || state.mode !== 'otp') return;
    const resendData = sessionStorage.getItem(`otp_resend_${state.email}`);
    if (resendData) {
      const { count, nextAllowed } = JSON.parse(resendData);
      setResendCount(count);
      const remaining = Math.ceil((nextAllowed - Date.now()) / 1000);
      if (remaining > 0) setCooldown(remaining);
    }
  }, [isOpen, state.email, state.mode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const formatPhone = (v: string) => v.replace(/\D/g, '').slice(0, 10);

  const handleLogin = async () => {
    if (!state.email.trim() || !state.password) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Please enter your email and password',
      });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });
    const { error } = await signIn.password(state.email, state.password);

    if (error) {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } else {
      // Check if user is verified
      const {
        data: { session },
      } = await supabase.auth.getSession();
      dispatch({ type: 'SET_SUBMITTING', payload: false });

      if (session?.user && !session.user.email_confirmed_at) {
        // Not verified, send OTP and switch mode
        try {
          // Attempt to send OTP (this might fail if email-only auth is strictly password)
          // But Supabase signup usually sends it. If they are here, we might need to resend.
          await supabase.auth.resend({
            type: 'signup',
            email: state.email,
          });
        } catch (resendErr) {
          console.warn('Resend OTP failed:', resendErr);
        }
        dispatch({
          type: 'SET_MODE',
          payload: 'otp',
          error: 'Please verify your email to continue.',
        });
      } else {
        onSuccess(state.phone);
      }
    }
  };

  const handleSignup = async () => {
    if (
      !state.name.trim() ||
      !state.email.trim() ||
      !state.password ||
      state.password.length < 6
    ) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Please fill all fields (password min 6 chars)',
      });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });
    const { error } = await signUp(
      state.phone,
      state.name,
      state.email,
      state.password,
      true,
    );
    dispatch({ type: 'SET_SUBMITTING', payload: false });

    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return;
    }

    // Switch to OTP mode
    dispatch({ type: 'SET_MODE', payload: 'otp' });
  };

  const handleVerifyOtp = async () => {
    if (state.otp.length !== 6) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter 6-digit OTP' });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });

    const { error } = await verifyOtp({
      email: state.email,
      token: state.otp,
      type: 'signup',
    });

    dispatch({ type: 'SET_SUBMITTING', payload: false });
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } else {
      onSuccess(state.phone);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || state.submitting || resendCount >= MAX_RESENDS) return;

    const newCount = resendCount + 1;
    setResendCount(newCount);
    const nextCooldown = newCount === 1 ? 60 : newCount === 2 ? 180 : 300;
    const nextAllowed = Date.now() + nextCooldown * 1000;

    sessionStorage.setItem(
      `otp_resend_${state.email}`,
      JSON.stringify({
        count: newCount,
        nextAllowed,
      }),
    );

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    await resendOtp(state.email);
    dispatch({ type: 'SET_SUBMITTING', payload: false });
    setCooldown(nextCooldown);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Store className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {state.mode === 'otp'
                  ? t('auto.verify_otp')
                  : state.mode === 'signup'
                    ? t('auto.create_buyer_account')
                    : t('auth.signIn')}
              </h2>
              {storeName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('auto.at')}
                  {storeName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {state.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-medium text-destructive animate-in slide-in-from-top-1">
              {state.error}
            </div>
          )}

          {state.mode !== 'otp' ? (
            <div className="space-y-4">
              {state.mode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t('auto.full_name')}
                  </label>
                  <div className="relative">
                    <Input
                      placeholder={t('auto.enter_your_name')}
                      value={state.name}
                      onChange={e =>
                        dispatch({
                          type: 'SET_FIELD',
                          payload: { name: e.target.value },
                        })
                      }
                      className="pl-3"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t('auto.email_address_451')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t('auto.name_example_com')}
                    value={state.email}
                    onChange={e =>
                      dispatch({
                        type: 'SET_FIELD',
                        payload: { email: e.target.value },
                      })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_PASSWORD' })}
                    title="Toggle password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground transition-colors z-10"
                  >
                    {state.showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                  <Input
                    type={state.showPassword ? 'text' : 'password'}
                    placeholder={t('auto.min_6_characters')}
                    value={state.password}
                    onChange={e =>
                      dispatch({
                        type: 'SET_FIELD',
                        payload: { password: e.target.value },
                      })
                    }
                    className="pr-10"
                  />
                </div>
              </div>

              <Button
                className="w-full h-11 text-sm font-bold"
                onClick={state.mode === 'signup' ? handleSignup : handleLogin}
                disabled={state.submitting}
              >
                {state.submitting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : state.mode === 'signup' ? (
                  <UserPlus className="size-4 mr-2" />
                ) : (
                  <LogIn className="size-4 mr-2" />
                )}
                {state.mode === 'signup' ? t('auth.signUp') : t('auth.signIn')}
              </Button>

              <div className="text-center pt-2">
                <button
                  onClick={() =>
                    dispatch({
                      type: 'SET_MODE',
                      payload: state.mode === 'login' ? 'signup' : 'login',
                    })
                  }
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {state.mode === 'login'
                    ? t('auto.don_t_have_an_account_sign_up')
                    : t('auto.already_have_an_account_sign_i')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('auto.we_ve_sent_a_verification_emai')}{' '}
                  <span className="font-bold text-foreground">
                    {state.email}
                  </span>
                  .
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('auto.please_check_your_inbox_and_sp')}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={OTP_INPUT_ID}
                  className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center block"
                >
                  {t('auto.enter_6_digit_otp')}
                </label>
                <Input
                  id={OTP_INPUT_ID}
                  className="text-center text-2xl font-black tracking-[1em] h-14"
                  maxLength={6}
                  value={state.otp}
                  onChange={e =>
                    dispatch({
                      type: 'SET_FIELD',
                      payload: { otp: e.target.value.replace(/\D/g, '') },
                    })
                  }
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-primary h-11 text-sm font-bold"
                  onClick={handleVerifyOtp}
                  disabled={state.submitting}
                >
                  {state.submitting ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    t('auto.verify_continue')
                  )}
                </Button>

                <div className="text-center">
                  <button
                    onClick={handleResendOtp}
                    disabled={
                      cooldown > 0 ||
                      state.submitting ||
                      resendCount >= MAX_RESENDS
                    }
                    className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    {cooldown > 0
                      ? `Resend OTP in ${cooldown}s`
                      : resendCount >= MAX_RESENDS
                        ? t('auto.max_resends_reached')
                        : t('auto.resend_verification_email')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
