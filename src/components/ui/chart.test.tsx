import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { ChartStyle } from './chart';

describe('Chart', () => {
  const config = { value: { label: 'Value', color: '#000' } };

  it('ChartStyle renders style tag', () => {
    const { container } = render(<ChartStyle config={config} id="test" />);
    expect(container.querySelector('style')).toBeInTheDocument();
  });

  it('ChartStyle returns null without color or theme', () => {
    const { container } = render(<ChartStyle config={{ value: { label: 'Value' } }} id="test" />);
    expect(container.querySelector('style')).toBeNull();
  });
});
