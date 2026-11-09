import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import BuyerDashboard from '@/pages/BuyerDashboard';

// Mock dependencies
const {
  mockSignOut,
  mockNavigate,
  mockSelect,
  mockEq,
  mockOrder,
  mockNot,
  mockNeq,
} = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockNavigate: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockNot: vi.fn(),
  mockNeq: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'buyer1',
      email: 'buyer@test.com',
      name: 'Buyer Test',
      phone: '9999999999',
    },
    signOut: mockSignOut,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle" />,
}));
vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher" />,
}));
vi.mock('@/components/NetworkStrengthIndicator', () => ({
  NetworkStrengthIndicator: () => <div data-testid="network-indicator" />,
}));

// FeedbackModal (rendered by the dashboard) calls useSeller. Without this mock
// the real hook runs its seller/orders bootstrap against the mocked Supabase
// client, whose unstable user object makes the effect re-run on every render.
vi.mock('@/hooks/useSeller', () => ({
  useSeller: () => ({ seller: null }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const c: Record<string, any> = {};
    c.select = mockSelect.mockReturnValue(c);
    c.eq = mockEq.mockReturnValue(c);
    c.order = mockOrder.mockReturnValue(c);
    c.not = mockNot.mockReturnValue(c);
    c.neq = mockNeq.mockReturnValue(c);
    return c;
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(chain()),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      }),
    },
  };
});

describe('BuyerDashboard coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [] });
  });

  const renderDashboard = (initialEntries = ['/']) =>
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <BuyerDashboard />
      </MemoryRouter>,
    );

  it('renders shops tab and loads shops', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 's1',
          store_name: 'Test Store',
          store_slug: 'test-store',
          store_description: 'A great store',
          location: 'Test City',
          phone: '1234567890',
        },
      ],
    });

    renderDashboard();

    expect(screen.getByText(/auto.welcome_back/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });
  });

  it('switches to orders tab', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'order1',
          status: 'pending',
          pay_method: 'cod',
          pay_status: 'pending',
          quantity: 2,
          created_at: new Date().toISOString(),
          product: { title: 'Test Product', price: 100, image_url: null },
          seller: { store_name: 'Test Store', phone: '1234567890' },
        },
      ],
    });

    renderDashboard(['/?tab=orders']);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      // Translation key for pending status is orders.status.pending
      expect(screen.getByText('orders.status.pending')).toBeInTheDocument();
    });
  });

  it('filters shops by search text', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 's1',
          store_name: 'Apple Store',
          store_slug: 'apple',
          categories: ['tech'],
        },
        {
          id: 's2',
          store_name: 'Banana Shop',
          store_slug: 'banana',
          categories: ['food'],
        },
      ],
    });

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText('Apple Store')).toBeInTheDocument(),
    );

    const searchInput = screen.getByPlaceholderText(
      /auto.search_shops_or_location/i,
    );
    fireEvent.change(searchInput, { target: { value: 'Apple' } });

    expect(screen.getByText('Apple Store')).toBeInTheDocument();
    expect(screen.queryByText('Banana Shop')).not.toBeInTheDocument();
  });

  it('handles sharing a store', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [{ id: 's1', store_name: 'Test Store', store_slug: 'test-store' }],
    });

    // Mock navigator.share
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
    });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Test Store')).toBeInTheDocument(),
    );

    const shareButton = screen.getByTitle(/auto.share_store_link/i);
    fireEvent.click(shareButton);

    expect(shareMock).toHaveBeenCalled();
  });

  it('renders profile tab and signs out', async () => {
    renderDashboard(['/?tab=profile']);

    expect(screen.getAllByText('Buyer Test').length).toBeGreaterThan(0);

    const signOutButtons = screen.getAllByRole('button', {
      name: /auto.sign_out/i,
    });
    fireEvent.click(signOutButtons[0]);

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('handles clearing filters when no shops match', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 's1',
          store_name: 'Existing Store',
          store_slug: 'existing',
          categories: ['tech'],
        },
      ],
    });

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText('Existing Store')).toBeInTheDocument(),
    );

    const searchInput = screen.getByPlaceholderText(
      /auto.search_shops_or_location/i,
    );
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    await waitFor(() =>
      expect(
        screen.getByText(/auto.no_shops_match_your_filters/i),
      ).toBeInTheDocument(),
    );

    const clearButton = screen.getByText(/auto.clear_filters/i);
    fireEvent.click(clearButton);

    await waitFor(() =>
      expect(screen.getByText('Existing Store')).toBeInTheDocument(),
    );
  });

  it('renders shop card details and handles share fallback', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 's1',
          store_name: 'Detailed Store',
          store_slug: 'detailed',
          location: 'Local Area',
          store_description: 'A great store',
          banner_url: null, // Test missing banner
          contact_number: '919999999999',
        },
      ],
    });

    // Mock navigator.share to fail to trigger fallback
    delete (navigator as any).share;
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Detailed Store')).toBeInTheDocument(),
    );

    expect(screen.getByText('Local Area')).toBeInTheDocument();
    expect(screen.getByText('A great store')).toBeInTheDocument();

    const shareButton = screen.getByTitle(/auto.share_store_link/i);
    fireEvent.click(shareButton);

    expect(writeTextMock).toHaveBeenCalled();
  });

  it('renders order card with payment proof and delivery details', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [{ id: 's1', store_name: 'Store' }],
    });

    // Mock orders call
    const ordersMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'o1',
          status: 'shipped',
          pay_method: 'online',
          pay_status: 'paid',
          payment_proof_url: 'http://proof.jpg',
          quantity: 1,
          created_at: new Date().toISOString(),
          del_type: 'self_delivery',
          delivery_person_name: 'Delivery Guy',
          delivery_person_phone: '9876543210',
          product: { title: 'Test Product', price: 100, image_url: null },
          seller: {
            store_name: 'Store',
            store_slug: 'store',
            contact_number: '123',
          },
        },
      ],
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orders')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: ordersMock,
        } as any;
      return {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
      } as any;
    });

    renderDashboard(['/?tab=orders']);
    await waitFor(() =>
      expect(screen.getByText('Test Product')).toBeInTheDocument(),
    );

    expect(screen.getByText(/auto.proof_submitted/i)).toBeInTheDocument();
    expect(screen.getByText('Delivery Guy')).toBeInTheDocument();

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const callButton = screen.getByText(/auto.call/i);
    fireEvent.click(callButton);
    expect(openSpy).toHaveBeenCalledWith('tel:9876543210', '_self');
    openSpy.mockRestore();
  });
});
