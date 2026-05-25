import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

import ErrorBoundary from './ErrorBoundary';

const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('auto.something_went_wrong')).toBeInTheDocument();
    expect(screen.getByText('auto.we_encountered_an_unexpected_e')).toBeInTheDocument();
    expect(screen.getByText('auto.refresh_application')).toBeInTheDocument();
  });

  it('calls window.location.reload on reset', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('auto.refresh_application'));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('shows error details in development mode', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError message="dev error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/dev error message/)).toBeInTheDocument();

    process.env.NODE_ENV = origEnv;
  });

  it('hides error details in production mode', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError message="hidden message" />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/hidden message/)).not.toBeInTheDocument();

    process.env.NODE_ENV = origEnv;
  });
});
