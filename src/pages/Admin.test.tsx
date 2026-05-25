import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Admin from './Admin';
import en from '../locales/en/translation.json';

// Mock dependencies
const { toastMock, navigateMock, supabaseMock } = vi.hoisted(() => {
  const toastMock = vi.fn();
  const navigateMock = vi.fn();
  
  const createMockResponse = (data: any, count: number = 0) => ({
    data,
    error: null,
    count: count || (Array.isArray(data) ? data.length : 0),
  });

  const createChain = (table: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(() => {
        if (table === 'sellers') return Promise.resolve(createMockResponse({ id: 's1', store_name: 'Ravi Store', store_slug: 'ravi', status: 'active', verification_status: 'approved' }));
        return Promise.resolve(createMockResponse(null));
      }),
      update: vi.fn(() => Promise.resolve({ error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => Promise.resolve({ error: null })),
      then: vi.fn((resolve) => {
        let data: any = [];
        if (table === 'profiles') data = [{ id: 'p1', email: 'user@example.com', role: 'buyer', status: 'active', is_blocked: false }];
        if (table === 'sellers') data = [{ id: 's1', store_name: 'Ravi Store', store_slug: 'ravi', status: 'active', verification_status: 'approved' }];
        if (table === 'products') data = [{ id: 'pr1', title: 'Product 1', seller_id: 's1' }];
        if (table === 'orders') data = [{ id: 'o1', status: 'pending', seller_id: 's1' }];
        if (table === 'feedback') data = [{ id: 'f1', content: 'Great app!', status: 'open', user_id: 'p1' }];
        
        return Promise.resolve(createMockResponse(data)).then(resolve);
      }),
    };
    return chain;
  };

  return {
    toastMock,
    navigateMock,
    supabaseMock: {
      from: vi.fn((table) => createChain(table)),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://signed.url' }, error: null }),
        })),
      },
    },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (en as any)[key] || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock('@/components/ThemeToggle', () => ({
  default: () => <div>ThemeToggle</div>,
}));

describe('Admin Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (entry: string) => {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders admin portal and statistics', async () => {
    renderWithRouter('/admin');

    expect(await screen.findByText(/Admin Portal/i)).toBeInTheDocument();
    await waitFor(() => {
      const stats = screen.getAllByText('1');
      expect(stats.length).toBeGreaterThan(0);
    });
  });

  it('renders users tab', async () => {
    renderWithRouter('/admin?tab=users');

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    
    // Block button is an icon button (UserX icon), not text-based
    const blockBtn = document.querySelector('.lucide-user-x');
    expect(blockBtn).toBeInTheDocument();
  });

  it('renders feedback tab', async () => {
    renderWithRouter('/admin?tab=feedback');

    expect(await screen.findByText(/"Great app!"/)).toBeInTheDocument();
  });

  it('handles seller selection', async () => {
    renderWithRouter('/admin?tab=sellers');

    const sellerRow = await screen.findByText('Ravi Store');
    fireEvent.click(sellerRow);

    expect(await screen.findByText(/Back to Overview/i)).toBeInTheDocument();
  });
});
