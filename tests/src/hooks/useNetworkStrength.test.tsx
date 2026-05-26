import { render, renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  NetworkProvider,
  useNetworkStrength,
} from '@/hooks/useNetworkStrength';
import SpeedTest from '@cloudflare/speedtest';
import React from 'react';

let instances: any[] = [];

vi.mock('@cloudflare/speedtest', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any) {
      this.play = vi.fn();
      this.pause = vi.fn();
      this.results = {
        getSummary: vi.fn().mockReturnValue({ download: 30000000 }),
        getDownloadBandwidth: vi.fn().mockReturnValue(30000000),
      };
      this.onResultsChange = null;
      this.onFinish = null;
      this.onError = null;
      instances.push(this);
      return this;
    }),
  };
});

describe('useNetworkStrength', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    instances = [];
    // Ensure navigator.onLine is true by default for tests
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides network info and runs speed test', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkProvider>{children}</NetworkProvider>
    );
    const { result } = renderHook(() => useNetworkStrength(), { wrapper });

    expect(result.current.status).toBe('unknown');
    expect(instances.length).toBe(1);

    const testInstance = instances[0];
    testInstance.results.getSummary.mockReturnValue({ download: 25000000 });

    // Simulate test finish
    await act(async () => {
      if (testInstance.onFinish) testInstance.onFinish();
    });

    expect(result.current.status).toBe('fast');
    expect(result.current.downloadMbps).toBe(25);
  });

  it('handles offline status', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkProvider>{children}</NetworkProvider>
    );
    const { result } = renderHook(() => useNetworkStrength(), { wrapper });

    expect(result.current.status).toBe('offline');
    expect(result.current.connected).toBe(false);
  });

  it('handles speed test error', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkProvider>{children}</NetworkProvider>
    );
    const { result } = renderHook(() => useNetworkStrength(), { wrapper });

    expect(instances.length).toBe(1);
    const testInstance = instances[0];
    await act(async () => {
      if (testInstance.onError) testInstance.onError();
    });

    expect(result.current.status).toBe('unknown');
  });

  it('handles speed test timeout', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkProvider>{children}</NetworkProvider>
    );
    const { result } = renderHook(() => useNetworkStrength(), { wrapper });

    expect(instances.length).toBe(1);
    const testInstance = instances[0];

    // Fast forward to timeout
    act(() => {
      vi.advanceTimersByTime(10000 + 100);
    });

    expect(testInstance.pause).toHaveBeenCalled();
    expect(result.current.status).toBe('unknown');
  });

  it('handles online/offline events', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkProvider>{children}</NetworkProvider>
    );
    const { result } = renderHook(() => useNetworkStrength(), { wrapper });

    expect(instances.length).toBe(1);

    await act(async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.status).toBe('offline');

    await act(async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(instances.length).toBe(2); // Restarted
  });

  it('handles onResultsChange during test', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkProvider>{children}</NetworkProvider>
    );
    const { result } = renderHook(() => useNetworkStrength(), { wrapper });

    expect(instances.length).toBe(1);
    const testInstance = instances[0];
    testInstance.results.getSummary.mockReturnValue({ download: 8000000 });

    await act(async () => {
      if (testInstance.onResultsChange) testInstance.onResultsChange();
    });

    expect(result.current.status).toBe('medium');
  });

  it('handles play error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(SpeedTest).mockImplementationOnce(function (this: any) {
      this.play = () => {
        throw new Error('Play error');
      };
      this.pause = vi.fn();
      this.results = { getSummary: vi.fn().mockReturnValue({}) };
      instances.push(this);
      return this;
    });

    render(
      <NetworkProvider>
        <div>Test</div>
      </NetworkProvider>,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Speed test failed:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('classifies different speeds correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkProvider>{children}</NetworkProvider>
    );
    const { result } = renderHook(() => useNetworkStrength(), { wrapper });

    // Test fast
    let testInstance = instances[0];
    testInstance.results.getSummary.mockReturnValue({ download: 25000000 });
    await act(async () => {
      if (testInstance.onFinish) testInstance.onFinish();
    });
    expect(result.current.status).toBe('fast');

    // Test medium
    act(() => {
      vi.advanceTimersByTime(16000);
    }); // POLL_MS
    testInstance = instances[1];
    testInstance.results.getSummary.mockReturnValue({ download: 8000000 });
    await act(async () => {
      if (testInstance.onFinish) testInstance.onFinish();
    });
    expect(result.current.status).toBe('medium');

    // Test slow
    act(() => {
      vi.advanceTimersByTime(16000);
    });
    testInstance = instances[2];
    testInstance.results.getSummary.mockReturnValue({ download: 1000000 });
    await act(async () => {
      if (testInstance.onFinish) testInstance.onFinish();
    });
    expect(result.current.status).toBe('slow');

    // Test unknown
    act(() => {
      vi.advanceTimersByTime(16000);
    });
    testInstance = instances[3];
    testInstance.results.getSummary.mockReturnValue({ download: null });
    testInstance.results.getDownloadBandwidth.mockReturnValue(null);
    await act(async () => {
      if (testInstance.onFinish) testInstance.onFinish();
    });
    expect(result.current.status).toBe('unknown');
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(
      <NetworkProvider>
        <div>Test</div>
      </NetworkProvider>,
    );

    const testInstance = instances[0];
    unmount();

    expect(testInstance.pause).toHaveBeenCalled();
  });
});
