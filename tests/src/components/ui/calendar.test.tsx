import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Calendar month={new Date(2024, 0)} />);
    expect(container.querySelector('table')).toBeTruthy();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <Calendar month={new Date(2024, 0)} className="custom" />,
    );
    expect(container.firstChild).toHaveClass('custom');
  });
});
