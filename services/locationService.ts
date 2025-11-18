
import type { Coordinates } from '../types';

export const getCurrentPosition = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (err) => {
                    reject(new Error(`Could not get location: ${err.message}. Please enable location services.`));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }
    });
};

// Haversine formula to calculate distance between two lat/lng points in meters
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
    const R = 6371e3; // metres
    const φ1 = coord1.lat * Math.PI / 180; // φ, λ in radians
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};
