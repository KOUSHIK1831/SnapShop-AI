import { useTranslation } from 'react-i18next';
import React, { useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Store,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type PageState = 'loading' | 'form' | 'success' | 'invalid';

interface State {
  page: PageState;
  password: string;
  confirm: string;
  showPassword: boolean;
  showConfirm: boolean;
  submitting: boolean;
  error: string;
}

type Action =
  | { type: 'SET_PAGE'; payload: PageState }
  | {
      type: 'SET_FIELD';
      payload: Partial<Pick<State, 'password' | 'confirm' | 'error'>>;
    }
  | { type: 'TOGGLE'; payload: 'showPassword' | 'showConfirm' }
  | { type: 'SET_SUBMITTING'; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_FIELD':
      return { ...state, ...action.payload };
    case 'TOGGLE':
      return { ...state, [action.payload]: !state[action.payload] };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload };
    default:
      return state;
  }
}

export default function ResetPassword() {
  const [state, dispatch] = useReducer(reducer, {
    page: 'loading',
    password: '',
    confirm: '',
    showPassword: false,
    showConfirm: false,
    submitting: false,
    error: '',
  });

  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Parse tokens from URL hash (Supabase puts them there for recovery links)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');
    const errorCode = params.get('error_code');

    if (errorCode) {
      dispatch({ type: 'SET_PAGE', payload: 'invalid' });
      return;
    }

    // If recovery tokens are in the hash, exchange them for a session
    if (accessToken && refreshToken && type === 'recovery') {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            dispatch({ type: 'SET_PAGE', payload: 'invalid' });
          } else {
            // Clear the hash from the URL
            window.history.replaceState(null, '', window.location.pathname);
            dispatch({ type: 'SET_PAGE', payload: 'form' });
          }
        });
      return;
    }

    // Listen for PASSWORD_RECOVERY event (OTP-based recovery flow)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        dispatch({ type: 'SET_PAGE', payload: 'form' });
      }
    });

    // Check if session already exists (came from OTP verify flow)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch({ type: 'SET_PAGE', payload: 'form' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fallback: mark invalid after 4s if still loading
  useEffect(() => {
    if (state.page !== 'loading') return;
    const t = setTimeout(
      () => dispatch({ type: 'SET_PAGE', payload: 'invalid' }),
      4000,
    );
    return () => clearTimeout(t);
  }, [state.page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.password.length < 6) {
      dispatch({
        type: 'SET_FIELD',
        payload: { error: 'Password must be at least 6 characters' },
      });
      return;
    }
    if (state.password !== state.confirm) {
      dispatch({
        type: 'SET_FIELD',
        payload: { error: 'Passwords do not match' },
      });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    const { error } = await updatePassword(state.password);
    dispatch({ type: 'SET_SUBMITTING', payload: false });
    if (error) {
      dispatch({ type: 'SET_FIELD', payload: { error: error.message } });
    } else {
      dispatch({ type: 'SET_PAGE', payload: 'success' });
      toast({
        title: 'Password updated!',
        description: 'You can now sign in with your new password.',
      });
      setTimeout(() => navigate('/auth'), 2500);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto size-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Store className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('common.appName')}
          </h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {state.page === 'success'
                ? t('auto.password_updated')
                : t('auto.set_new_password')}
            </CardTitle>
            <CardDescription>
              {state.page === 'success'
                ? t('auto.redirecting_you_to_sign_in')
                : t('auto.choose_a_strong_password_for_y')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Loading */}
            {state.page === 'loading' && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 className="size-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {t('auto.verifying_reset_link')}
                </p>
              </div>
            )}

            {/* Invalid link */}
            {state.page === 'invalid' && (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto size-14 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="size-7 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t('auto.link_expired_or_invalid')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('auto.password_reset_links_expire_af')}
                  </p>
                </div>
                <Button onClick={() => navigate('/auth')} className="w-full">
                  {t('auto.back_to_sign_in')}
                </Button>
              </div>
            )}

            {/* Success */}
            {state.page === 'success' && (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto size-14 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="size-7 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('auto.redirecting_to_sign_in')}
                </p>
              </div>
            )}

            {/* Form */}
            {state.page === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <KeyRound className="size-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('auto.enter_your_new_password_below')}
                  </p>
                </div>

                {state.error && (
                  <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                    {state.error}
                  </div>
                )}

                <div className="relative">
                  <Input
                    type={
                      state.showPassword ? t('auto.text') : t('auto.password')
                    }
                    placeholder={t('auto.new_password_min_6_chars')}
                    value={state.password}
                    onChange={e =>
                      dispatch({
                        type: 'SET_FIELD',
                        payload: { password: e.target.value, error: '' },
                      })
                    }
                    className="pr-10"
                    autoComplete={t('auto.new_password')}
                    autoFocus
                  />

                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'TOGGLE', payload: 'showPassword' })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {state.showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={
                      state.showConfirm ? t('auto.text') : t('auto.password')
                    }
                    placeholder={t('auto.confirm_new_password')}
                    value={state.confirm}
                    onChange={e =>
                      dispatch({
                        type: 'SET_FIELD',
                        payload: { confirm: e.target.value, error: '' },
                      })
                    }
                    className="pr-10"
                    autoComplete={t('auto.new_password')}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'TOGGLE', payload: 'showConfirm' })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {state.showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {/* Password strength hint */}
                {state.password.length > 0 && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          state.password.length >= i * 3
                            ? state.password.length >= 10
                              ? t('auto.bg_green_500')
                              : state.password.length >= 7
                                ? t('auto.bg_amber_500')
                                : t('auto.bg_red_400')
                            : t('auto.bg_muted')
                        }`}
                      />
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    state.submitting || !state.password || !state.confirm
                  }
                  className="w-full"
                >
                  {state.submitting && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  {t('auto.update_password')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
