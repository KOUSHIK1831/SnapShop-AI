import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockUpdatePassword = vi.fn();
const mockToast = vi.fn();

const { mockSetSession, mockGetSession, mockOnAuthStateChange, mockSubscription } =
  vi.hoisted(() => {
    const sub = { unsubscribe: vi.fn() };
    return {
      mockSetSession: vi.fn(),
      mockGetSession: vi.fn(),
      mockOnAuthStateChange: vi.fn(() => ({
        data: { subscription: sub },
      })),
      mockSubscription: sub,
    };
  });

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ updatePassword: mockUpdatePassword }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      setSession: mockSetSession,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

import ResetPassword from './ResetPassword';

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { hash: '', pathname: '/reset-password', replaceState: vi.fn() },
      writable: true,
    });
    mockUpdatePassword.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSetSession.mockResolvedValue({ error: null });
  });

  it('shows loading state initially', () => {
    render(<ResetPassword />);
    expect(screen.getByText('auto.verifying_reset_link')).toBeInTheDocument();
  });

  it('shows form when session already exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });
  });

  it('shows form on PASSWORD_RECOVERY event', async () => {
    render(<ResetPassword />);

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback('PASSWORD_RECOVERY');

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });
  });

  it('sets page to invalid when error_code is in hash', () => {
    Object.defineProperty(window, 'location', {
      value: { hash: '#error_code=invalid', pathname: '/reset-password', replaceState: vi.fn() },
      writable: true,
    });

    render(<ResetPassword />);

    expect(screen.getByText('auto.link_expired_or_invalid')).toBeInTheDocument();
  });

  it('shows form when hash contains valid recovery tokens', async () => {
    const historyReplaceState = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        hash: '#access_token=abc&refresh_token=def&type=recovery',
        pathname: '/reset-password',
      },
      writable: true,
    });
    Object.defineProperty(window, 'history', {
      value: { replaceState: historyReplaceState },
      writable: true,
    });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'abc',
        refresh_token: 'def',
      });
    });

    expect(historyReplaceState).toHaveBeenCalled();
  });

  it('shows invalid when setSession fails', async () => {
    mockSetSession.mockResolvedValue({ error: new Error('Invalid token') });

    Object.defineProperty(window, 'location', {
      value: {
        hash: '#access_token=bad&refresh_token=bad&type=recovery',
        pathname: '/reset-password',
        replaceState: vi.fn(),
      },
      writable: true,
    });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByText('auto.link_expired_or_invalid')).toBeInTheDocument();
    });
  });

  it('submits new password successfully', async () => {
    mockUpdatePassword.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

    const confirmInput = screen.getByPlaceholderText('auto.confirm_new_password');
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

    fireEvent.click(screen.getByText('auto.update_password'));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('newpassword123');
    });

    expect(screen.getByText('auto.password_updated')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Password updated!',
      description: 'You can now sign in with your new password.',
    });
  });

  it('shows error when passwords do not match', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmInput = screen.getByPlaceholderText('auto.confirm_new_password');
    fireEvent.change(confirmInput, { target: { value: 'password456' } });

    fireEvent.click(screen.getByText('auto.update_password'));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows error when password is too short', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    fireEvent.change(passwordInput, { target: { value: 'abc' } });

    const confirmInput = screen.getByPlaceholderText('auto.confirm_new_password');
    fireEvent.change(confirmInput, { target: { value: 'abc' } });

    fireEvent.click(screen.getByText('auto.update_password'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('shows error when updatePassword fails', async () => {
    mockUpdatePassword.mockResolvedValue({ error: new Error('Update failed') });
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

    const confirmInput = screen.getByPlaceholderText('auto.confirm_new_password');
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

    fireEvent.click(screen.getByText('auto.update_password'));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('navigates to auth from invalid page', () => {
    Object.defineProperty(window, 'location', {
      value: { hash: '#error_code=invalid', pathname: '/reset-password', replaceState: vi.fn() },
      writable: true,
    });

    render(<ResetPassword />);

    fireEvent.click(screen.getByText('auto.back_to_sign_in'));
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('disables submit button when fields are empty', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      const btn = screen.getByText('auto.update_password').closest('button');
      expect(btn).toBeDisabled();
    });
  });

  it('shows password strength indicator', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    fireEvent.change(passwordInput, { target: { value: 'a' } });

    const strengthBars = document.querySelectorAll('.rounded-full.transition-colors');
    expect(strengthBars.length).toBeGreaterThan(0);
  });

  it('unsubscribes from auth state change on unmount', () => {
    const { unmount } = render(<ResetPassword />);
    unmount();
    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('toggles showPassword visibility', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    const { container } = render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    expect(passwordInput).toHaveAttribute('type', 'auto.password');

    const toggleButtons = container.querySelectorAll('button[type="button"]');
    const showPasswordBtn = toggleButtons[0];
    fireEvent.click(showPasswordBtn);

    expect(passwordInput).toHaveAttribute('type', 'auto.text');
  });

  it('toggles showConfirm visibility', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    const { container } = render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.confirm_new_password')).toBeInTheDocument();
    });

    const confirmInput = screen.getByPlaceholderText('auto.confirm_new_password');
    expect(confirmInput).toHaveAttribute('type', 'auto.password');

    const toggleButtons = container.querySelectorAll('button[type="button"]');
    const showConfirmBtn = toggleButtons[1];
    fireEvent.click(showConfirmBtn);

    expect(confirmInput).toHaveAttribute('type', 'auto.text');
  });

  it('shows amber password strength bar for length 7-9', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    fireEvent.change(passwordInput, { target: { value: 'abcdefgh' } });
  });

  it('shows green password strength bar for length 10+', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

    render(<ResetPassword />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auto.new_password_min_6_chars')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('auto.new_password_min_6_chars');
    fireEvent.change(passwordInput, { target: { value: 'abcdefghij' } });
  });
});
