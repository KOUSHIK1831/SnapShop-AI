import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import { Toaster } from '@/components/ui/sonner';

describe('Sonner Toaster', () => {
  it('renders without crashing', () => {
    const { container } = render(<Toaster />);
    expect(container.firstChild).toBeTruthy();
  });
});
