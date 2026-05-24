import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OrderConfirmation from './OrderConfirmation';

describe('OrderConfirmation', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <OrderConfirmation
        isOpen={false}
        onClose={vi.fn()}
        productTitle="Kurta"
        productPrice={999}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders order details and allows flow to completion', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <OrderConfirmation
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        productTitle="Kurta"
        productPrice={999}
        sellerName="Apna Seller"
        sellerContact="+91 9999999999"
      />,
    );

    // Step 1: Address
    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: 'Buyer' },
    });
    fireEvent.change(screen.getByPlaceholderText(/mobile number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText(/house no/i), {
      target: { value: 'Street 1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/city/i), {
      target: { value: 'Mumbai' },
    });
    fireEvent.change(screen.getByPlaceholderText(/state/i), {
      target: { value: 'MH' },
    });
    fireEvent.change(screen.getByPlaceholderText(/pincode/i), {
      target: { value: '400001' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /proceed to payment/i }),
    );

    // Step 2: Payment
    expect(await screen.findByText(/payment method/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm order/i }));

    // Step 3: Success (Wait for it)
    expect(await screen.findByText(/order placed/i)).toBeInTheDocument();
    expect(screen.getByText('Kurta')).toBeInTheDocument();
    expect(screen.getByText('₹999')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue shopping/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
