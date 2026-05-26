import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Orders from '@/components/Orders';
import { Order } from '@/hooks/useSeller';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const baseOrder: Order = {
  id: 'order1',
  product_id: 'p1',
  buyer_id: 'b1',
  seller_id: 's1',
  status: 'pending',
  quantity: 1,
  pay_method: 'cod',
  pay_status: 'pending',
  total_price: 100,
  created_at: new Date().toISOString(),
  product: {
    id: 'p1',
    title: 'Test Product',
    price: 100,
    image_url: 'http://test.com/image.jpg',
    category: 'test',
  },
};

describe('Orders Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order list and details correctly', () => {
    const order = {
      ...baseOrder,
      buyer_name: 'Test Buyer',
      buyer_phone: '1234567890',
    } as Order;
    render(<Orders orders={[order]} onUpdateStatus={vi.fn()} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Buyer')).toBeInTheDocument();
  });

  it('handles status update', async () => {
    const mockOnUpdateStatus = vi.fn().mockResolvedValue({ error: null });
    render(<Orders orders={[baseOrder]} onUpdateStatus={mockOnUpdateStatus} />);

    // Use the translation key in the matcher
    const confirmBtn = screen.getByText('auto.start_preparing');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnUpdateStatus).toHaveBeenCalled();
    });
  });

  it('opens shipping dialog and confirms shipping', async () => {
    const mockOnUpdateStatus = vi.fn().mockResolvedValue({ error: null });
    const order = { ...baseOrder, status: 'accepted' } as Order;

    render(<Orders orders={[order]} onUpdateStatus={mockOnUpdateStatus} />);

    // Ship button translation key
    const shipBtn = screen.getByText('auto.ship_order');
    fireEvent.click(shipBtn);

    // Dialog should open
    expect(screen.getByText(/auto.shipping_information/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('auto.fedex_delhivery_etc'), {
      target: { value: 'FedEx' },
    });
    fireEvent.change(screen.getByPlaceholderText('auto.trk123456789'), {
      target: { value: '987654321' },
    });

    // Submit button in dialog
    fireEvent.click(screen.getByText('auto.confirm_ship'));

    await waitFor(() => {
      expect(mockOnUpdateStatus).toHaveBeenCalled();
    });
  });
});
