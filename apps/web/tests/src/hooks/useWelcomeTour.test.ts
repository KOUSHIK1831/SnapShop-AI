import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useWelcomeTour } from '@/hooks/useWelcomeTour';
import { driver } from 'driver.js';

vi.mock('driver.js', () => ({
  driver: vi.fn().mockReturnValue({
    drive: vi.fn(),
  }),
}));

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: useAuthMock,
}));

describe('useWelcomeTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    useAuthMock.mockReturnValue({ user: { role: 'seller' } });
  });

  it('checks if tour is completed', () => {
    const { result } = renderHook(() => useWelcomeTour());
    expect(result.current.isTourCompleted()).toBe(false);

    localStorage.setItem('apnabazar-tour-completed', 'true');
    expect(result.current.isTourCompleted()).toBe(true);
  });

  it('starts the tour for sellers', () => {
    const setActiveTab = vi.fn();
    const { result } = renderHook(() => useWelcomeTour(setActiveTab));

    act(() => {
      result.current.startTour();
    });

    expect(driver).toHaveBeenCalled();
    const driverConfig = vi.mocked(driver).mock.calls[0][0];
    expect(driverConfig?.steps).toHaveLength(6);

    // Test onHighlighted callbacks
    driverConfig?.steps?.[1].onHighlighted?.({} as any, {} as any, {} as any);
    expect(setActiveTab).toHaveBeenCalledWith('products');

    driverConfig?.steps?.[2].onHighlighted?.({} as any, {} as any, {} as any);
    expect(setActiveTab).toHaveBeenCalledWith('tools');

    driverConfig?.steps?.[3].onHighlighted?.({} as any, {} as any, {} as any);
    expect(setActiveTab).toHaveBeenCalledWith('profile');

    // Test onDestroyed
    driverConfig?.onDestroyed?.({} as any, {} as any, {} as any);
    expect(localStorage.getItem('apnabazar-tour-completed')).toBe('true');

    // Fast forward to see if drive() is called
    act(() => {
      vi.runAllTimers();
    });
    const driverInstance = vi.mocked(driver).mock.results[0].value;
    expect(driverInstance.drive).toHaveBeenCalled();
  });

  it('does not start the tour for admins', () => {
    useAuthMock.mockReturnValue({ user: { role: 'admin' } });
    const { result } = renderHook(() => useWelcomeTour());

    act(() => {
      result.current.startTour();
    });

    expect(driver).not.toHaveBeenCalled();
  });
});
