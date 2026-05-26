import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import Index from '@/pages/Index';

const { navigateMock, authState } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  authState: { user: null as any, loading: false },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
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

describe('Index page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.loading = false;
    // Reset window.location.hash
    window.location.hash = '';
  });

  it('redirects authenticated seller to the dashboard', async () => {
    authState.user = { id: 'user-1', role: 'seller' };
    authState.loading = false;

    render(<Index />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects authenticated admin to admin panel', async () => {
    authState.user = { id: 'user-1', role: 'admin' };
    render(<Index />);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('redirects authenticated buyer to buyer dashboard', async () => {
    authState.user = { id: 'user-1', role: 'buyer' };
    render(<Index />);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/buyer');
    });
  });

  it('handles password recovery hash', async () => {
    window.location.hash = '#type=recovery&access_token=123';
    render(<Index />);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/reset-password' + window.location.hash,
        { replace: true },
      );
    });
  });

  it('handles error in hash by redirecting to reset password', async () => {
    window.location.hash = '#error_code=404';
    render(<Index />);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/reset-password' + window.location.hash,
        { replace: true },
      );
    });
  });

  it('ignores non-relevant hash', async () => {
    window.location.hash = '#some-other-thing';
    render(<Index />);
    await waitFor(() => {
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  it('navigates to auth from the CTA buttons', () => {
    authState.user = null;
    authState.loading = false;

    render(<Index />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /start selling online/i }),
    );

    expect(navigateMock).toHaveBeenCalledWith('/auth');
  });
});
