import type { Coordinates } from '../types'

const BASE_URL = 'http://localhost:3001'

export const verifyFace = async (imageDataUrl: string): Promise<{ authenticated: boolean; confidence: number }> => {
  const res = await fetch(`${BASE_URL}/api/auth/face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl })
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
  const res = await fetch(`${BASE_URL}/api/auth/location`, {
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