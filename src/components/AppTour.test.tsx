import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useWelcomeTour', () => ({
  useWelcomeTour: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useWelcomeTour } from '@/hooks/useWelcomeTour';
import AppTour from './AppTour';

describe('AppTour', () => {
  it('starts tour for seller when not completed', () => {
    const startTour = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller' },
    } as any);
    vi.mocked(useWelcomeTour).mockReturnValue({
      startTour,
      isTourCompleted: () => false,
    } as any);

    vi.useFakeTimers();
    render(<AppTour />);
    vi.advanceTimersByTime(2000);
    expect(startTour).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not start tour for admin users', () => {
    const startTour = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'admin' },
    } as any);
    vi.mocked(useWelcomeTour).mockReturnValue({
      startTour,
      isTourCompleted: () => false,
    } as any);

    vi.useFakeTimers();
    render(<AppTour />);
    vi.advanceTimersByTime(2000);
    expect(startTour).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not start tour when already completed', () => {
    const startTour = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', role: 'seller' },
    } as any);
    vi.mocked(useWelcomeTour).mockReturnValue({
      startTour,
      isTourCompleted: () => true,
    } as any);

    vi.useFakeTimers();
    render(<AppTour />);
    vi.advanceTimersByTime(2000);
    expect(startTour).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not start tour when there is no user', () => {
    const startTour = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as any);
    vi.mocked(useWelcomeTour).mockReturnValue({
      startTour,
      isTourCompleted: () => false,
    } as any);

    vi.useFakeTimers();
    render(<AppTour />);
    vi.advanceTimersByTime(2000);
    expect(startTour).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
