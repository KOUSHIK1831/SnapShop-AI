import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InventoryEditor from '@/components/InventoryEditor';

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(<InventoryEditor products={mockProducts} onUpdate={vi.fn()} />);
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('renders empty state when no products', () => {
    render(<InventoryEditor products={[]} onUpdate={vi.fn()} />);
    expect(screen.getByText('dashboard.noProducts')).toBeInTheDocument();
  });

  it('filters products by search term', () => {
    const products = [
      ...mockProducts,
      {
        ...mockProducts[0],
        id: '2',
        title: 'Other Product',
        category: 'Other',
      },
    ];
    render(<InventoryEditor products={products} onUpdate={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('auto.search_products');
    fireEvent.change(searchInput, { target: { value: 'Other' } });

    expect(screen.getByText('Other Product')).toBeInTheDocument();
    expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
  });

  it('updates single product stock successfully', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    render(<InventoryEditor products={mockProducts} onUpdate={onUpdate} />);

    const stockInput = screen.getByDisplayValue('10');
    fireEvent.change(stockInput, { target: { value: '20' } });

    const saveButton = screen.getByTitle('auto.save_changes');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('1', {
        stock: 20,
        size_variants: [],
      });
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Inventory updated' }),
      );
    });
  });

  it('shows error for invalid stock', async () => {
    render(<InventoryEditor products={mockProducts} onUpdate={vi.fn()} />);

    const stockInput = screen.getByDisplayValue('10');
    fireEvent.change(stockInput, { target: { value: '-5' } });

    const saveButton = screen.getByTitle('auto.save_changes');
    fireEvent.click(saveButton);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Invalid stock value' }),
    );
  });

  it('handles size variants: add, edit, remove, save', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    const productWithVariants = {
      ...mockProducts[0],
      id: '2',
      size_variants: [{ size: 'M', stock: 5 }],
    };

    render(
      <InventoryEditor products={[productWithVariants]} onUpdate={onUpdate} />,
    );

    // Expand variants
    const expandBtn = screen.getByText(/1auto.sizes/i);
    fireEvent.click(expandBtn);

    // Add new variant
    const addBtn = screen.getByText('auto.add_size');
    fireEvent.click(addBtn);

    // Edit variants
    const sizeInputs = screen.getAllByPlaceholderText('auto.size');
    const stockInputs = screen.getAllByPlaceholderText('auto.stock');

    fireEvent.change(sizeInputs[1], { target: { value: 'L' } });
    fireEvent.change(stockInputs[1], { target: { value: '10' } });

    // Remove first variant
    const removeBtns = screen
      .getAllByRole('button')
      .filter(b => b.querySelector('svg.lucide-trash2'));
    fireEvent.click(removeBtns[0]);

    // Save
    const saveButton = screen.getByTitle('auto.save_changes');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('2', {
        size_variants: [{ size: 'L', stock: 10 }],
        stock: 10,
      });
    });
  });

  it('handles save all changes', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    const products = [
      mockProducts[0],
      { ...mockProducts[0], id: '2', title: 'Product 2' },
    ];
    render(<InventoryEditor products={products} onUpdate={onUpdate} />);

    const stockInputs = screen.getAllByDisplayValue('10');
    fireEvent.change(stockInputs[0], { target: { value: '15' } });
    fireEvent.change(stockInputs[1], { target: { value: '25' } });

    const saveAllBtn = screen.getByText('auto.save_all_changes');
    await act(async () => {
      fireEvent.click(saveAllBtn);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'All changes saved' }),
      );
    });
  });

  it('handles delete success', async () => {
    const onDelete = vi.fn().mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <InventoryEditor
        products={mockProducts}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const deleteButton = screen.getByTitle('product.delete');
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(onDelete).toHaveBeenCalledWith('1');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Product removed' }),
    );
  });

  it('handles delete error', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <InventoryEditor
        products={mockProducts}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const deleteButton = screen.getByTitle('product.delete');
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error removing product' }),
      );
    });
  });

  it('does not call onDelete when not confirmed', async () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <InventoryEditor
        products={mockProducts}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const deleteButton = screen.getByTitle('product.delete');
    fireEvent.click(deleteButton);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('does nothing when delete button clicked and onDelete prop is missing', async () => {
    render(<InventoryEditor products={mockProducts} onUpdate={vi.fn()} />);
    const deleteButton = screen.queryByTitle('product.delete');
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('handles save all when no changes made', async () => {
    const onUpdate = vi.fn();
    render(<InventoryEditor products={mockProducts} onUpdate={onUpdate} />);

    const stockInput = screen.getByDisplayValue('10');
    // Use a different value to ensure state updates and button shows
    await act(async () => {
      fireEvent.change(stockInput, { target: { value: '11' } });
    });

    const saveAllBtn = screen.getByText(/save_all_changes/i);
    expect(saveAllBtn).toBeInTheDocument();

    // Now set to invalid value to trigger empty productsToUpdate branch
    await act(async () => {
      fireEvent.change(stockInput, { target: { value: '-1' } });
    });

    fireEvent.click(saveAllBtn);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
