/**
 * services/csrfService.ts
 * CSRF token management for API requests
 */

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_TIMEOUT = 10000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
}

/** CSRF token state */
let csrfToken: string | null = null;
let csrfSignature: string | null = null;
let csrfTokenExpiry: number = 0;

const CSRF_TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes (tokens expire in 1 hour)

export async function fetchCSRFToken(): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/csrf-token`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) {
      csrfToken = data.token;
      csrfSignature = data.signature || null;
      csrfTokenExpiry = Date.now() + CSRF_TOKEN_REFRESH_INTERVAL;
      return csrfToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCSRFToken(): Promise<string | null> {
  if (csrfToken && Date.now() < csrfTokenExpiry) {
    return csrfToken;
  }
  return fetchCSRFToken();
}

export function getCSRFHeaders(): Record<string, string> {
  if (!csrfToken || Date.now() >= csrfTokenExpiry) {
    console.warn('[CSRF] Token missing or expired - request may fail');
  }
  return {
    'X-CSRF-Token': csrfToken || '',
    'X-CSRF-Signature': csrfSignature || '',
  };
}

export function clearCSRFToken(): void {
  csrfToken = null;
  csrfSignature = null;
  csrfTokenExpiry = 0;
}

export function initCSRFToken(): void {
  fetchCSRFToken().catch(console.error);
}

export default {
  fetchCSRFToken,
  getCSRFToken,
  getCSRFHeaders,
  clearCSRFToken,
  initCSRFToken,
};
