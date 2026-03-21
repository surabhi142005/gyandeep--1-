/**
 * server/services/sentry.js
 * Sentry error tracking setup for the server
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RELEASE = process.env.npm_package_version || '1.0.0';

let isInitialized = false;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return false;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: NODE_ENV,
      release: RELEASE,
      integrations: [
        nodeProfilingIntegration(),
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express(),
        new Sentry.Integrations.Mongo(),
      ],
      tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
      ignoreErrors: [
        'Unauthorized',
        'Not Found',
        'ValidationError',
        'AbortError',
      ],
    });

    isInitialized = true;
    console.log('Sentry initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    return false;
  }
}

export function setupSentryErrorHandlers(app) {
  if (!isInitialized) return;

  app.use(Sentry.Handlers.requestHandler({
    serverName: false,
    user: ['id', 'email', 'role'],
  }));

  app.use(Sentry.Handlers.tracingHandler());

  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      if (error.status === 404 || error.status === 401) {
        return false;
      }
      return true;
    },
  }));
}

export function captureException(error, context = {}) {
  if (!isInitialized) {
    console.error('Sentry not initialized:', error);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message, level = 'info', context = {}) {
  if (!isInitialized) {
    console.log(`[${level}] ${message}`, context);
    return;
  }
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

export function setUser(user) {
  if (!isInitialized) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });
}

export function clearUser() {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

export function addBreadcrumb(message, category = 'app', data = {}) {
  if (!isInitialized) return;
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now(),
  });
}

export function setTag(key, value) {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
}

export function setContext(name, context) {
  if (!isInitialized) return;
  Sentry.setContext(name, context);
}

export function getSentryHub() {
  return Sentry.getHubFromExtension();
}

export { Sentry };
