import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Admin from '@/pages/Admin';
import en from '@/locales/en/translation.json';

// Unified mock dependencies
const { toastMock, navigateMock, supabaseMock } = vi.hoisted(() => {
  const toastMock = vi.fn();
  const navigateMock = vi.fn();

  return {
    toastMock,
    navigateMock,
    supabaseMock: {
      from: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'http://signed.url' },
            error: null,
          }),
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
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
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

  const setupDataMocks = (
    overrides: Record<string, any> = {},
    errorOverrides: Record<string, any> = {},
  ) => {
    const defaultData: Record<string, any> = {
      profiles: [
        {
          id: 'p1',
          email: 'user@example.com',
          role: 'buyer',
          status: 'active',
          is_blocked: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'p2',
          email: 'seller@example.com',
          role: 'seller',
          status: 'active',
          is_blocked: false,
          created_at: new Date().toISOString(),
        },
      ],
      sellers: [
        {
          id: 's1',
          user_id: 'p2',
          store_name: 'Ravi Store',
          store_slug: 'ravi',
          status: 'active',
          verification_status: 'approved',
          created_at: new Date().toISOString(),
          ai_daily_limit: 25,
        },
      ],
      products: [
        {
          id: 'pr1',
          title: 'Product 1',
          seller_id: 's1',
          price: 100,
          stock: 10,
          category: 'Clothing',
        },
      ],
      orders: [
        {
          id: 'o1',
          status: 'pending',
          seller_id: 's1',
          buyer_name: 'Buyer 1',
          created_at: new Date().toISOString(),
        },
      ],
      feedback: [
        {
          id: 'f1',
          content: 'Great app!',
          status: 'open',
          user_id: 'p1',
          created_at: new Date().toISOString(),
        },
      ],
      notification_logs: [
        {
          id: 'n1',
          notification_type: 'test',
          recipient_email: 'test@test.com',
          status: 'sent',
          last_attempted_at: new Date().toISOString(),
        },
      ],
      system_audit_logs: [
        {
          id: 'a1',
          action: 'test_action',
          entity_type: 'test',
          entity_id: 'e1',
          created_at: new Date().toISOString(),
        },
      ],
    };

    const data = { ...defaultData, ...overrides };

    supabaseMock.from.mockImplementation(table => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        neq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        single: vi.fn(() => {
          const item = data[table]
            ? Array.isArray(data[table])
              ? data[table][0]
              : data[table]
            : null;
          return Promise.resolve({
            data: item,
            error: errorOverrides[table] || null,
          });
        }),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        insert: vi.fn(() =>
          Promise.resolve({ error: errorOverrides[table] || null }),
        ),
        upsert: vi.fn(() =>
          Promise.resolve({ error: errorOverrides[table] || null }),
        ),
        then: vi.fn(resolve => {
          return Promise.resolve({
            data: data[table] || [],
            error: errorOverrides[table] || null,
          }).then(resolve);
        }),
      };
      return chain;
    });
  };

  const renderWithRouter = (entry: string) => {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders admin portal and statistics', async () => {
    setupDataMocks();
    renderWithRouter('/admin');
    expect(await screen.findByText(/Admin Portal/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('toggles user block status', async () => {
    setupDataMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = renderWithRouter('/admin?tab=users');

    await screen.findByText('user@example.com');
    const userXIcons = container.querySelectorAll('.lucide-user-x');
    const btn = userXIcons[0]?.parentElement;
    if (btn) fireEvent.click(btn);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'User Blocked' }),
      );
    });
  });

  it('handles feedback status update and deletion', async () => {
    setupDataMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter('/admin?tab=feedback');

    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'resolved' } });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Feedback updated successfully' }),
      );
    });

    const deleteBtns = screen
      .getAllByRole('button')
      .filter(b => b.querySelector('.lucide-trash2'));
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Feedback deleted' }),
      );
    });
  });

  it('manages seller details and actions', async () => {
    setupDataMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const openMock = vi.fn();
    window.open = openMock;

    renderWithRouter('/admin?tab=sellers');

    const sellerRow = await screen.findByText('Ravi Store');
    fireEvent.click(sellerRow);

    expect(await screen.findByText(/Back to Overview/i)).toBeInTheDocument();

    const blockBtn = await screen.findByText(/Block Store/i);
    fireEvent.click(blockBtn);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Store Blocked' }),
      );
    });

    const deleteProdBtn = screen.getByText(/Delete/i);
    fireEvent.click(deleteProdBtn);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Product deleted' }),
      );
    });

    const input = screen.getByDisplayValue('25');
    fireEvent.change(input, { target: { value: '50' } });
    const updateBtn = screen.getByText('Update');
    fireEvent.click(updateBtn);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Limit updated successfully' }),
      );
    });

    const viewBtn = await screen.findByRole('button', {
      name: /View Public Store/i,
    });
    fireEvent.click(viewBtn);
    expect(openMock).toHaveBeenCalled();
  });

  it('handles AI limit update error', async () => {
    setupDataMocks({}, { sellers: { message: 'Update failed' } });

    renderWithRouter('/admin?tab=sellers');
    fireEvent.click(await screen.findByText('Ravi Store'));

    const input = await screen.findByDisplayValue('25');
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Update failed',
        }),
      );
    });
  });

  it('handles seller verification flow and rejected state', async () => {
    setupDataMocks({
      sellers: [
        {
          id: 's2',
          store_name: 'Pending Store',
          verification_status: 'pending',
        },
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithRouter('/admin?tab=verifications');

    const store = await screen.findByText('Pending Store');
    fireEvent.click(store);

    const approveBtn = await screen.findByText(/Approve Seller/i);
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
  });

  it('renders products without images', async () => {
    setupDataMocks({
      products: [{ id: 'pr1', title: 'Product No Image', price: 100 }],
    });

    renderWithRouter('/admin?tab=sellers');
    fireEvent.click(await screen.findByText('Ravi Store'));

    expect(await screen.findByText('Product No Image')).toBeInTheDocument();
    const fallbackIcon = document.querySelector('.lucide-package');
    expect(fallbackIcon).toBeInTheDocument();
  });

  it('renders monitoring tab', async () => {
    setupDataMocks();
    renderWithRouter('/admin?tab=monitoring');
    expect(
      await screen.findByText(/Failed Notifications/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Audit Trail/i)).toBeInTheDocument();
  });
});
