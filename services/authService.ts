/**
 * services/authService.ts
 *
 * Auth with httpOnly cookies. Tokens are stored server-side in secure cookies.
 * Client manages session state without storing tokens directly.
 * Face recognition proxies to /api/auth/face (Python service on :5001).
 */

import { calculateDistance } from './locationService';
import { initCSRFToken, getCSRFHeaders } from './csrfService';
import type { Coordinates } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
}

let authState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
};

const authListeners: Set<(state: AuthState) => void> = new Set();

function notifyListeners() {
  authListeners.forEach(listener => listener({ ...authState }));
}

export function subscribeAuth(callback: (state: AuthState) => void): () => void {
  authListeners.add(callback);
  callback({ ...authState });
  return () => authListeners.delete(callback);
}

function updateAuthState(updates: Partial<AuthState>) {
  authState = { ...authState, ...updates };
  notifyListeners();
}

export function getAuthState(): AuthState {
  return { ...authState };
}

// ── Token management (for SSE/WebSocket) ──────────────────────────────────────
// Tokens still needed for EventSource/Socket authentication, but stored differently

export async function getAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
    });
    if (res.ok) {
      return 'cookie-auth';
    }
    return null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  // Returns null - actual tokens are in httpOnly cookies
  // For realtime, use getRealtimeToken() which fetches socket-token
  return null;
}

export async function getRealtimeToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/socket-token`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token || null;
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  return null;
}

// ── Token refresh (automatic with cookies) ────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        logout();
        return false;
      }

      const data = await res.json();
      if (data.user) {
        updateAuthState({ user: data.user, isAuthenticated: true });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureValidToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
    });

    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      return refreshed;
    }

    return res.ok;
  } catch {
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function register(email: string, password: string, name: string, role = 'student') {
  updateAuthState({ isLoading: true });

  const csrfHeaders = await getCSRFHeaders();

  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    body: JSON.stringify({ email, password, name, role }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    updateAuthState({ isLoading: false });
    throw new Error(err.error || 'Registration failed');
  }

  const data = await res.json();
  updateAuthState({
    user: data.user,
    isAuthenticated: true,
    isLoading: false,
  });
  initCSRFToken();
  return data.user;
}

export async function login(email: string, password: string) {
  updateAuthState({ isLoading: true });

  const csrfHeaders = await getCSRFHeaders();

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    updateAuthState({ isLoading: false });
    throw new Error(err.error || 'Invalid credentials');
  }

  const data = await res.json();
  updateAuthState({
    user: data.user,
    isAuthenticated: true,
    isLoading: false,
  });
  initCSRFToken();
  return data.user;
}

export async function loginWithGoogle() {
  window.location.href = `${API_BASE}/auth/google`;
  return null;
}

export async function logout() {
  try {
    const csrfHeaders = await getCSRFHeaders();
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders,
      },
    });
  } catch (err) {
    console.warn('Logout request failed', err);
  }

  updateAuthState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });
}

export async function getCurrentUser() {
  if (authState.user && authState.isAuthenticated) {
    return authState.user;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
    });

    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return authState.user;
      }
      return null;
    }

    if (!res.ok) return null;

    const user = await res.json();
    updateAuthState({ user, isAuthenticated: true, isLoading: false });
    return user;
  } catch {
    if (authState.user) {
      return authState.user;
    }
    return null;
  }
}

export async function initAuth() {
  updateAuthState({ isLoading: true });
  try {
    const user = await getCurrentUser();
    updateAuthState({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
    initCSRFToken();
  } catch {
    updateAuthState({ isLoading: false });
  }
}

export async function requestPasswordReset(email: string) {
  const csrfHeaders = await getCSRFHeaders();
  const res = await fetch(`${API_BASE}/api/auth/password/request`, {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

// ── Face Recognition ──────────────────────────────────────────────────────────

export async function registerFace(userId: string, imageDataUrl: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/face/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, faceImage: imageDataUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Face registration failed');
  }
  return { ok: true };
}

export async function verifyFace(
  capturedImageDataUrl: string,
  userId?: string | null,
  options?: { recordAttendance?: boolean; sessionId?: string; classId?: string; location?: { lat: number; lng: number } },
): Promise<{ authenticated: boolean; confidence?: number; method?: string }> {
  const body: Record<string, any> = { faceImage: capturedImageDataUrl };
  if (userId) body.userId = userId;
  if (options?.recordAttendance) {
    body.recordAttendance = true;
    body.sessionId = options.sessionId;
    body.classId = options.classId;
    if (options.location) body.location = options.location;
  }
  
  const res = await fetch(`${API_BASE}/api/face/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error('Face service unavailable. Please try again or use password login.');
  }
  const data = await res.json();
  const authenticated = data.authenticated ?? data.ok ?? false;
  return { authenticated, confidence: data.confidence, method: 'face-api' };
}

async function _compareImages(img1DataUrl: string, img2DataUrl: string): Promise<number> {
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const [img1, img2] = await Promise.all([loadImage(img1DataUrl), loadImage(img2DataUrl)]);
  const W = 64, H = 64;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img1, 0, 0, W, H);
  const d1 = ctx.getImageData(0, 0, W, H).data;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img2, 0, 0, W, H);
  const d2 = ctx.getImageData(0, 0, W, H).data;

  let diff = 0;
  const total = W * H * 3;
  for (let i = 0; i < d1.length; i += 4) {
    diff += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i+1] - d2[i+1]) + Math.abs(d1[i+2] - d2[i+2]);
  }
  const maxDiff = 255 * total;
  return 1 - diff / maxDiff;
}

// ── Location Auth ─────────────────────────────────────────────────────────────

export async function verifyLocation(
  current: Coordinates,
  target: Coordinates,
  radiusMeters: number,
): Promise<{ authenticated: boolean; distance_m: number; radius_m: number }> {
  const distance_m = calculateDistance(current, target);
  const authenticated = distance_m <= radiusMeters;
  return { authenticated, distance_m, radius_m: radiusMeters };
}

// ── Legacy password helpers ────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function passwordMatches(input: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  if (/^[0-9a-f]{64}$/.test(stored)) return (await hashPassword(input)) === stored;
  return input === stored;
}
