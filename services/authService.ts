import type { Coordinates } from '../types'

const host = typeof window !== 'undefined' && window.location?.hostname
  ? (window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname)
  : '127.0.0.1'
const protocol = typeof window !== 'undefined' && window.location?.protocol ? window.location.protocol : 'http:'
const BASE_URL = `${protocol}//${host}:5001`

export const registerFace = async (userId: string, imageDataUrl: string): Promise<{ ok: boolean }> => {
  const res = await fetch(`${BASE_URL}/face/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, image: imageDataUrl })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Face registration failed')
  }
  return res.json()
}

export const verifyFace = async (
  imageDataUrl: string,
  userId?: string
): Promise<{ authenticated: boolean; confidence?: number; distance?: number }> => {
  const url = userId ? `${BASE_URL}/face/verify` : `${BASE_URL}/auth/face`
  const payload = userId ? { image: imageDataUrl, user_id: userId } : { image: imageDataUrl }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Face verification failed')
  }
  return res.json()
}

export const verifyLocation = async (
  current: Coordinates,
  target: Coordinates,
  radiusMeters: number
): Promise<{ authenticated: boolean; distance_m: number; radius_m: number }> => {
  const res = await fetch(`${BASE_URL}/auth/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: current.lat, lng: current.lng, target_lat: target.lat, target_lng: target.lng, radius_m: radiusMeters })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Location verification failed')
  }
  return res.json()
}