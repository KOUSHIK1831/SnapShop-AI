import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';

describe('ProtectedRoute', () => {
  it('renders children when user has matching requiredRole', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller', email_confirmed: true },
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="seller">
                <div>Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('shows loading spinner while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
    } as any);

    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="seller">
          <div>Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects to /auth when there is no user', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="seller">
                <div>Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div>Auth Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Auth Page')).toBeInTheDocument();
  });

  it('redirects to /auth when email is not confirmed', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller', email_confirmed: false },
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="seller">
                <div>Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div>Auth Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Auth Page')).toBeInTheDocument();
  });

  it('redirects admin to /admin when role does not match', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'admin', email_confirmed: true },
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="seller">
                <div>Seller Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('redirects buyer to /buyer when role does not match', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'buyer', email_confirmed: true },
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="seller">
                <div>Seller Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/buyer" element={<div>Buyer Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Buyer Dashboard')).toBeInTheDocument();
  });

  it('redirects to home page when role is unknown', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'unknown', email_confirmed: true },
      loading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="seller">
                <div>Seller Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });
});
