import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AppTour from './AppTour';
import { useWelcomeTour } from '@/hooks/useWelcomeTour';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useWelcomeTour', () => ({
  useWelcomeTour: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('AppTour', () => {
  const startTour = vi.fn();
  const isTourCompleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useWelcomeTour).mockReturnValue({
      startTour,
      isTourCompleted,
    } as any);
  });

  it('starts tour for non-admin user when tour is not completed', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller' },
    } as any);
    isTourCompleted.mockReturnValue(false);

    render(<AppTour />);

    vi.advanceTimersByTime(1500);
    expect(startTour).toHaveBeenCalled();
  });

  it('does not start tour for admin user', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'admin' },
    } as any);
    isTourCompleted.mockReturnValue(false);

    render(<AppTour />);

    vi.advanceTimersByTime(1500);
    expect(startTour).not.toHaveBeenCalled();
  });

  it('does not start tour when tour is completed', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller' },
    } as any);
    isTourCompleted.mockReturnValue(true);

    render(<AppTour />);

    vi.advanceTimersByTime(1500);
    expect(startTour).not.toHaveBeenCalled();
  });

  it('does not start tour when no user', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as any);
    isTourCompleted.mockReturnValue(false);

    render(<AppTour />);

    vi.advanceTimersByTime(1500);
    expect(startTour).not.toHaveBeenCalled();
  });
});
