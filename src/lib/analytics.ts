import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY) return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      loaded: () => {
        initialized = true;
      },
    });
  } catch {
    // Analytics unavailable — silently ignore
  }
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!initialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Silently ignore
  }
}
