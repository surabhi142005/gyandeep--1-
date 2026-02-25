/**
 * services/authService.ts
 *
 * Dual-mode auth:
 *  - Self-hosted mode (default): uses /api/auth/* JWT endpoints
 *  - Supabase mode: used when VITE_SUPABASE_URL is a real URL
 *
 * Face recognition proxies to /api/auth/face (Python service on :5001)
 * with local pixel-diff fallback when the Python service is unavailable.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { calculateDistance } from './locationService';
import type { Coordinates } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Token helpers ─────────────────────────────────────────────────────────────

function saveToken(token: string) {
  try { localStorage.setItem('gyandeep_token', token); } catch {}
}

export function getStoredToken(): string | null {
  try { return localStorage.getItem('gyandeep_token'); } catch { return null; }
}

function authHeader(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Self-hosted JWT auth ───────────────────────────────────────────────────────

async function jwtLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid credentials');
  }
  const data = await res.json();
  if (data.token) saveToken(data.token);
  return data.user;
}

async function jwtRegister(email: string, password: string, name: string, role = 'student') {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed');
  }
  const data = await res.json();
  if (data.token) saveToken(data.token);
  return data.user;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function register(email: string, password: string, name: string, role = 'student') {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } });
    if (error) throw new Error(error.message);
    return data;
  }
  return jwtRegister(email, password, name, role);
}

export async function login(email: string, password: string) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  }
  return jwtLogin(email, password);
}

export async function loginWithGoogle() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw new Error(error.message);
    return data;
  }
  // Self-hosted Google OAuth redirects through Express/Passport
  window.location.href = `${API_BASE}/auth/google`;
  return null;
}

export async function logout() {
  try { localStorage.removeItem('gyandeep_token'); } catch {}
  try { localStorage.removeItem('gyandeep_current_user'); } catch {}
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('Supabase sign-out error:', error.message);
  }
}

export async function getCurrentUser() {
  if (isSupabaseConfigured) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) return null;
    return {
      id: user.id, email: user.email, name: profile.name,
      role: profile.role, faceImage: profile.face_image,
      preferences: profile.preferences || {}, history: profile.history || [],
      assignedSubjects: profile.assigned_subjects || [], performance: profile.performance || [],
      classId: profile.class_id, xp: profile.xp || 0, badges: profile.badges || [],
      coins: profile.coins || 0, level: profile.level || 1,
    };
  }
  // Self-hosted: user is stored in localStorage by useAuth
  try {
    const raw = localStorage.getItem('gyandeep_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function requestPasswordReset(email: string) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  const res = await fetch(`${API_BASE}/api/auth/password/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

// ── Face Recognition ──────────────────────────────────────────────────────────

/**
 * Register a face image.
 * Stores the base64 image locally on the user record (faceImage field).
 * Optionally uploads to Supabase Storage if configured.
 */
export async function registerFace(userId: string, imageDataUrl: string): Promise<{ ok: boolean }> {
  if (isSupabaseConfigured) {
    try {
      const blob = await fetch(imageDataUrl).then(r => r.blob());
      await supabase.storage.from('faces').upload(`${userId}/face.jpg`, blob, {
        contentType: 'image/jpeg', upsert: true,
      });
      await supabase.from('profiles').update({ face_image: imageDataUrl }).eq('id', userId);
    } catch (e) {
      console.warn('Supabase face upload failed, storing locally:', e);
    }
  }
  // Always also store in allUsers state via the onUpdateFaceImage callback
  return { ok: true };
}

/**
 * Verify a face image against a stored reference.
 *
 * Priority:
 *  1. POST /api/auth/face  → Python service (deep learning, accurate)
 *  2. Local pixel-diff fallback (fast, approximate)
 */
export async function verifyFace(
  capturedImageDataUrl: string,
  storedImageDataUrl?: string | null,
): Promise<{ authenticated: boolean; confidence?: number; method?: string }> {
  // Try the Python face-recognition service first
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/auth/face`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ image: capturedImageDataUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      return { authenticated: data.authenticated ?? data.ok ?? false, confidence: data.confidence, method: 'python' };
    }
  } catch {
    // Python service unavailable — use local fallback
  }

  // Local pixel-diff fallback: compare raw canvas pixel data
  if (!storedImageDataUrl) {
    return { authenticated: false, method: 'no-reference' };
  }

  try {
    const similarity = await compareImages(capturedImageDataUrl, storedImageDataUrl);
    return { authenticated: similarity >= 0.72, confidence: similarity, method: 'pixel-diff' };
  } catch {
    return { authenticated: false, method: 'error' };
  }
}

/**
 * Pixel-level similarity between two base64 images using canvas (browser only).
 * Returns a value 0–1 where 1 = identical.
 */
async function compareImages(img1DataUrl: string, img2DataUrl: string): Promise<number> {
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const [img1, img2] = await Promise.all([loadImage(img1DataUrl), loadImage(img2DataUrl)]);
  const W = 64, H = 64; // downscale for speed

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img1, 0, 0, W, H);
  const d1 = ctx.getImageData(0, 0, W, H).data;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img2, 0, 0, W, H);
  const d2 = ctx.getImageData(0, 0, W, H).data;

  let diff = 0;
  const total = W * H * 3; // RGB only
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

// ── Legacy password helpers (kept for Login.tsx backward compatibility) ────────

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
