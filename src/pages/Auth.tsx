import React, { useEffect, useReducer, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Store, ShoppingBag, Shield, Loader2, Eye, EyeOff, Mail, LogIn, UserPlus, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { NetworkStrengthIndicator } from '@/components/NetworkStrengthIndicator';

type Mode = 'login' | 'signup' | 'forgot' | 'otp-signup' | 'otp-recovery';
interface AuthState {
  mode: Mode;
  showPassword: {
    login: boolean;
    signup: boolean;
  };
  submitting: boolean;
  forgotEmail: string;
  otpValue: string;
  form: {
    phone: string;
    loginEmail: string;
    loginPassword: string;
    signupName: string;
    signupEmail: string;
    signupPassword: string;
    signupRole: 'seller' | 'buyer';
  };
}

type AuthAction = 
  | { type: 'SET_MODE'; payload: Mode }
  | { type: 'TOGGLE_PASSWORD'; payload: 'login' | 'signup' }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_FORGOT_EMAIL'; payload: string }
  | { type: 'SET_OTP_VALUE'; payload: string }
  | { type: 'UPDATE_FORM'; payload: Partial<AuthState['form']> }
  | { type: 'RESET_FORM' };

const initialState: AuthState = {
  mode: 'login',
  showPassword: { login: false, signup: false },
  submitting: false,
  forgotEmail: '',
  otpValue: '',
  form: {
    phone: '',
    loginEmail: '',
    loginPassword: '',
    signupName: '',
    signupEmail: '',
    signupPassword: '',
    signupRole: 'seller',
  }
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_MODE': return { ...state, mode: action.payload };
    case 'TOGGLE_PASSWORD': return { 
      ...state, 
      showPassword: { ...state.showPassword, [action.payload]: !state.showPassword[action.payload] } 
    };
    case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
    case 'SET_FORGOT_EMAIL': return { ...state, forgotEmail: action.payload };
    case 'SET_OTP_VALUE': return { ...state, otpValue: action.payload };
    case 'UPDATE_FORM': return { ...state, form: { ...state.form, ...action.payload } };
    case 'RESET_FORM': return { ...initialState, mode: state.mode };
    default: return state;
  }
}

export default function Auth() {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { signIn, signUp, user, loading, resetPassword, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  const { mode, showPassword, submitting, forgotEmail, otpValue, form } = state;

  const returnTo = searchParams.get('returnTo');
  const initialRole = searchParams.get('role') as 'seller' | 'buyer' | null;

  useEffect(() => {
    if (initialRole && (initialRole === 'seller' || initialRole === 'buyer')) {
      dispatch({ type: 'UPDATE_FORM', payload: { signupRole: initialRole } });
    }
    // Restore pending OTP email if user refreshed during verification
    const pendingEmail = sessionStorage.getItem('apnabazar_pending_otp_email');
    const pendingRecoveryEmail = sessionStorage.getItem('apnabazar_pending_recovery_email');
    
    if (pendingEmail) {
      dispatch({ type: 'UPDATE_FORM', payload: { signupEmail: pendingEmail } });
      dispatch({ type: 'SET_MODE', payload: 'otp-signup' });
    } else if (pendingRecoveryEmail) {
      dispatch({ type: 'SET_FORGOT_EMAIL', payload: pendingRecoveryEmail });
      dispatch({ type: 'SET_MODE', payload: 'otp-recovery' });
    }
  }, [initialRole]);

  useEffect(() => {
    // Check for blocked user alert
    const wasBlocked = sessionStorage.getItem('apnabazar_blocked_alert');
    if (wasBlocked === 'true') {
      sessionStorage.removeItem('apnabazar_blocked_alert');
      toast({ 
        title: 'Account Blocked', 
        description: 'You have been blocked by the admin. Please contact the admin for any queries at koushikreddybanuri@gmail.com', 
        variant: 'destructive',
        duration: 10000
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!loading && user) {
      if (!user.email_confirmed) {
        // Stay on Auth page, maybe switch to OTP mode if not already
        if (mode !== 'otp-signup' && mode !== 'otp-recovery') {
          dispatch({ type: 'SET_MODE', payload: 'otp-signup' });
          dispatch({ type: 'UPDATE_FORM', payload: { signupEmail: user.email || '' } });
        }
        return;
      }

      if (returnTo) {
        navigate(returnTo);
      } else {
        if (user.role === 'seller') navigate('/dashboard');
        else if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'buyer') navigate('/buyer');
      }
    }
  }, [user, loading, navigate, returnTo, mode]);

  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.loginEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.loginEmail) || !form.loginPassword) {
      toast({ title: 'Error', description: 'Please enter a valid email and password', variant: 'destructive' });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    const { error } = await signIn.password(form.loginEmail, form.loginPassword);
    dispatch({ type: 'SET_SUBMITTING', payload: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Check if user was immediately signed out (blocked) or needs verification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; 

      if (!session.user.email_confirmed_at) {
        toast({ title: 'Verification Required', description: 'Please verify your email to continue.' });
        dispatch({ type: 'SET_MODE', payload: 'otp-signup' });
        dispatch({ type: 'UPDATE_FORM', payload: { signupEmail: session.user.email || form.loginEmail } });
        return;
      }

      toast({ title: 'Success', description: 'Logged in successfully' });
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const role = profile?.role || session.user.user_metadata?.role || 'seller';
      
      if (returnTo) {
        navigate(returnTo);
      } else if (role === 'buyer') navigate('/buyer');
      else if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  };

  const handleCreateAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidPhone(form.phone)) {
      toast({ title: 'Error', description: 'Please enter a valid 10-digit phone number', variant: 'destructive' });
      return;
    }
    if (!form.signupName.trim() || !form.signupEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.signupEmail) || !form.signupPassword || form.signupPassword.length < 6) {
      toast({ title: 'Error', description: 'Please check your information', variant: 'destructive' });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      const { error } = await signUp(form.phone, form.signupName, form.signupEmail, form.signupPassword, form.signupRole === 'buyer');
      if (error) throw error;
      
      // Check if session exists (email confirmation might be disabled in Supabase, though we want it on)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user.email_confirmed_at) {
        toast({ title: 'Success', description: 'Account created successfully!' });
        const role = form.signupRole;
        if (returnTo) navigate(returnTo);
        else if (role === 'buyer') navigate('/buyer');
        else navigate('/dashboard');
      } else {
        // Stay for OTP
        sessionStorage.setItem('apnabazar_pending_otp_email', form.signupEmail);
        toast({ title: 'Verification Required', description: 'Please check your email for the 6-digit verification code.' });
        dispatch({ type: 'SET_MODE', payload: 'otp-signup' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create account', variant: 'destructive' });
    }
    dispatch({ type: 'SET_SUBMITTING', payload: false });
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast({ title: 'Error', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    const { error } = await resetPassword(forgotEmail);
    dispatch({ type: 'SET_SUBMITTING', payload: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      sessionStorage.setItem('apnabazar_pending_recovery_email', forgotEmail);
      toast({ title: 'OTP Sent', description: 'Please check your email for the 6-digit reset code.' });
      dispatch({ type: 'SET_MODE', payload: 'otp-recovery' });
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpValue.length !== 6) {
      toast({ title: 'Error', description: 'Please enter a 6-digit OTP code', variant: 'destructive' });
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    const email = mode === 'otp-signup' ? form.signupEmail : forgotEmail;
    const type = mode === 'otp-signup' ? 'signup' : 'recovery';
    
    const { error } = await verifyOtp({ email, token: otpValue, type });
    dispatch({ type: 'SET_SUBMITTING', payload: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      sessionStorage.removeItem('apnabazar_pending_otp_email');
      sessionStorage.removeItem('apnabazar_pending_recovery_email');
      toast({ title: 'Success', description: 'Verification successful!' });
      if (type === 'signup') {
        const role = form.signupRole;
        if (returnTo) navigate(returnTo);
        else if (role === 'buyer') navigate('/buyer');
        else navigate('/dashboard');
      } else {
        // Established session via recovery OTP, now go to reset page to set new password
        navigate('/reset-password');
      }
    }
  };

  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 10);
  const isValidPhone = (phone: string) => phone.length === 10 && parseInt(phone[0]) > 5;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <NetworkStrengthIndicator />
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm relative z-10">
        <AuthHeader t={t} />
        <Card>
          <AuthModeToggle mode={mode} dispatch={dispatch} t={t} />
          <CardContent>
            {mode === 'login' ? (
              <LoginForm key="login"
                state={state}
                dispatch={dispatch}
                handlers={{ handlePasswordLogin, formatPhone }}
                t={t}
              />
            ) : mode === 'signup' ? (
              <SignupForm key="signup"
                state={state}
                dispatch={dispatch}
                handlers={{ handleCreateAccount, formatPhone }}
                t={t}
              />
            ) : mode === 'forgot' ? (
              <ForgotForm
                email={forgotEmail}
                submitting={submitting}
                onEmailChange={(v) => dispatch({ type: 'SET_FORGOT_EMAIL', payload: v })}
                onSubmit={handleForgotPassword}
                onBack={() => { dispatch({ type: 'SET_MODE', payload: 'login' }); }}
              />
            ) : (
              <OtpForm 
                value={otpValue}
                email={mode === 'otp-signup' ? form.signupEmail : forgotEmail}
                submitting={submitting}
                onChange={(v) => dispatch({ type: 'SET_OTP_VALUE', payload: v })}
                onSubmit={handleVerifyOtp}
                onResend={mode === 'otp-signup' ? handleCreateAccount : handleForgotPassword}
                onBack={mode === 'otp-signup' ? (() => dispatch({ type: 'SET_MODE', payload: 'signup' })) : undefined}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuthHeader({ t }: { t: any }) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto size-12 bg-gradient-brand rounded-xl flex items-center justify-center mb-4">
        <Store className="size-6 text-white" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('common.appName')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('auth.joinUs')}</p>
    </div>
  );
}

function AuthModeToggle({ mode, dispatch, t }: { mode: Mode, dispatch: React.Dispatch<AuthAction>, t: any }) {
  if (mode === 'forgot') return null;
  return (
    <CardHeader className="pb-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => { dispatch({ type: 'SET_MODE', payload: 'login' }); dispatch({ type: 'RESET_FORM' }); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
            mode === 'login' ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogIn className="size-4" /> {t('auth.signIn')}
        </button>
        <button
          onClick={() => { dispatch({ type: 'SET_MODE', payload: 'signup' }); dispatch({ type: 'RESET_FORM' }); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
            mode === 'signup' ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="size-4" /> {t('auth.signUp')}
        </button>
      </div>
      <CardTitle className="text-lg">{mode === 'login' ? t('auth.signIn') : t('auth.signUp')}</CardTitle>
      <CardDescription>{mode === 'login' ? t('auth.welcomeBack') : t('auth.joinUs')}</CardDescription>
    </CardHeader>
  );
}

function LoginForm({ state, dispatch, handlers, t }: { state: AuthState, dispatch: React.Dispatch<AuthAction>, handlers: any, t: any }) {
  const { showPassword, submitting, form } = state;

  return (
    <form onSubmit={(e) => { e.preventDefault(); handlers.handlePasswordLogin(); }} className="space-y-4">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={form.loginEmail}
          onChange={(e) => dispatch({ type: 'UPDATE_FORM', payload: { loginEmail: e.target.value } })}
          className="pl-10"
        />
      </div>
      <div className="relative">
        <Input
          type={showPassword.login ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.loginPassword}
          onChange={(e) => dispatch({ type: 'UPDATE_FORM', payload: { loginPassword: e.target.value } })}
          className="pr-10"
        />
        <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PASSWORD', payload: 'login' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {showPassword.login ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <Button type="submit" disabled={submitting || !form.loginEmail.trim() || !form.loginPassword} className="w-full">
        {submitting && <Loader2 className="size-4 mr-2 animate-spin" />} {t('auth.signIn')}
      </Button>

      <div className="flex items-center justify-between mt-1">
        <p className="text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <button type="button" onClick={() => { dispatch({ type: 'SET_MODE', payload: 'signup' }); dispatch({ type: 'RESET_FORM' }); }} className="text-primary hover:underline font-medium">{t('auth.signUp')}</button>
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_MODE', payload: 'forgot' })}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}


function SignupForm({ state, dispatch, handlers, t }: { state: AuthState, dispatch: React.Dispatch<AuthAction>, handlers: any, t: any }) {
  const { showPassword, submitting, form } = state;

  return (
    <form onSubmit={handlers.handleCreateAccount} className="space-y-4">
      <div className="space-y-3 mb-6 p-1 bg-muted/30 rounded-2xl border border-border/50">
        <div className="grid grid-cols-2 gap-1">
          <SignupRoleButton role="seller" currentRole={form.signupRole} dispatch={dispatch} />
          <SignupRoleButton role="buyer" currentRole={form.signupRole} dispatch={dispatch} />
        </div>
        <div className="px-3 pb-2 text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
            <Shield className="size-3 text-primary/70" /> Role is permanent and cannot be changed later
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">+91</div>
        <Input
          type="tel"
          autoComplete="tel"
          placeholder="Enter 10-digit phone"
          value={form.phone}
          onChange={(e) => dispatch({ type: 'UPDATE_FORM', payload: { phone: handlers.formatPhone(e.target.value) } })}
          className="pl-10"
        />
      </div>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          autoComplete="name"
          placeholder="Full Name"
          value={form.signupName}
          onChange={(e) => dispatch({ type: 'UPDATE_FORM', payload: { signupName: e.target.value } })}
          className="pl-10"
        />
      </div>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="email"
          autoComplete="email"
          placeholder="Email Address"
          value={form.signupEmail}
          onChange={(e) => dispatch({ type: 'UPDATE_FORM', payload: { signupEmail: e.target.value } })}
          className="pl-10"
        />
      </div>
      <div className="relative">
        <Input
          type={showPassword.signup ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Create Password (min 6 chars)"
          value={form.signupPassword}
          onChange={(e) => dispatch({ type: 'UPDATE_FORM', payload: { signupPassword: e.target.value } })}
          className="pr-10"
        />
        <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PASSWORD', payload: 'signup' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {showPassword.signup ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="size-4 mr-2 animate-spin" />} {t('auth.signUp')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.hasAccount')}{' '}
        <button type="button" onClick={() => { dispatch({ type: 'SET_MODE', payload: 'login' }); dispatch({ type: 'RESET_FORM' }); }} className="text-primary hover:underline font-medium">{t('auth.signIn')}</button>
      </p>
    </form>
  );
}

function ForgotForm({ email, submitting, onEmailChange, onSubmit, onBack }: {
  email: string; submitting: boolean;
  onEmailChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="size-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
          <KeyRound className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Reset your password</p>
          <p className="text-xs text-muted-foreground">We'll send a 6-digit reset code to your email</p>
        </div>
      </div>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>
      <Button type="submit" disabled={submitting || !email.trim()} className="w-full">
        {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
        Send Reset Code
      </Button>
      <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto transition-colors">
        <ArrowLeft className="size-3.5" /> Back to Sign In
      </button>
    </form>
  );
}

function SignupRoleButton({ role, currentRole, dispatch }: { role: 'seller' | 'buyer', currentRole: string, dispatch: React.Dispatch<AuthAction> }) {
  const isSelected = currentRole === role;
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'UPDATE_FORM', payload: { signupRole: role } })}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 ${ isSelected ? 'bg-card text-primary shadow-md scale-100 ring-2 ring-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground scale-[0.98]' }`}
    >
      <div className={`size-10 rounded-full flex items-center justify-center mb-1 ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
        {role === 'seller' ? <Store className="size-5" /> : <ShoppingBag className="size-5" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-bold leading-none mb-1">{role.charAt(0).toUpperCase() + role.slice(1)}</p>
        <p className="text-[10px] opacity-70 leading-tight">{role === 'seller' ? 'Create your digital store' : 'Browse & buy products'}</p>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 size-4 bg-primary text-white rounded-full flex items-center justify-center">
          <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

function OtpForm({ value, email, submitting, onChange, onSubmit, onResend, onBack }: {
  value: string; email: string; submitting: boolean;
  onChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onResend: (e?: React.FormEvent) => void;
  onBack: () => void;
}) {
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const MAX_RESENDS = 3;

  useEffect(() => {
    // Load persisted rate limit data
    const resendData = sessionStorage.getItem(`otp_resend_${email}`);
    if (resendData) {
      const { count, nextAllowed } = JSON.parse(resendData);
      setResendCount(count);
      const remaining = Math.ceil((nextAllowed - Date.now()) / 1000);
      if (remaining > 0) setCooldown(remaining);
    }
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 || submitting || resendCount >= MAX_RESENDS) return;

    const newCount = resendCount + 1;
    setResendCount(newCount);
    
    // Increase cooldown based on count: 60s, 180s, 300s
    const nextCooldown = newCount === 1 ? 60 : newCount === 2 ? 180 : 300;
    const nextAllowed = Date.now() + nextCooldown * 1000;
    
    sessionStorage.setItem(`otp_resend_${email}`, JSON.stringify({ 
      count: newCount, 
      nextAllowed 
    }));
    
    setCooldown(nextCooldown);
    onResend(e);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <KeyRound className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Verify your email</p>
          <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to {email}</p>
        </div>
      </div>
      
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="0 0 0 0 0 0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="text-center text-2xl tracking-[0.5em] font-bold h-14"
          autoFocus
        />
      </div>

      <Button type="submit" disabled={submitting || value.length !== 6} className="w-full h-11 bg-gradient-brand hover:opacity-90 transition-opacity">
        {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
        Verify & Continue
      </Button>

      <div className="flex flex-col items-center gap-2">
        {resendCount >= MAX_RESENDS ? (
          <p className="text-xs text-destructive font-medium text-center">
            Maximum resend attempts reached. <br/> Please contact support if you still haven't received the code.
          </p>
        ) : (
          <button 
            type="button" 
            onClick={handleResend} 
            disabled={cooldown > 0 || submitting}
            className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline font-medium"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>
        )}
        {onBack && (
          <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="size-3.5" /> Back
          </button>
        )}
      </div>

      <div className="text-center">
        <p className="text-[10px] text-muted-foreground italic">
          {resendCount >= MAX_RESENDS 
            ? "For security, we've limited the number of OTP requests."
            : "If you don't see the email, please check your spam folder."}
        </p>
      </div>
    </form>
  );
}

