import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
const SENTRY_ENV = import.meta.env.VITE_SENTRY_ENV || 'development';

let initialized = false;

export function initSentry() {
  if (initialized || !SENTRY_DSN) return;
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENV,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: SENTRY_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: SENTRY_ENV === 'production' ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
    });
    initialized = true;
  } catch {
    // Sentry unavailable — silently ignore
  }
}

export function setSentryUser(
  user: { id: string; email?: string; role?: string } | null,
) {
  if (!initialized) return;
  try {
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email, role: user.role });
    } else {
      Sentry.setUser(null);
    }
  } catch {
    // Silently ignore
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!initialized) {
    console.error('[Sentry not initialized]', error, context);
    return;
  }
  try {
    Sentry.captureException(error, { extra: context });
  } catch {
    // Silently ignore
  }
}

export { Sentry };
