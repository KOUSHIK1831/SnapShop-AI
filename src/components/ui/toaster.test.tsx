import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toasts: [
      { id: '1', title: 'Test Title', description: 'Test Description' },
    ],
  }),
}));

import { Toaster } from './toaster';

describe('Toaster', () => {
  it('renders toasts from useToast', () => {
    render(<Toaster />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders close buttons for toasts', () => {
    render(<Toaster />);
    const closeButtons = document.querySelectorAll('button');
    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
