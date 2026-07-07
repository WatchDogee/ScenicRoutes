/**
 * Route Statistics Calculator - Client-side
 * Calculates route statistics (curvature, corner count, etc.) on the client
 * to reduce server load and improve performance
 */

export const calculateRouteStats = (coordinates) => {
    if (!coordinates || coordinates.length < 2) {
        return {
            curvature: 0,
            corner_count: 0,
            elevation_gain: 0,
            elevation_loss: 0,
            max_elevation: 0,
            min_elevation: 0
        };
    }

    let totalCurvature = 0;
    let cornerCount = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxElevation = coordinates[0]?.[2] || 0;
    let minElevation = coordinates[0]?.[2] || 0;

    // Calculate curvature and corner count
    for (let i = 1; i < coordinates.length - 1; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        const next = coordinates[i + 1];

        if (!prev || !curr || !next) continue;

        // Calculate bearing changes
        const bearing1 = calculateBearing(prev[0], prev[1], curr[0], curr[1]);
        const bearing2 = calculateBearing(curr[0], curr[1], next[0], next[1]);
        
        const bearingChange = Math.abs(bearing2 - bearing1);
        const normalizedChange = bearingChange > 180 ? 360 - bearingChange : bearingChange;
        
        // Calculate distances
        const dist1 = getDistance(prev[0], prev[1], curr[0], curr[1]);
        const dist2 = getDistance(curr[0], curr[1], next[0], next[1]);
        
        if (dist1 > 0 && dist2 > 0) {
            // Curvature = bearing change per unit distance
            const curvature = normalizedChange / ((dist1 + dist2) / 2);
            totalCurvature += curvature;
            
            // Count corners (significant bearing changes)
            if (normalizedChange > 15) { // 15 degrees = corner
                cornerCount++;
            }
        }

        // Elevation calculations
        const elevation = curr[2] || 0;
        if (elevation > maxElevation) maxElevation = elevation;
        if (elevation < minElevation) minElevation = elevation;

        if (i > 0) {
            const prevElevation = prev[2] || 0;
            const elevationDiff = elevation - prevElevation;
            if (elevationDiff > 0) {
                elevationGain += elevationDiff;
            } else {
                elevationLoss += Math.abs(elevationDiff);
            }
        }
    }

    // Average curvature
    const avgCurvature = coordinates.length > 2 ? totalCurvature / (coordinates.length - 2) : 0;

    return {
        curvature: avgCurvature,
        corner_count: cornerCount,
        elevation_gain: Math.round(elevationGain),
        elevation_loss: Math.round(elevationLoss),
        max_elevation: Math.round(maxElevation),
        min_elevation: Math.round(minElevation)
    };
};

/**
 * Calculate bearing between two points
 */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
};

/**
 * Calculate distance between two points (Haversine formula)
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Recalculate route statistics on client side
 * This can be called after receiving route data from server
 */
export const recalculateRouteStats = (route) => {
    if (!route || !route.coordinates) {
        return route;
    }

    const stats = calculateRouteStats(route.coordinates);
    
    return {
        ...route,
        curvature: stats.curvature,
        corner_count: stats.corner_count,
        elevation_gain: stats.elevation_gain,
        elevation_loss: stats.elevation_loss,
        max_elevation: stats.max_elevation,
        min_elevation: stats.min_elevation
    };
};
















