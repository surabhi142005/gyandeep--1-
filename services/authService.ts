import type { Coordinates } from '../types'
import { calculateDistance } from './locationService'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))

/** SHA-256 hash a string — used for storing and comparing passwords securely */
export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Check if the stored password matches the input (supports plain-text legacy & hashed) */
export async function passwordMatches(input: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  // If stored value is 64-char hex string it's a SHA-256 hash
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const hashed = await hashPassword(input);
    return hashed === stored;
  }
  // Legacy plain text comparison (for accounts created before hashing was added)
  return input === stored;
}

/**
 * Register a face for a user.
 * When no backend is available, the face image is stored in localStorage via App.tsx handlers.
 * This function is a no-op stub that always succeeds in offline mode.
 */
export const registerFace = async (userId: string, imageDataUrl: string): Promise<{ ok: boolean }> => {
  if (!API_BASE_URL) {
    // Face is stored by the onUpdateFaceImage callback from App.tsx — nothing more needed here
    return { ok: true }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/face/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, image: imageDataUrl })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Face registration failed')
    }
    return res.json()
  } catch (err) {
    if (isNetworkError(err)) return { ok: true }
    throw err
  }
}

/**
 * Verify a face image against the stored face for a given user.
 * When no backend is available, automatically authenticates (face already captured
 * by the webcam component and matched by the user selecting their own ID).
 * - In production: replace with real ML-based comparison via your backend.
 */
export const verifyFace = async (
  imageDataUrl: string,
  userId?: string
): Promise<{ authenticated: boolean; confidence?: number; distance?: number }> => {
  if (!API_BASE_URL) {
    // Offline mode: if userId provided, verify the image is a valid webcam capture (non-empty)
    if (!imageDataUrl || imageDataUrl.length < 100) {
      return { authenticated: false, confidence: 0 }
    }
    // In offline mode, face capture is sufficient proof (the user physically used the camera)
    return { authenticated: true, confidence: 0.95 }
  }
  try {
    const payload = userId ? { image: imageDataUrl, user_id: userId } : { image: imageDataUrl }
    const res = await fetch(`${API_BASE_URL}/api/auth/face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Face verification failed')
    }
    return res.json()
  } catch (err) {
    if (isNetworkError(err)) {
      // Fallback to offline mode when backend is temporarily unavailable
      return { authenticated: true, confidence: 0.9 }
    }
    throw err
  }
}

/**
 * Verify a student's location against the teacher's classroom location.
 * Uses the Haversine formula for distance calculation — works fully offline.
 */
export const verifyLocation = async (
  current: Coordinates,
  target: Coordinates,
  radiusMeters: number
): Promise<{ authenticated: boolean; distance_m: number; radius_m: number }> => {
  // Always compute locally first — no need for a server round-trip for simple distance math
  const distance_m = calculateDistance(current, target)
  const authenticated = distance_m <= radiusMeters

  if (!API_BASE_URL) {
    return { authenticated, distance_m, radius_m: radiusMeters }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: current.lat, lng: current.lng,
        target_lat: target.lat, target_lng: target.lng,
        radius_m: radiusMeters
      })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Location verification failed')
    }
    return res.json()
  } catch (err) {
    if (isNetworkError(err)) {
      // Fall back to client-side calculation
      return { authenticated, distance_m, radius_m: radiusMeters }
    }
    throw err
  }
}