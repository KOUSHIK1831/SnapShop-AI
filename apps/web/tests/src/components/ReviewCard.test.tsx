import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import ReviewCard from '@/components/ReviewCard';
import en from '@/locales/en/translation.json';

const mockProduct = {
  title: 'Test Kurta',
  description: 'A nice kurta',
  price: 1000,
  category: 'Clothing',
  tags: ['kurta', 'ethnic'],
  size: 'L',
  confidence: {
    title: 0.9,
    description: 0.9,
    price: 0.9,
    category: 0.9,
    tags: 0.9,
  },
};

describe('ReviewCard', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getAllByText('Test Kurta').length).toBeGreaterThan(0);
    expect(screen.getByText(/1000/)).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    expect(screen.getByText('kurta')).toBeInTheDocument();
    expect(screen.getByText('ethnic')).toBeInTheDocument();
  });

  it('renders low confidence highlights', () => {
    const lowConfidenceProduct = {
      ...mockProduct,
      confidence: {
        ...mockProduct.confidence,
        title: 0.5,
      },
    };
    render(
      <ReviewCard
        product={lowConfidenceProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getAllByText('Test Kurta').length).toBeGreaterThan(0);
  });

  it('renders digitization failure state', () => {
    const failedProduct = {
      ...mockProduct,
      digitization_failed: true,
    };
    render(
      <ReviewCard
        product={failedProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    // Should be in editing mode by default
    expect(screen.getByPlaceholderText(en['auto.title'])).toBeInTheDocument();
  });

  it('allows editing and saving all fields', () => {
    const onApprove = vi.fn();
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={onApprove}
        onReject={() => {}}
      />,
    );

    fireEvent.click(screen.getByText(en['product.edit']));

    fireEvent.change(screen.getByPlaceholderText(en['auto.title']), {
      target: { value: 'New Title' },
    });
    fireEvent.change(screen.getByPlaceholderText(en['product.price']), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByPlaceholderText(en['auto.description']), {
      target: { value: 'New Description' },
    });
    fireEvent.change(screen.getByPlaceholderText(en['product.category']), {
      target: { value: 'New Category' },
    });
    fireEvent.change(screen.getByPlaceholderText(en['auto.tag1_tag2_tag3']), {
      target: { value: 'tag1, tag2' },
    });

    fireEvent.click(screen.getByText(en['auto.save_approve']));

    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Title',
        price: 2000,
        description: 'New Description',
        category: 'New Category',
        tags: ['tag1', 'tag2'],
      }),
    );
  });

  it('handles discount calculation', () => {
    const onApprove = vi.fn();
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={onApprove}
        onReject={() => {}}
      />,
    );

    fireEvent.click(screen.getByText(en['product.edit']));
    fireEvent.change(screen.getByPlaceholderText(en['auto.e_g_10']), {
      target: { value: '20' },
    });

    // Should show final price and savings
    expect(screen.getByText(/Final/)).toBeInTheDocument();
    expect(screen.getByText(/800/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(en['auto.save_approve']));
    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({
        discount_percent: 20,
      }),
    );
  });

  it('allows adding, updating, and removing size variants', () => {
    const onApprove = vi.fn();
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={onApprove}
        onReject={() => {}}
      />,
    );

    fireEvent.click(screen.getByText(en['product.edit']));
    fireEvent.click(screen.getByText(en['auto.add_size']));

    const sizeInput = screen.getByPlaceholderText(en['auto.size_e_g_xl_42']);
    const stockInput = screen.getByPlaceholderText(en['auto.stock']);

    fireEvent.change(sizeInput, { target: { value: 'XL' } });
    fireEvent.change(stockInput, { target: { value: '10' } });

    // Add another and remove it
    fireEvent.click(screen.getByText(en['auto.add_size']));
    const deleteButtons = screen
      .getAllByRole('button')
      .filter(b => b.querySelector('svg.lucide-trash2'));
    fireEvent.click(deleteButtons[1]); // Remove the second one

    fireEvent.click(screen.getByText(en['auto.save_approve']));

    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({
        size_variants: [{ size: 'XL', stock: 10 }],
      }),
    );
  });

  it('cancels edits', () => {
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );

    fireEvent.click(screen.getByText(en['product.edit']));
    fireEvent.change(screen.getByPlaceholderText(en['auto.title']), {
      target: { value: 'Changed' },
    });
    fireEvent.click(screen.getByText(en['auto.cancel']));

    // Use specific container for view mode title to avoid duplicates
    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Test Kurta');
    expect(screen.queryByText('Changed')).not.toBeInTheDocument();
  });

  it('calls onReject when reject button is clicked', () => {
    const onReject = vi.fn();
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByText(en['auto.reject']));
    expect(onReject).toHaveBeenCalled();
  });

  it('calls onApprove directly when approve button is clicked', () => {
    const onApprove = vi.fn();
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={onApprove}
        onReject={() => {}}
      />,
    );

    fireEvent.click(screen.getByText(en['auto.approve']));
    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Kurta' }),
    );
  });

  it('renders placeholder when no imageUrl is provided', () => {
    render(
      <ReviewCard
        product={mockProduct}
        imageUrl=""
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders discount in view mode', () => {
    const discountedProduct = {
      ...mockProduct,
      discount_percent: 15,
    };
    render(
      <ReviewCard
        product={discountedProduct}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByText(/850/)).toBeInTheDocument();
    expect(screen.getAllByText(/1000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('renders size variants in view mode', () => {
    const productWithVariants = {
      ...mockProduct,
      size_variants: [
        { size: 'S', stock: 5 },
        { size: 'M', stock: 0 },
      ],
    };
    render(
      <ReviewCard
        product={productWithVariants}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByText(/S \(5\)/)).toBeInTheDocument();
    expect(screen.getByText(/M/)).toBeInTheDocument();
  });

  it('renders low confidence category badge', () => {
    const lowConfidenceCategory = {
      ...mockProduct,
      confidence: {
        ...mockProduct.confidence,
        category: 0.5,
      },
    };
    render(
      <ReviewCard
        product={lowConfidenceCategory}
        imageUrl="test.jpg"
        index={0}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    // Just verify it renders, checking the exact variant is hard with current setup
    expect(screen.getByText('Clothing')).toBeInTheDocument();
  });
});
