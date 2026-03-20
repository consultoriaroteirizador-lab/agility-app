import * as Location from 'expo-location';

import { MapRegion, StopCoordinates } from '../_types/stop.types';

/**
 * Validates if the provided coordinates are valid geographic coordinates
 */
export const isValidCoordinate = (
    lat: number | null | undefined,
    lng: number | null | undefined,
): boolean => {
    return (
        lat != null &&
        lng != null &&
        !Number.isNaN(lat) &&
        !Number.isNaN(lng) &&
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
};

/**
 * Default coordinates (São Paulo, Brazil)
 */
export const DEFAULT_COORDINATES: StopCoordinates = {
    latitude: -23.55052,
    longitude: -46.63331,
};

/**
 * Default map delta for zoom level
 */
export const DEFAULT_DELTA = 0.005;

/**
 * Minimum map delta
 */
export const MIN_DELTA = 0.01;

/**
 * Padding percentage for map region calculation
 */
export const MAP_PADDING = 0.2;

interface CalculateMapRegionParams {
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    userLocation: Location.LocationObject | null;
}

/**
 * Calculates the map region that includes both user location and destination
 */
export const calculateMapRegion = (
    params: CalculateMapRegionParams,
): MapRegion => {
    const { destinationLatitude, destinationLongitude, userLocation } = params;
    const points: StopCoordinates[] = [];

    // Add destination point if valid
    if (
        isValidCoordinate(destinationLatitude, destinationLongitude) &&
        destinationLatitude &&
        destinationLongitude
    ) {
        points.push({ latitude: destinationLatitude, longitude: destinationLongitude });
    }

    // Add user location if available and valid
    if (userLocation?.coords) {
        const userLat = userLocation.coords.latitude;
        const userLng = userLocation.coords.longitude;
        if (isValidCoordinate(userLat, userLng)) {
            points.push({ latitude: userLat, longitude: userLng });
        }
    }

    // If no points, use default coordinates
    if (points.length === 0) {
        return {
            latitude: DEFAULT_COORDINATES.latitude,
            longitude: DEFAULT_COORDINATES.longitude,
            latitudeDelta: DEFAULT_DELTA,
            longitudeDelta: DEFAULT_DELTA,
        };
    }

    // If only one point, use it with default zoom
    if (points.length === 1) {
        return {
            latitude: points[0].latitude,
            longitude: points[0].longitude,
            latitudeDelta: DEFAULT_DELTA,
            longitudeDelta: DEFAULT_DELTA,
        };
    }

    // If two points, calculate region that includes both
    const minLat = Math.min(...points.map((p) => p.latitude));
    const maxLat = Math.max(...points.map((p) => p.latitude));
    const minLng = Math.min(...points.map((p) => p.longitude));
    const maxLng = Math.max(...points.map((p) => p.longitude));

    const latDelta = maxLat - minLat;
    const lngDelta = maxLng - minLng;

    // Add padding of 20% on each side
    const finalLatDelta = latDelta * (1 + MAP_PADDING * 2) || MIN_DELTA;
    const finalLngDelta = lngDelta * (1 + MAP_PADDING * 2) || MIN_DELTA;

    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(finalLatDelta, MIN_DELTA),
        longitudeDelta: Math.max(finalLngDelta, MIN_DELTA),
    };
};

