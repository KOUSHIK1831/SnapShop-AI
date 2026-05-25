import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Storefront from './Storefront';

// Mock dependencies
const { toastMock, navigateMock, supabaseMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  supabaseMock: {
    from: vi.fn((table) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(),
        update: vi.fn(() => chain),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      return chain;
    }),
  },
}));

let mockUser: any = null;

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
    user: mockUser,
    loading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

// Mock components
vi.mock('@/components/BuyerAuthModal', () => ({
  default: ({ isOpen, onOpenChange }: any) =>
    isOpen ? (
      <div data-testid="buyer-auth-modal">
        BuyerAuthModal
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

vi.mock('@/components/OrderConfirmation', () => ({
  default: ({ isOpen, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="order-confirmation">
        OrderConfirmation
        <button
          onClick={() =>
            onConfirm(
              { name: 'Test', phone: '1234567890' },
              'cod',
              'upi_qr',
              'proof.jpg',
            )
          }
        >
          Confirm
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock('@/components/ThemeToggle', () => ({
  default: () => <div>ThemeToggle</div>,
}));

describe('Storefront page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUser = null;
  });

  const mockSeller = {
    id: 's1',
    store_name: 'Ravi Boutique',
    store_slug: 'ravi-boutique',
    verification_status: 'approved',
    phone: '9999999999',
    theme_color: '#8b5cf6',
  };

  const mockProducts = [
    {
      id: 'p1',
      title: 'Kurta',
      price: 999,
      image_url: 'kurta.jpg',
      category: 'Clothing',
      seller_id: 's1',
    },
    {
      id: 'p2',
      title: 'Saree',
      price: 2999,
      image_url: 'saree.jpg',
      category: 'Ethnic',
      seller_id: 's1',
    },
  ];

  it('renders store and products correctly', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => Promise.resolve({ data: mockProducts, error: null })),
        single: vi.fn().mockResolvedValue({ data: mockSeller, error: null }),
      };
      return chain;
    });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ravi Boutique')).toBeInTheDocument();
    expect(await screen.findByText('Kurta')).toBeInTheDocument();
  });

  it('shows not found state if store does not exist', async () => {
    supabaseMock.from.mockImplementation(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return chain;
    });

    render(
      <MemoryRouter initialEntries={['/store/non-existent']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/store not found/i)).toBeInTheDocument();
  });

  it('shows blocked state if store is blocked', async () => {
    supabaseMock.from.mockImplementation(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({
          data: { ...mockSeller, status: 'blocked', verification_status: 'blocked' },
          error: null,
        }),
      };
      return chain;
    });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/store unavailable/i)).toBeInTheDocument();
  });

  it('filters products by category', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockSeller, error: null }),
      };
      return chain;
    });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Kurta');

    const ethnicBadge = screen.getByText(/ethnic/i);
    fireEvent.click(ethnicBadge);

    expect(screen.queryByText('Kurta')).not.toBeInTheDocument();
    expect(screen.getByText('Saree')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/all/i));
    expect(screen.getByText('Kurta')).toBeInTheDocument();
  });

  it('handles WhatsApp chat click', async () => {
    const openMock = vi.fn();
    window.open = openMock;

    supabaseMock.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockSeller, error: null }),
      };
      return chain;
    });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Kurta');

    const whatsappBtn = screen.getByTestId('whatsapp-btn-p1');
    fireEvent.click(whatsappBtn);

    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/9999999999'),
      '_blank',
    );
  });

  it('completes order flow for authenticated user', async () => {
    mockUser = { id: 'u1', role: 'buyer', email_confirmed: true };

    supabaseMock.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockSeller, error: null }),
        update: vi.fn(() => chain),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      return chain;
    });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Kurta');

    const orderBtn = screen.getByTestId('buy-now-btn-p1');
    fireEvent.click(orderBtn);

    expect(await screen.findByText('OrderConfirmation')).toBeInTheDocument();

    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(supabaseMock.from).toHaveBeenCalledWith('orders');
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Order placed!' }),
      );
    });
  });

  it('handles pending order from sessionStorage', async () => {
    mockUser = { id: 'u1', role: 'buyer', email_confirmed: true };
    sessionStorage.setItem('pending_order_product_id', 'p1');

    supabaseMock.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockSeller, error: null }),
      };
      return chain;
    });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('OrderConfirmation')).toBeInTheDocument();
      expect(sessionStorage.getItem('pending_order_product_id')).toBeNull();
    });
  });
});