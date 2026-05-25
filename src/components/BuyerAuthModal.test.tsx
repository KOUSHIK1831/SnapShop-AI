import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import BuyerAuthModal from './BuyerAuthModal';
import en from '../locales/en/translation.json';

const { signInPasswordMock, signUpMock, verifyOtpMock, signInSendOtpMock, resendOtpMock } = vi.hoisted(() => ({
  signInPasswordMock: vi.fn(() => ({ error: null })),
  signUpMock: vi.fn(() => ({ error: null })),
  verifyOtpMock: vi.fn(() => ({ error: null })),
  signInSendOtpMock: vi.fn(() => ({ error: null })),
  resendOtpMock: vi.fn(() => ({ error: null })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: {
      password: signInPasswordMock,
      sendOtp: signInSendOtpMock,
    },
    signUp: signUpMock,
    verifyOtp: verifyOtpMock,
    resendOtp: resendOtpMock,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (en as any)[key] || key,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    }
  }
}));

describe('BuyerAuthModal coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggles modes correctly', async () => {
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    
    // There might be multiple elements with the key if used in different places
    expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThanOrEqual(1);
    
    // Switch to signup
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    
    await waitFor(() => {
      expect(screen.getAllByText(/Create Account/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('signs in successfully', async () => {
    const onSuccess = vi.fn();
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), { target: { value: 'password123' } });
    
    // Find the button specifically by role or text
    const buttons = screen.getAllByRole('button');
    const signInBtn = buttons.find(b => b.textContent?.includes('Sign In'));
    if (signInBtn) fireEvent.click(signInBtn);

    await waitFor(() => {
      expect(signInPasswordMock).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});