import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import OrderConfirmation from '@/components/OrderConfirmation';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: 'http://test.com/proof.jpg' },
        }),
      }),
    },
  },
}));

describe('OrderConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes the order flow', async () => {
    const onConfirm = vi.fn();
    render(
      <OrderConfirmation
        isOpen
        onClose={vi.fn()}
        productTitle="Kurta"
        productPrice={999}
        sellerName="Ravi Boutique"
        sellerContact="9999999999"
        onConfirm={onConfirm}
      />,
    );

    // Use getAllByText for Kurta and take the first one
    expect(screen.getAllByText('Kurta').length).toBeGreaterThanOrEqual(1);

    // Fill address
    fireEvent.change(screen.getByPlaceholderText('auto.enter_your_full_name'), {
      target: { value: 'Test Buyer' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('auto.10_digit_mobile_number'),
      { target: { value: '1234567890' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText('auto.house_no_street_area_landmar'),
      { target: { value: '123 Street' } },
    );
    fireEvent.change(screen.getByPlaceholderText('auto.city'), {
      target: { value: 'City' },
    });
    fireEvent.change(screen.getByPlaceholderText('auto.state'), {
      target: { value: 'State' },
    });
    fireEvent.change(screen.getByPlaceholderText('auto.6_digit_pincode'), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByText(/auto.proceed_to_payment/i));

    // Wait for payment step
    expect(await screen.findByText('auto.payment_method')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/auto.confirm_order/i));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });
});
