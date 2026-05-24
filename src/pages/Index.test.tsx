import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Index from './Index';

const { navigateMock, authState } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  authState: { user: null as null | { id: string }, loading: false },
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
  it('redirects authenticated users to the dashboard', async () => {
    authState.user = { id: 'user-1', role: 'seller' };
    authState.loading = false;

    render(<Index />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
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
