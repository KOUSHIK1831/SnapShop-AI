import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
const mockLocation = { pathname: '/dashboard' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

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
import BottomNav from './BottomNav';

describe('BottomNav', () => {
  it('renders seller navigation when role is seller', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller', email: 'test@test.com' },
    });

    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('dashboard.tabs.products')).toBeInTheDocument();
    expect(screen.getByText('auto.manage')).toBeInTheDocument();
    expect(screen.getByText('auto.profile')).toBeInTheDocument();
  });

  it('calls setSearchParams when navigating on same path', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller', email: 'test@test.com' },
    });

    mockLocation.pathname = '/dashboard';

    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('dashboard.tabs.products'));
    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'products' });
  });

  it('renders nothing when user is null', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null });

    const { container } = render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );

    expect(container.textContent).toBe('');
  });

  it('renders admin navigation for admin role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'admin', email: 'admin@test.com' },
    });

    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('auto.sellers')).toBeInTheDocument();
    expect(screen.getByText('auto.verifications')).toBeInTheDocument();
  });

  it('renders buyer navigation for buyer role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'buyer', email: 'buyer@test.com' },
    });

    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('auto.shops')).toBeInTheDocument();
    expect(screen.getByText('auto.my_orders')).toBeInTheDocument();
  });
});
