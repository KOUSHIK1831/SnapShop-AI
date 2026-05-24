import { useReducer } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Store, Mail, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface BuyerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone?: string) => void;
  storeName?: string;
}

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
  | { type: 'SET_MODE'; payload: ModalMode }
  | { type: 'SET_FIELD'; payload: Partial<Omit<BuyerAuthState, 'mode' | 'submitting' | 'error'>> }
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

function reducer(state: BuyerAuthState, action: BuyerAuthAction): BuyerAuthState {
  switch (action.type) {
    case 'SET_MODE': return { ...initialState, mode: action.payload, email: state.email, name: state.name, phone: state.phone, password: state.password };
    case 'SET_FIELD': return { ...state, ...action.payload };
    case 'TOGGLE_PASSWORD': return { ...state, showPassword: !state.showPassword };
    case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'RESET': return initialState;
    default: return state;
  }
}

export default function BuyerAuthModal({ isOpen, onClose, onSuccess, storeName }: BuyerAuthModalProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { signIn, signUp, verifyOtp } = useAuth();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const formatPhone = (v: string) => v.replace(/\D/g, '').slice(0, 10);

  const handleLogin = async () => {
    if (!state.email.trim() || !state.password) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter your email and password' });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });
    const { error } = await signIn.password(state.email, state.password);
    dispatch({ type: 'SET_SUBMITTING', payload: false });
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } else {
      onSuccess(state.phone);
    }
  };

  const handleSignup = async () => {
    if (!state.name.trim() || !state.email.trim() || !state.password || state.password.length < 6) {
      dispatch({ type: 'SET_ERROR', payload: 'Please fill all fields (password min 6 chars)' });
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });
    const { error } = await signUp(state.phone, state.name, state.email, state.password, true);
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
      type: 'signup' 
    });
    
    dispatch({ type: 'SET_SUBMITTING', payload: false });
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } else {
      onSuccess(state.phone);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default w-full h-full border-none p-0"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-sm mx-4 bg-card rounded-2xl shadow-2xl border border-border/50 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-brand px-6 py-5 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Store className="size-5" />
            <span className="text-sm font-medium opacity-80">{storeName || t('common.appName')}</span>
          </div>
          <h2 className="text-lg font-semibold">{t('buyerAuth.title')}</h2>
          <p className="text-sm opacity-80 mt-1">{t('buyerAuth.desc')}</p>
        </div>

        {/* Mode toggle */}
        {state.mode !== 'otp' && (
          <div className="flex border-b border-border/50">
            <button
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'login' })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                state.mode === 'login'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="size-3.5" /> Sign In
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'signup' })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                state.mode === 'signup'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="size-3.5" /> Create Account
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">
          {state.error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {state.error}
            </div>
          )}

          {state.mode === 'signup' && (
            <>
              <Input
                placeholder="Full Name"
                value={state.name}
                onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { name: e.target.value } })}
                autoComplete="name"
              />
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">+91</div>
                <Input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={state.phone}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { phone: formatPhone(e.target.value) } })}
                  className="pl-10"
                  autoComplete="tel"
                />
              </div>
            </>
          )}

          {state.mode !== 'otp' ? (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={state.email}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { email: e.target.value } })}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>

              <div className="relative">
                <Input
                  type={state.showPassword ? 'text' : 'password'}
                  placeholder={state.mode === 'signup' ? 'Create password (min 6 chars)' : 'Password'}
                  value={state.password}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { password: e.target.value } })}
                  className="pr-10"
                  autoComplete={state.mode === 'signup' ? 'new-password' : 'current-password'}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') {
                      if (state.mode === 'login') handleLogin();
                      else handleSignup();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_PASSWORD' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {state.showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Verify your email</p>
                <p className="text-xs text-muted-foreground">Enter 6-digit code sent to {state.email}</p>
              </div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="0 0 0 0 0 0"
                value={state.otp}
                onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { otp: e.target.value.replace(/\D/g, '').slice(0, 6) } })}
                className="text-center text-2xl tracking-widest font-bold h-12"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOtp(); }}
              />
              <button 
                onClick={() => dispatch({ type: 'SET_MODE', payload: 'signup' })}
                className="text-xs text-primary hover:underline block mx-auto"
              >
                Back to signup
              </button>
            </div>
          )}

          <Button
            onClick={state.mode === 'login' ? handleLogin : state.mode === 'signup' ? handleSignup : handleVerifyOtp}
            disabled={state.submitting}
            className="w-full bg-gradient-brand hover:opacity-90 transition-opacity"
          >
            {state.submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {state.mode === 'login' ? 'Sign In & Place Order' : state.mode === 'signup' ? 'Create Account' : 'Verify & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
