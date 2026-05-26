import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TrackOrder from '@/pages/TrackOrder';
import { supabase } from '@/integrations/supabase/client';
import en from '@/locales/en/translation.json';

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

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
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
    const fromMock = vi.mocked(supabase.from);

    fromMock.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
        } as any;
      }
      if (table === 'order_tracking_logs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
        } as any;
      }
      return {} as any;
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
    const fromMock = vi.mocked(supabase.from);

    fromMock.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

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
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...mockOrder, status: 'cancelled' },
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
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
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockOrder,
              del_type: 'self_delivery',
              delivery_person_name: 'Ravi',
              delivery_person_phone: '9999999999',
            },
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
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
      // In TrackOrder.tsx, phone is only in the call button, not as text
    });
  });

  it('subscribes to real-time updates', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    render(
      <MemoryRouter initialEntries={['/track/order-1']}>
        <Routes>
          <Route path="/track/:orderId" element={<TrackOrder />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(supabase.channel).toHaveBeenCalled());
  });

  it('opens tracking link and call button', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockOrder,
              status: 'shipped',
              del_type: 'courier',
              tracking_provider: 'FedEx',
              tracking_number: '12345',
            },
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
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
    fromMock.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockOrder,
              status: 'shipped',
              del_type: 'self_delivery',
              delivery_person_name: 'Ravi',
              delivery_person_phone: '9999999999',
            },
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
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
