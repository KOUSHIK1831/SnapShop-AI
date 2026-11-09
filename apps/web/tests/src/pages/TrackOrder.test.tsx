import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TrackOrder from '@/pages/TrackOrder';
import en from '@/locales/en/translation.json';

const mockGet = vi.fn();
vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockSocketListener = vi.fn();
vi.mock('@/hooks/useSocket', () => ({
  useSocketEvent: (event: string, handler: any) => {
    mockSocketListener(event, handler);
  },
  getSocket: vi.fn(() => ({
    connected: true,
    connect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

// Mock translation with real keys
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'auto.id_status_created_at_del_type')
        return 'id, status, pay_status, payment_proof_url, created_at, del_type, tracking_provider, tracking_number, delivery_person_name, delivery_person_phone, delivery_address, product:products(title, price, image_url), seller:sellers(store_name, store_slug)';
      return (en as any)[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'buyer' },
    loading: false,
  }),
}));

describe('TrackOrder Page', () => {
  const mockOrder = {
    id: 'order-1',
    status: 'shipped',
    pay_status: 'paid',
    payment_proof_url: 'https://example.com/proof.jpg',
    created_at: new Date().toISOString(),
    del_type: 'courier',
    tracking_provider: 'FedEx',
    tracking_number: '12345678',
    delivery_address: {
      name: 'John Doe',
      line1: '123 Main St',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      phone: '9876543210',
    },
    product: {
      title: 'Cool Tshirt',
      price: 999,
      image_url: null,
    },
    seller: {
      store_name: 'Fashion Hub',
      store_slug: 'fashion-hub',
    },
  };

  const mockLogs = [
    {
      id: 'log-1',
      status: 'pending',
      description: 'Order placed',
      changed_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order details and status timeline', async () => {
    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/events')) {
        return Promise.resolve({ events: mockLogs });
      }
      return Promise.resolve({ order: mockOrder });
    });

    render(
      <MemoryRouter initialEntries={['/track/order-1']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Cool Tshirt/i)).toBeInTheDocument();
      expect(screen.getByText(/Fashion Hub/i)).toBeInTheDocument();
    });
  });

  it('shows error state when order not found', async () => {
    mockGet.mockRejectedValue(new Error('Order not found'));

    render(
      <MemoryRouter initialEntries={['/track/invalid']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Order not found/i)).toBeInTheDocument();
    });
  });

  it('renders cancelled order state', async () => {
    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/events')) {
        return Promise.resolve({ events: mockLogs });
      }
      return Promise.resolve({
        order: { ...mockOrder, status: 'cancelled' },
      });
    });

    render(
      <MemoryRouter initialEntries={['/track/order-1']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Order Cancelled/i) ||
          screen.getByText('auto.order_cancelled'),
      ).toBeInTheDocument();
    });
  });

  it('renders delivery partner details for self-delivery', async () => {
    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/events')) {
        return Promise.resolve({ events: mockLogs });
      }
      return Promise.resolve({
        order: {
          ...mockOrder,
          del_type: 'self_delivery',
          delivery_person_name: 'Ravi',
          delivery_person_phone: '9999999999',
        },
      });
    });

    render(
      <MemoryRouter initialEntries={['/track/order-1']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Ravi/i)).toBeInTheDocument();
    });
  });

  it('subscribes to real-time updates', async () => {
    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/events')) {
        return Promise.resolve({ events: mockLogs });
      }
      return Promise.resolve({ order: mockOrder });
    });

    render(
      <MemoryRouter initialEntries={['/track/order-1']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockSocketListener).toHaveBeenCalledWith(
        'order:status',
        expect.any(Function),
      );
    });
  });

  it('opens tracking link and call button', async () => {
    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/events')) {
        return Promise.resolve({ events: mockLogs });
      }
      return Promise.resolve({
        order: {
          ...mockOrder,
          status: 'shipped',
          del_type: 'courier',
          tracking_provider: 'FedEx',
          tracking_number: '12345',
        },
      });
    });

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MemoryRouter initialEntries={['/track/order-1']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/FedEx/i)).toBeInTheDocument());

    // FedEx button
    const buttons = screen.getAllByRole('button');
    const fedexButton = buttons.find(b =>
      b.querySelector('.lucide-external-link'),
    );
    if (fedexButton) fireEvent.click(fedexButton);
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('fedex.com'),
      '_blank',
    );

    // Now test call button
    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/events')) {
        return Promise.resolve({ events: mockLogs });
      }
      return Promise.resolve({
        order: {
          ...mockOrder,
          status: 'shipped',
          del_type: 'self_delivery',
          delivery_person_name: 'Ravi',
          delivery_person_phone: '9999999999',
        },
      });
    });

    render(
      <MemoryRouter initialEntries={['/track/order-1']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/Ravi/i)).toBeInTheDocument());
    const callButton = screen
      .getAllByRole('button')
      .find(b => b.querySelector('.lucide-phone'));
    if (callButton) fireEvent.click(callButton);
    expect(openSpy).toHaveBeenCalledWith('tel:9999999999', '_self');

    openSpy.mockRestore();
  });
});
