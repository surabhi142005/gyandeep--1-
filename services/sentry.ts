/**
 * services/sentry.ts
 * Sentry error tracking setup for the client
 */

import * as Sentry from '@sentry/browser';
import { browserProfilingIntegration } from '@sentry/profiling-web';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

let isInitialized = false;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Client error tracking disabled.');
    return false;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: APP_VERSION,
      integrations: [
        browserProfilingIntegration(),
        new Sentry.BrowserTracing({
          routingInstrumentation: Sentry.reactRouterV6Instrumentation,
          tracePropagationTargets: ['localhost', /^\//],
        }),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
          maskText: {
            selector: '.password-field, [data-sentry-mask]',
          },
        }),
      ],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      profilesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['X-API-Key'];
        }

        if (event.user) {
          delete event.user.ip_address;
        }

        return event;
      },
      ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'Network request failed',
        'Failed to fetch',
        'ChunkLoadError',
        'Loading CSS chunk',
      ],
      denyUrls: [
        /localhost/,
        /127\.0\.0\.1/,
        /\.hot-update\.json$/,
      ],
    });

    isInitialized = true;
    console.log('Client Sentry initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize client Sentry:', error);
    return false;
  }
}

export function captureException(error, context = {}) {
  if (!isInitialized) {
    console.error('[Sentry]', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' | 'log' = 'info', context = {}) {
  if (!isInitialized) {
    console.log(`[${level}] ${message}`, context);
    return;
  }
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

export function setUser(user: { id: string; email?: string; name?: string; role?: string } | null) {
  if (!isInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}

export function clearUser() {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category = 'app', data: Record<string, any> = {}) {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now(),
  });
}

export function setTag(key: string, value: string) {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
}

export function setContext(name: string, context: Record<string, any>) {
  if (!isInitialized) return;
  Sentry.setContext(name, context);
}

export function setExtra(key: string, value: any) {
  if (!isInitialized) return;
  Sentry.setExtra(key, value);
}

export function startTransaction(name: string, op: string = 'navigation') {
  if (!isInitialized) {
    return { startTimestamp: Date.now(), end: () => {} };
  }
  return Sentry.startTransaction({ name, op });
}

export function withErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  errorContext?: Record<string, any>
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error, errorContext);
          throw error;
        });
      }
      return result;
    } catch (error) {
      captureException(error as Error, errorContext);
      throw error;
    }
  }) as T;
}

export function wrapApiCall<T>(
  apiCall: () => Promise<T>,
  operation: string
): Promise<T> {
  return startTransaction(`API: ${operation}`, 'http.client').withAsyncScope(async () => {
    try {
      const result = await apiCall();
      addBreadcrumb(`API success: ${operation}`, 'api', { operation });
      return result;
    } catch (error) {
      captureException(error as Error, { operation, type: 'api_error' });
      throw error;
    }
  });
}

export { Sentry };
