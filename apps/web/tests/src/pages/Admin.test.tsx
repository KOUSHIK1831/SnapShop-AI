import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from '@/pages/Admin';

const { apiGetMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: apiGetMock,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', role: 'admin' },
    loading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));
vi.mock('@/components/LanguageSwitcher', () => ({ default: () => <div /> }));
vi.mock('@/components/ThemeToggle', () => ({ default: () => <div /> }));

describe('Admin portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue({
      profiles: [],
      sellers: [],
      totalProducts: 0,
      totalOrders: 0,
      feedback: [],
      notificationLogs: [],
      auditLogs: [],
    });
  });

  it('loads the admin overview through the application API', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Admin />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith('/admin/overview'),
    );
    expect(await screen.findByText(/Admin Portal/i)).toBeInTheDocument();
  });

  it('reports an API error when overview cannot be loaded', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('Request failed'));
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Admin />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not load admin data',
          description: 'Request failed',
        }),
      ),
    );
  });
});
