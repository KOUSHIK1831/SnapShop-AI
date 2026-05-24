import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewCard from './ReviewCard';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockProduct = {
  title: 'Test Kurta',
  description: 'A nice kurta',
  price: 1000,
  category: 'Clothing',
  tags: ['kurta', 'ethnic'],
  size: 'L',
};

describe('ReviewCard', () => {
  it('renders product information correctly', () => {
    render(<ReviewCard product={mockProduct} imageUrl="test.jpg" index={0} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getAllByText('Test Kurta').length).toBeGreaterThan(0);
    expect(screen.getByText('₹1000')).toBeInTheDocument();
  });

  it('allows adding and editing size variants', () => {
    const onApprove = vi.fn();
    render(<ReviewCard product={mockProduct} imageUrl="test.jpg" index={0} onApprove={onApprove} onReject={() => {}} />);
    
    // Click edit
    fireEvent.click(screen.getByText(/Edit/i));
    
    // Click add size
    fireEvent.click(screen.getByText(/Add Size/i));
    
    // Find size and stock inputs
    const sizeInput = screen.getByPlaceholderText('Size (e.g. XL, 42)');
    const stockInput = screen.getByPlaceholderText('Stock');
    
    fireEvent.change(sizeInput, { target: { value: 'XL' } });
    fireEvent.change(stockInput, { target: { value: '15' } });
    
    // Save
    fireEvent.click(screen.getByText(/Save & Approve/i));
    
    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({
      size_variants: [{ size: 'XL', stock: 15 }]
    }));
  });
});
