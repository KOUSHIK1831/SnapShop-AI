import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

describe('ToggleGroup', () => {
  it('renders toggle group items', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders with multiple type', () => {
    render(
      <ToggleGroup type="multiple">
        <ToggleGroupItem value="x">X</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
