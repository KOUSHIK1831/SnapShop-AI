import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import InventoryEditor from './InventoryEditor';
import { Toaster } from '@/components/ui/toaster';

const mockProducts = [
  {
    id: '1',
    seller_id: 'seller1',
    title: 'Product 1',
    description: 'Description 1',
    price: 100,
    category: 'Category 1',
    tags: ['tag1'],
    image_url: 'http://example.com/image1.jpg',
    stock: 10,
    low_stock_threshold: 5,
    created_at: new Date().toISOString(),
  },
];

describe('InventoryEditor', () => {
  it('renders product information correctly', () => {
    render(
      <InventoryEditor products={mockProducts} onUpdate={vi.fn()} />
    );

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const onDelete = vi.fn().mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <InventoryEditor products={mockProducts} onUpdate={vi.fn()} onDelete={onDelete} />
    );

    const deleteButton = screen.getByTitle('Delete');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('does not call onDelete when delete button is clicked but not confirmed', async () => {
    const onDelete = vi.fn().mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <InventoryEditor products={mockProducts} onUpdate={vi.fn()} onDelete={onDelete} />
    );

    const deleteButton = screen.getByTitle('Delete');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
