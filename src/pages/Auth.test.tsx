import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import Auth from './Auth';

const { signInMock, signUpMock, toastMock, navigateMock, supabaseMock, resetPasswordMock, verifyOtpMock, resendOtpMock } =
  vi.hoisted(() => ({
    signInMock: vi.fn(),
    signUpMock: vi.fn(),
    toastMock: vi.fn(),
    navigateMock: vi.fn(),
    resetPasswordMock: vi.fn(),
    verifyOtpMock: vi.fn(),
    resendOtpMock: vi.fn(),
    supabaseMock: {
      auth: {
        getSession: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
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

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
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

    // Default supabase mocks
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('signs in and navigates to the dashboard', async () => {
    signInMock.mockResolvedValue({ error: null });
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-123',
            email: 'seller@example.com',
            email_confirmed_at: new Date().toISOString(),
          },
        },
      },
    });

    // Profile mock for role
    (supabaseMock.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi
            .fn()
            .mockResolvedValue({ data: { role: 'seller' }, error: null }),
        })),
      })),
    });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'seller@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.submit(
      screen
        .getAllByRole('button', { name: /sign in/i })
        .slice(-1)[0]
        .closest('form')!,
    );

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        'seller@example.com',
        'password123',
      );
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows a toast on sign-in error', async () => {
    signInMock.mockResolvedValue({ error: { message: 'Invalid login' } });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.submit(
      screen
        .getAllByRole('button', { name: /sign in/i })
        .slice(-1)[0]
        .closest('form')!,
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Invalid login',
          variant: 'destructive',
        }),
      );
    });
  });

  it('switches to sign-up mode and shows the confirmation toast', async () => {
    signUpMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: /create account/i }).slice(-1)[0],
    );

    fireEvent.change(screen.getByPlaceholderText(/phone/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: 'New Seller' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.submit(
      screen
        .getAllByRole('button', { name: /create account/i })
        .slice(-1)[0]
        .closest('form')!,
    );

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Verification Required' }),
      );
    });
  });

  it('toggles password visibility', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByTestId('toggle-password');
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows blocked user alert from sessionStorage', async () => {
    sessionStorage.setItem('apnabazar_blocked_alert', 'true');

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Account Blocked',
        }),
      );
      expect(sessionStorage.getItem('apnabazar_blocked_alert')).toBeNull();
    });
  });

  it('sets signup role from search params', async () => {
    render(
      <MemoryRouter initialEntries={['/auth?role=buyer']}>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: /create account/i }).slice(-1)[0],
    );

    // Roles are buttons with text
    await waitFor(() => {
      const buyerButton = screen.getByText('Buyer').closest('button');
      // Selected state should have text-primary (from auto.bg_card_text_primary_shadow_md)
      expect(buyerButton?.className).toContain('text-primary');
    });
  });

  it('handles forgot password flow', async () => {
    resetPasswordMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/forgot password/i));

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    fireEvent.submit(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('test@example.com');
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'OTP Sent' }),
      );
      expect(screen.getByText(/verify your email/i)).toBeDefined();
    });
  });

  it('handles OTP verification for signup', async () => {
    verifyOtpMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    // Enter signup mode first to set the email
    fireEvent.click(
      screen.getAllByRole('button', { name: /create account/i }).slice(-1)[0],
    );
    fireEvent.change(screen.getByPlaceholderText(/phone/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: 'New Seller' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    });

    signUpMock.mockResolvedValue({ error: null });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: /create account/i })
        .slice(-1)[0]
        .closest('form')!,
    );

    await waitFor(() => {
      expect(screen.getByText(/verify your email/i)).toBeDefined();
    });

    const otpInput = screen.getByPlaceholderText('0 0 0 0 0 0');
    fireEvent.change(otpInput, { target: { value: '123456' } });

    fireEvent.submit(screen.getByRole('button', { name: /verify & continue/i }));

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          token: '123456',
        }),
      );
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles resend OTP with cooldown', async () => {
    resendOtpMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    // Switch to forgot password and then OTP recovery mode
    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    });
    resetPasswordMock.mockResolvedValue({ error: null });
    fireEvent.submit(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => {
      expect(screen.getByText(/resend otp/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/resend otp/i));

    await waitFor(() => {
      expect(resendOtpMock).toHaveBeenCalled();
      expect(screen.getByText(/resend otp in/i)).toBeDefined();
    });
  });

  it('shows validation errors for invalid inputs', async () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    // Login validation
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: /sign in/i })
        .slice(-1)[0]
        .closest('form')!,
    );

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Please enter a valid email and password',
      }),
    );

    // Signup validation
    fireEvent.click(
      screen.getAllByRole('button', { name: /create account/i }).slice(-1)[0],
    );
    fireEvent.change(screen.getByPlaceholderText(/phone/i), {
      target: { value: '123' },
    });
    fireEvent.submit(
      screen
        .getAllByRole('button', { name: /create account/i })
        .slice(-1)[0]
        .closest('form')!,
    );

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Please enter a valid 10-digit phone number',
      }),
    );
  });
});
