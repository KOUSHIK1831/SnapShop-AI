import { describe, expect, it, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';
import { initAnalytics, trackEvent } from './analytics';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
  },
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // We can't easily reset the 'initialized' variable in analytics.ts 
    // without re-importing the module or adding a reset function.
    // Let's use vi.resetModules() to be sure.
    vi.resetModules();
  });

  it('does not initialize if POSTHOG_KEY is missing', async () => {
    Object.assign(import.meta.env, { VITE_POSTHOG_KEY: '' });
    const { initAnalytics } = await import('./analytics');
    initAnalytics();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('initializes if POSTHOG_KEY is present', async () => {
    Object.assign(import.meta.env, { VITE_POSTHOG_KEY: 'test-key' });
    const { initAnalytics } = await import('./analytics');
    
    // To test the 'loaded' callback, we need to capture it from the call
    let loadedCallback: any;
    vi.mocked(posthog.init).mockImplementation((key, config) => {
      loadedCallback = config?.loaded;
    });

    initAnalytics();
    
    expect(posthog.init).toHaveBeenCalledWith('test-key', expect.any(Object));
    
    // Simulate posthog loaded
    if (loadedCallback) loadedCallback();
  });

  it('tracks events after initialization', async () => {
    Object.assign(import.meta.env, { VITE_POSTHOG_KEY: 'test-key' });
    const { initAnalytics, trackEvent } = await import('./analytics');
    
    vi.mocked(posthog.init).mockImplementation((key, config) => {
      config?.loaded?.();
    });

    initAnalytics();
    trackEvent('test-event', { prop: 'val' });
    
    expect(posthog.capture).toHaveBeenCalledWith('test-event', { prop: 'val' });
  });

  it('does not track events before initialization', async () => {
    const { trackEvent } = await import('./analytics');
    trackEvent('test-event');
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('handles posthog.init error gracefully', async () => {
    Object.assign(import.meta.env, { VITE_POSTHOG_KEY: 'test-key' });
    const { initAnalytics } = await import('./analytics');
    
    vi.mocked(posthog.init).mockImplementation(() => {
      throw new Error('Init error');
    });

    expect(() => initAnalytics()).not.toThrow();
  });

  it('handles posthog.capture error gracefully', async () => {
    Object.assign(import.meta.env, { VITE_POSTHOG_KEY: 'test-key' });
    const { initAnalytics, trackEvent } = await import('./analytics');
    
    vi.mocked(posthog.init).mockImplementation((key, config) => {
      config?.loaded?.();
    });
    vi.mocked(posthog.capture).mockImplementation(() => {
      throw new Error('Capture error');
    });

    initAnalytics();
    expect(() => trackEvent('test-event')).not.toThrow();
  });
});
