/**
 * Route utility functions
 */

/**
 * Calculate total distance of a route in meters
 */
export const calculateRouteDistance = (coordinates) => {
    if (!coordinates || coordinates.length < 2) {
        return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        totalDistance += calculateDistance(
            coordinates[i - 1][0],
            coordinates[i - 1][1],
            coordinates[i][0],
            coordinates[i][1]
        );
    }
    return totalDistance;
};

/**
 * Calculate route curvature (twistiness)
 */
export const calculateRouteCurvature = (coordinates) => {
    if (!coordinates || coordinates.length < 3) {
        return 0;
    }

    let totalAngle = 0;
    let totalDistance = 0;

    for (let i = 1; i < coordinates.length - 1; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        const next = coordinates[i + 1];

        const segmentDistance = calculateDistance(curr[0], curr[1], next[0], next[1]);
        totalDistance += segmentDistance;

        const angle1 = Math.atan2(curr[0] - prev[0], curr[1] - prev[1]);
        const angle2 = Math.atan2(next[0] - curr[0], next[1] - curr[1]);
        let angle = Math.abs(angle2 - angle1);

        if (angle > Math.PI) {
            angle = 2 * Math.PI - angle;
        }

        totalAngle += angle;
    }

    if (totalDistance === 0) {
        return 0;
    }

    return totalAngle / totalDistance;
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371000; // meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

/**
 * Encode polyline for Google Maps
 * Uses Google's polyline encoding algorithm
 */
export const encodePolyline = (coordinates) => {
    if (!coordinates || coordinates.length === 0) {
        return '';
    }

    let encoded = '';
    let prevLat = 0;
    let prevLng = 0;

    for (let i = 0; i < coordinates.length; i++) {
        const lat = Math.round(coordinates[i][0] * 1e5);
        const lng = Math.round(coordinates[i][1] * 1e5);

        const dLat = lat - prevLat;
        const dLng = lng - prevLng;

        encoded += encodeValue(dLat);
        encoded += encodeValue(dLng);

        prevLat = lat;
        prevLng = lng;
    }

    return encoded;
};

/**
 * Encode a single value for polyline
 */
const encodeValue = (value) => {
    value = value < 0 ? ~(value << 1) : value << 1;
    let encoded = '';

    while (value >= 0x20) {
        encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
        value >>= 5;
    }

    encoded += String.fromCharCode(value + 63);
    return encoded;
};

/**
 * Format route coordinates for navigation apps
 */
export const formatRouteForNavigation = (coordinates, app) => {
    if (!coordinates || coordinates.length < 2) {
        return null;
    }

    const startPoint = coordinates[0];
    const endPoint = coordinates[coordinates.length - 1];

    switch (app) {
        case 'google':
            // Google Maps supports waypoints via encoded polyline
            return {
                start: `${startPoint[0]},${startPoint[1]}`,
                end: `${endPoint[0]},${endPoint[1]}`,
                waypoints: coordinates.length > 2 ? coordinates.slice(1, -1) : [],
                encodedPolyline: encodePolyline(coordinates)
            };
        case 'apple':
            // Apple Maps supports waypoints
            return {
                start: `${startPoint[0]},${startPoint[1]}`,
                end: `${endPoint[0]},${endPoint[1]}`,
                waypoints: coordinates.length > 2 ? coordinates.slice(1, -1) : []
            };
        case 'waze':
            // Waze supports waypoints
            return {
                start: `${startPoint[0]},${startPoint[1]}`,
                end: `${endPoint[0]},${endPoint[1]}`,
                waypoints: coordinates.length > 2 ? coordinates.slice(1, -1) : []
            };
        default:
            return {
                start: `${startPoint[0]},${startPoint[1]}`,
                end: `${endPoint[0]},${endPoint[1]}`,
                waypoints: []
            };
    }
};

/**
 * Format distance for display
 */
export const formatDistance = (meters, units = 'metric') => {
    if (units === 'imperial') {
        const miles = meters * 0.000621371;
        if (miles < 1) {
            return `${Math.round(meters * 3.28084)} ft`;
        }
        return `${miles.toFixed(2)} mi`;
    }
    
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
};

/**
 * Format duration for display
 */
export const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

/**
 * Get curvature label
 */
export const getCurvatureLabel = (curvature) => {
    if (curvature > 0.007) {
        return 'Very Curved';
    }
    if (curvature > 0.0035) {
        return 'Moderately Curved';
    }
    return 'Mellow';
};


