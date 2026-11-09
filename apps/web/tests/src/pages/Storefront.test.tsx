import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Storefront from '@/pages/Storefront';
import en from '@/locales/en/translation.json';

// Mock dependencies
const { toastMock, navigateMock, supabaseMock } = vi.hoisted(() => {
  const toastMock = vi.fn();
  const navigateMock = vi.fn();

  const createChain = () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve(chain)),
      single: vi.fn(() => Promise.resolve(chain)),
      update: vi.fn(() => chain),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => chain),
      then: vi.fn(resolve => resolve({ data: [], error: null })),
      data: [],
      error: null,
    };
    return chain;
  };

  return {
    toastMock,
    navigateMock,
    supabaseMock: {
      from: vi.fn(() => createChain()),
    },
  };
});

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (en as any)[key] || key,
  }),
}));

// Mock components
vi.mock('@/components/BuyerAuthModal', () => ({
  default: ({ isOpen, onOpenChange, onSuccess }: any) =>
    isOpen ? (
      <div data-testid="buyer-auth-modal">
        BuyerAuthModal
        <button onClick={() => onSuccess('1234567890')}>Success</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

vi.mock('@/components/OrderConfirmation', () => ({
  default: ({ isOpen, onConfirm, onClose }: any) =>
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
          Confirm COD
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

vi.mock('@/components/ThemeToggle', () => ({
  default: () => <div>ThemeToggle</div>,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('Storefront page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUser = null;
    delete (window as any).Razorpay;
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
      price: 1000,
      image_url: 'kurta.jpg',
      category: 'Clothing',
      seller_id: 's1',
      stock: 10,
      discount_percent: 10,
      description: 'A nice kurta',
      tags: ['ethnic', 'cotton'],
    },
    {
      id: 'p2',
      title: 'Saree',
      price: 3000,
      image_url: 'saree.jpg',
      category: 'Ethnic',
      seller_id: 's1',
      size_variants: [
        { size: 'M', stock: 5 },
        { size: 'L', stock: 0 },
      ],
    },
    {
      id: 'p3',
      title: 'Scarf',
      price: 500,
      seller_id: 's1',
      stock: 0,
    },
    {
      id: 'p4',
      title: 'Belt',
      price: 800,
      seller_id: 's1',
      stock: 2,
      low_stock_threshold: 5,
    },
  ];

  const setupMocks = (seller = mockSeller, products = mockProducts) => {
    supabaseMock.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => Promise.resolve({ data: products, error: null })),
        single: vi.fn().mockResolvedValue({ data: seller, error: null }),
        update: vi.fn(() => chain),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      return chain;
    });
  };

  it('renders store and products correctly', async () => {
    setupMocks();

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ravi Boutique')).toBeInTheDocument();
    expect(await screen.findByText('Kurta')).toBeInTheDocument();
    expect(screen.getByText('₹900')).toBeInTheDocument();
    expect(screen.getByText('A nice kurta')).toBeInTheDocument();
    // Category button
    expect(
      screen.getByRole('button', { name: /Ethnic \(1\)/i }),
    ).toBeInTheDocument();
  });

  it('shows unapproved state if verification is pending', async () => {
    setupMocks({ ...mockSeller, verification_status: 'pending' });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Store Under Review/i)).toBeInTheDocument();
  });

  it('shows blocked message if store blocked', async () => {
    setupMocks({ ...mockSeller, status: 'blocked' });

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Store unavailable/i)).toBeInTheDocument();
  });

  it('shows no products state', async () => {
    setupMocks(mockSeller, []);

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/No products listed yet/i),
    ).toBeInTheDocument();
  });

  it('renders stock status badges', async () => {
    setupMocks();

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Out of stock/i)).toBeInTheDocument(); // p3
    expect(screen.getAllByText(/In stock/i).length).toBeGreaterThanOrEqual(1); // p1, p4
  });

  it('handles size variant buttons including out of stock', async () => {
    setupMocks();

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Saree');
    const sizeL = screen.getByText('L');
    expect(sizeL).toBeDisabled();

    const sizeM = screen.getByText(/M/);
    fireEvent.click(sizeM);
  });

  it('handles closing order confirmation', async () => {
    mockUser = { id: 'u1', role: 'buyer', email_confirmed: true };
    setupMocks();

    render(
      <MemoryRouter initialEntries={['/store/ravi-boutique']}>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Kurta');
    fireEvent.click(screen.getByTestId('buy-now-btn-p1'));

    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('order-confirmation')).not.toBeInTheDocument();
  });
});
