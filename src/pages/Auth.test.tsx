import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Auth from './Auth';
import en from '../locales/en/translation.json';

const {
  signInMock,
  signUpMock,
  toastMock,
  navigateMock,
  supabaseMock,
  resetPasswordMock,
  verifyOtpMock,
  resendOtpMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  resendOtpMock: vi.fn(),
  supabaseMock: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { role: 'seller' }, error: null }),
    })),
  },
}));

let mockUser: any = null;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signIn: { password: signInMock, sendOtp: vi.fn(), verifyOtp: vi.fn() },
    signUp: signUpMock,
    resetPassword: resetPasswordMock,
    verifyOtp: verifyOtpMock,
    resendOtp: resendOtpMock,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      return (en as any)[key] || key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockUser = null;
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.useRealTimers();
  });

  const fillLoginForm = (email = 'test@example.com', pass = 'password123') => {
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
      target: { value: email },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: pass },
    });
  };

  it('signs in and navigates to seller dashboard', async () => {
    signInMock.mockResolvedValue({ error: null });
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 's1',
            email: 'seller@test.com',
            email_confirmed_at: new Date().toISOString(),
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );
    fillLoginForm('seller@test.com');

    const signBtns = screen.getAllByText(/Sign In/i);
    fireEvent.submit(signBtns[signBtns.length - 1].closest('form')!);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('navigates to admin portal for admin user', async () => {
    mockUser = { id: 'admin', role: 'admin', email_confirmed: true };
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('navigates to buyer dashboard for buyer user', async () => {
    mockUser = { id: 'buyer', role: 'buyer', email_confirmed: true };
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/buyer');
    });
  });

  it('handles sign-up for buyer correctly', async () => {
    signUpMock.mockResolvedValue({ error: null });
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );
    const signUpToggle = screen.getAllByText(/Create Account/i)[0];
    fireEvent.click(signUpToggle);

    // Switch to buyer role
    fireEvent.click(screen.getByText('Buyer'));

    fireEvent.change(screen.getByPlaceholderText(/10-digit phone/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), {
      target: { value: 'Buyer User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Email Address/i), {
      target: { value: 'buyer@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    });

    const signUpBtns = screen.getAllByText(/Create Account/i);
    fireEvent.submit(signUpBtns[signUpBtns.length - 1].closest('form')!);

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith(
        '9876543210',
        'Buyer User',
        'buyer@test.com',
        'password123',
        true,
      );
    });
  });

  it('handles recovery OTP and navigates to reset-password', async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/Forgot password/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
      target: { value: 'recover@test.com' },
    });
    resetPasswordMock.mockResolvedValue({ error: null });
    fireEvent.submit(screen.getByText(/Send Reset Code/i).closest('form')!);

    await waitFor(() =>
      expect(screen.getByText(/Verify Your Email/i)).toBeInTheDocument(),
    );

    const otpInput = screen.getByPlaceholderText('0 0 0 0 0 0');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.submit(screen.getByText(/Verify & Continue/i).closest('form')!);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/reset-password');
    });
  });

  it('detects unverified session on mount and forces OTP', async () => {
    mockUser = {
      id: 'unverified',
      email: 'unverified@test.com',
      email_confirmed: false,
    };
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Verify Your Email/i)).toBeInTheDocument();
    });
  });

  /* it('handles resend OTP limit', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem('apnabazar_pending_otp_email', 'limit@test.com');

    render(<MemoryRouter><Auth /></MemoryRouter>);

    const resendBtn = await screen.findByText('Resend OTP');

    await act(async () => { fireEvent.click(resendBtn); });
    expect(resendOtpMock).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(61000); });
    const btns2 = await screen.findAllByText('Resend OTP');
    await act(async () => { fireEvent.click(btns2[0]); });

    await act(async () => { vi.advanceTimersByTime(61000); });
    const btns3 = await screen.findAllByText('Resend OTP');
    await act(async () => { fireEvent.click(btns3[0]); });

    await act(async () => { vi.advanceTimersByTime(61000); });
    expect(screen.getByText(/Maximum resend attempts reached/i)).toBeInTheDocument();

    vi.useRealTimers();
  }, 20000); */
  it('shows error for signup failure', async () => {
    signUpMock.mockRejectedValue(new Error('Signup failed'));
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );
    const signUpToggle = screen.getAllByText(/Create Account/i)[0];
    fireEvent.click(signUpToggle);

    fireEvent.change(screen.getByPlaceholderText(/10-digit phone/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), {
      target: { value: 'User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Email Address/i), {
      target: { value: 'fail@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    });

    const signUpBtns = screen.getAllByText(/Create Account/i);
    fireEvent.submit(signUpBtns[signUpBtns.length - 1].closest('form')!);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Signup failed',
        }),
      );
    });
  });

  it('recovers pending recovery email from sessionStorage', async () => {
    sessionStorage.setItem(
      'apnabazar_pending_recovery_email',
      'recover@test.com',
    );
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Verify Your Email/i)).toBeInTheDocument();
      expect(screen.getByText(/recover@test.com/i)).toBeInTheDocument();
    });
  });
});
