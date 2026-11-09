import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from '@/App';

const { authState } = vi.hoisted(() => ({
  authState: { user: null as null | { id: string }, loading: false },
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div>SonnerToaster</div>,
}));

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div>ToastToaster</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: () => authState,
}));

vi.mock('@/pages/Index', () => ({
  default: () => <div>IndexPage</div>,
}));

vi.mock('@/pages/Auth', () => ({
  default: () => <div>AuthPage</div>,
}));

vi.mock('@/pages/Dashboard', () => ({
  default: () => <div>DashboardPage</div>,
}));

vi.mock('@/pages/Storefront', () => ({
  default: () => <div>StorefrontPage</div>,
}));

vi.mock('@/pages/NotFound', () => ({
  default: () => <div>NotFoundPage</div>,
}));

describe('App', () => {
  it('renders the public index route by default', () => {
    window.history.pushState({}, '', '/');
    authState.user = null;
    authState.loading = false;

    render(<App />);

    expect(screen.getByText('IndexPage')).toBeInTheDocument();
    expect(screen.getByText('ToastToaster')).toBeInTheDocument();
    expect(screen.getByText('SonnerToaster')).toBeInTheDocument();
  });

  it('protects the dashboard route for signed-out users', () => {
    window.history.pushState({}, '', '/dashboard');
    authState.user = null;
    authState.loading = false;

    render(<App />);

    expect(screen.getByText('AuthPage')).toBeInTheDocument();
  });
});
