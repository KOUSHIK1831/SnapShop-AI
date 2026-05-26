import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ProductCard from '@/components/ProductCard';

const product = {
  id: 'prod-1',
  seller_id: 'seller-1',
  title: 'Linen Kurta',
  price: 999,
  description: 'Breathable everyday wear',
  category: 'Kurtas',
  tags: ['cotton', 'summer'],
  image_url: 'https://example.com/kurta.jpg',
  created_at: '2026-03-15T00:00:00.000Z',
};

function renderCard(
  overrides: Partial<ComponentProps<typeof ProductCard>> = {},
) {
  return render(<ProductCard product={product} editable {...overrides} />);
}

describe('ProductCard', () => {
  it('renders the product details', () => {
    renderCard();

    expect(screen.getByText('Linen Kurta')).toBeInTheDocument();
    expect(screen.getByText('₹999')).toBeInTheDocument();
    expect(screen.getByText('cotton')).toBeInTheDocument();
    expect(screen.getByText('Kurtas')).toBeInTheDocument();
  });

  it('submits edited fields through onUpdate', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    renderCard({ onUpdate });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, { target: { value: 'Festive Kurta' } });
    fireEvent.change(inputs[1]!, { target: { value: 'Refined cotton' } });

    const priceInput = screen.getByDisplayValue('999');
    fireEvent.change(priceInput, { target: { value: '1499' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('prod-1', {
        title: 'Festive Kurta',
        price: 1499,
        description: 'Refined cotton',
      });
    });
  });

  it('confirms deletion before calling onDelete', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderCard({ onDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('prod-1');

    confirmSpy.mockRestore();
  });

  it('cancels the edit mode without changes', () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const titleInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(titleInput!, { target: { value: 'Changed Title' } });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByDisplayValue('Changed Title')).not.toBeInTheDocument();
    expect(screen.getByText('Linen Kurta')).toBeInTheDocument();
  });
});
