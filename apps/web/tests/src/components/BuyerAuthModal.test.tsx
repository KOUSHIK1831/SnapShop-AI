import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import BuyerAuthModal from '@/components/BuyerAuthModal';
import en from '@/locales/en/translation.json';

const {
  signInPasswordMock,
  signUpMock,
  verifyOtpMock,
  signInSendOtpMock,
  resendOtpMock,
  mockState,
} = vi.hoisted(() => ({
  signInPasswordMock: vi.fn(() => ({ error: null })),
  signUpMock: vi.fn(() => ({ error: null })),
  verifyOtpMock: vi.fn(() => ({ error: null })),
  signInSendOtpMock: vi.fn(() => ({ error: null })),
  resendOtpMock: vi.fn(() => ({ error: null })),
  mockState: { user: null as any },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockState.user,
    signIn: {
      password: signInPasswordMock,
      sendOtp: signInSendOtpMock,
    },
    signUp: signUpMock,
    verifyOtp: verifyOtpMock,
    resendOtp: resendOtpMock,
    signInWithGoogle: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (en as any)[key] || key,
  }),
}));

describe('BuyerAuthModal coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.user = null;
    sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggles modes correctly', async () => {
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Create Account/i).length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it('signs in successfully', async () => {
    const onSuccess = vi.fn();
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'password123' },
    });
    const signInBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Sign In'));
    if (signInBtn) fireEvent.click(signInBtn);
    await waitFor(() => {
      expect(signInPasswordMock).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles signup successfully and switches to OTP', async () => {
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'password123' },
    });
    const signUpBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
      expect(screen.getByText(/Verify OTP/i)).toBeInTheDocument();
    });
  });

  it('handles OTP verification successfully', async () => {
    const onSuccess = vi.fn();
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'password123' },
    });
    const signUpBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    await waitFor(() =>
      expect(screen.getByText(/Verify OTP/i)).toBeInTheDocument(),
    );
    const otpInput = screen.getByLabelText(/Enter 6-Digit OTP/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText(/Verify & Continue/i));
    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles sign in error', async () => {
    signInPasswordMock.mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
    } as any);
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'wrongpass' },
    });
    const signInBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Sign In'));
    if (signInBtn) fireEvent.click(signInBtn);
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    const passwordInput = screen.getByPlaceholderText(/Min. 6 characters/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleBtn = screen.getByTitle('Toggle password visibility');
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('shows validation errors for login', async () => {
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    const signInBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Sign In'));
    if (signInBtn) fireEvent.click(signInBtn);
    expect(
      screen.getByText(/Please enter your email and password/i),
    ).toBeInTheDocument();
  });

  it('shows validation errors for signup', async () => {
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    const signUpBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    expect(screen.getByText(/Please fill all fields/i)).toBeInTheDocument();
  });

  it('handles verification error in OTP mode', async () => {
    verifyOtpMock.mockResolvedValueOnce({
      error: { message: 'Invalid OTP' },
    } as any);
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), {
      target: { value: 'User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'password' },
    });
    const signUpBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    await waitFor(() =>
      expect(screen.getByText(/Verify OTP/i)).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/Enter 6-Digit OTP/i), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByText(/Verify & Continue/i));
    await waitFor(() => {
      expect(screen.getByText('Invalid OTP')).toBeInTheDocument();
    });
  });

  it('shows validation error for short OTP', async () => {
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), {
      target: { value: 'User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'password' },
    });
    const signUpBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    await waitFor(() =>
      expect(screen.getByText(/Verify OTP/i)).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/Enter 6-Digit OTP/i), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByText(/Verify & Continue/i));
    expect(screen.getByText(/Please enter 6-digit OTP/i)).toBeInTheDocument();
  });

  it('handles login for unverified user', async () => {
    signInPasswordMock.mockResolvedValueOnce({
      error: null,
      user: { email: 'unverified@test.com', email_confirmed: false },
    } as any);
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'unverified@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'password123' },
    });
    const signInBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Sign In'));
    if (signInBtn) fireEvent.click(signInBtn);
    await waitFor(() => {
      expect(screen.getByText(/Verify OTP/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Please verify your email to continue/i),
      ).toBeInTheDocument();
    });
  });

  it('detects existing unverified session on mount', async () => {
    mockState.user = { email: 'unverified@test.com', email_confirmed: false };
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Verify OTP/i)).toBeInTheDocument();
      expect(screen.getByText(/unverified@test.com/i)).toBeInTheDocument();
    });
  });

  /* it('limits max resends', async () => {
    vi.useFakeTimers();
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'max@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), { target: { value: 'password' } });
    const signUpBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    await act(async () => { await vi.runOnlyPendingTimersAsync(); });

    const resendBtn = screen.getByText(/Resend Verification Email/i);
    await act(async () => { fireEvent.click(resendBtn); });
    await act(async () => { vi.advanceTimersByTime(61000); });
    await act(async () => { fireEvent.click(screen.getByText(/Resend Verification Email/i)); });
    await act(async () => { vi.advanceTimersByTime(61000); });
    await act(async () => { fireEvent.click(screen.getByText(/Resend Verification Email/i)); });
    await act(async () => { vi.advanceTimersByTime(61000); });
    expect(screen.getByText(/Max resends reached/i)).toBeInTheDocument();
  }, 20000);

  it('recovers resend state from sessionStorage', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T12:00:00Z'));
    sessionStorage.setItem('otp_resend_stored@test.com', JSON.stringify({ count: 1, nextAllowed: Date.now() + 30000 }));
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'stored@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), { target: { value: 'password' } });
    const signUpBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    await act(async () => { await vi.runOnlyPendingTimersAsync(); });
    await waitFor(() => {
      expect(screen.getByText(/Resend OTP in \d+s/i)).toBeInTheDocument();
    });
  }, 20000); */

  /* it('handles resend OTP error', async () => {
    resendOtpMock.mockResolvedValueOnce({
      error: { message: 'Resend failed' },
    } as any);
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'fail@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), {
      target: { value: 'User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Min. 6 characters/i), {
      target: { value: 'password' },
    });
    const signUpBtn = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('Create Account'));
    if (signUpBtn) fireEvent.click(signUpBtn);
    await waitFor(() =>
      expect(screen.getByText(/Verify OTP/i)).toBeInTheDocument(),
    );
    const resendBtn = screen.getByText(/Resend Verification Email/i);
    await act(async () => {
      fireEvent.click(resendBtn);
    });
    await waitFor(() => {
      expect(screen.getByText(/Resend failed/i)).toBeInTheDocument();
    });
  }); */

  it('resets state when onClose is called or modal reopens', () => {
    const { unmount } = render(
      <BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'dirty@test.com' },
    });
    unmount();
    render(<BuyerAuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByPlaceholderText(/name@example.com/i)).toHaveValue('');
  });
});
