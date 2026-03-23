/**
 * server/services/metrics.js
 * Prometheus metrics collection for the server
 */

import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1],
});
register.registerMetric(httpRequestDuration);

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestTotal);

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
});
register.registerMetric(activeConnections);

export const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});
register.registerMetric(dbOperationDuration);

export const quizAttempts = new client.Counter({
  name: 'quiz_attempts_total',
  help: 'Total number of quiz attempts',
  labelNames: ['quiz_id', 'status'],
});
register.registerMetric(quizAttempts);

export const attendanceMarked = new client.Counter({
  name: 'attendance_marked_total',
  help: 'Total number of attendance marks',
  labelNames: ['status'],
});
register.registerMetric(attendanceMarked);

export const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['method', 'status'],
});
register.registerMetric(authAttempts);

export const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['result'],
});
register.registerMetric(cacheHits);

export const fileUploads = new client.Counter({
  name: 'file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['status'],
});
register.registerMetric(fileUploads);

export const aiApiCalls = new client.Counter({
  name: 'ai_api_calls_total',
  help: 'Total number of AI API calls',
  labelNames: ['provider', 'status'],
});
register.registerMetric(aiApiCalls);

export const wsConnections = new client.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
});
register.registerMetric(wsConnections);

export const sessionActive = new client.Gauge({
  name: 'active_sessions',
  help: 'Number of active class sessions',
});
register.registerMetric(sessionActive);

export const errorCount = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
});
register.registerMetric(errorCount);

export function getMetrics() {
  return register.metrics();
}

export function getContentType() {
  return register.contentType;
}

export function recordRequest(method, route, statusCode, duration) {
  httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  httpRequestTotal.inc({ method, route, status_code: statusCode });
}

export function recordDbOperation(operation, collection, duration) {
  dbOperationDuration.observe({ operation, collection }, duration);
}

export function recordError(type, severity = 'medium') {
  errorCount.inc({ type, severity });
}

export function incrementCacheHit(hit) {
  cacheHits.inc({ result: hit ? 'hit' : 'miss' });
}

export function updateActiveConnections(type, count) {
  activeConnections.set({ type }, count);
}

export { register };
