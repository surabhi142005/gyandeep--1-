/**
 * server/utils/locationUtils.js
 * Shared location utilities for Haversine distance calculation
 */

export const RADIUS_EARTH_METERS = 6371000;

export function calculateHaversineDistance(coord1, coord2) {
  const lat1 = coord1.lat * Math.PI / 180;
  const lat2 = coord2.lat * Math.PI / 180;
  const deltaLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const deltaLng = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return RADIUS_EARTH_METERS * c;
}

export function isWithinGeofence(userLocation, anchorLocation, radiusMeters) {
  if (!userLocation || !anchorLocation || !radiusMeters) {
    return true;
  }

  const distance = calculateHaversineDistance(userLocation, anchorLocation);
  return distance <= radiusMeters;
}

export function validateCoordinates(coords) {
  if (!coords || typeof coords !== 'object') {
    return false;
  }

  const lat = parseFloat(coords.lat);
  const lng = parseFloat(coords.lng);

  return !isNaN(lat) && !isNaN(lng) &&
         lat >= -90 && lat <= 90 &&
         lng >= -180 && lng <= 180;
}