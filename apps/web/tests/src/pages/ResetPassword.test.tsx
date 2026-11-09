import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockUpdatePassword = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
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

import ResetPassword from '@/pages/ResetPassword';

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: {
        search: '?token=valid-reset-token',
        pathname: '/reset-password',
      },
      configurable: true,
    });
    mockUpdatePassword.mockResolvedValue({ error: null });
  });

  it('shows the password form when the reset token is present', async () => {
    render(<ResetPassword />);
    expect(
      await screen.findByPlaceholderText('auto.new_password_min_6_chars'),
    ).toBeInTheDocument();
  });

  it('shows an invalid state when no reset token is present', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/reset-password' },
      configurable: true,
    });
    render(<ResetPassword />);
    expect(
      screen.getByText('auto.link_expired_or_invalid'),
    ).toBeInTheDocument();
  });

  it('submits the new password with the reset token', async () => {
    render(<ResetPassword />);
    const password = await screen.findByPlaceholderText(
      'auto.new_password_min_6_chars',
    );
    fireEvent.change(password, { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByPlaceholderText('auto.confirm_new_password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByText('auto.update_password'));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith(
        'newpassword123',
        'valid-reset-token',
      );
    });
    expect(screen.getByText('auto.password_updated')).toBeInTheDocument();
  });

  it('rejects mismatched passwords', async () => {
    render(<ResetPassword />);
    fireEvent.change(
      await screen.findByPlaceholderText('auto.new_password_min_6_chars'),
      { target: { value: 'password123' } },
    );
    fireEvent.change(screen.getByPlaceholderText('auto.confirm_new_password'), {
      target: { value: 'password456' },
    });
    fireEvent.click(screen.getByText('auto.update_password'));
    expect(
      await screen.findByText('Passwords do not match'),
    ).toBeInTheDocument();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows API errors from password reset', async () => {
    mockUpdatePassword.mockResolvedValue({ error: new Error('Update failed') });
    render(<ResetPassword />);
    fireEvent.change(
      await screen.findByPlaceholderText('auto.new_password_min_6_chars'),
      { target: { value: 'newpassword123' } },
    );
    fireEvent.change(screen.getByPlaceholderText('auto.confirm_new_password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByText('auto.update_password'));
    expect(await screen.findByText('Update failed')).toBeInTheDocument();
  });
});
