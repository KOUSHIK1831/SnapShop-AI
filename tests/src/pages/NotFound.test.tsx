import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import NotFound from '@/pages/NotFound';

describe('NotFound page', () => {
  it('renders the fallback page and logs the missing route', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/missing']}>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /return to home/i }),
    ).toHaveAttribute('href', '/');
    expect(spy).toHaveBeenCalledWith(
      '404 Error: User attempted to access non-existent route:',
      '/missing',
    );

    spy.mockRestore();
  });
});
