/**
 * Format road length from meters to kilometers
 * @param {number} meters - Length in meters
 * @returns {string} - Formatted length in kilometers
 */
export const formatLength = (meters) => {
    return (meters / 1000).toFixed(2) + ' km';
};

/**
 * Get a descriptive label for the twistiness value
 * @param {number} twistiness - Twistiness value
 * @returns {string} - Descriptive label
 */
export const getTwistinessLabel = (twistiness) => {
    if (twistiness > 0.007) return 'Very Curvy';
    if (twistiness > 0.0035) return 'Moderately Curvy';
    return 'Mellow';
};

/**
 * Calculate the average rating from reviews
 * @param {Object} road - Road object with reviews
 * @returns {string|number} - Formatted average rating or 'No ratings'
 */
export const getAverageRating = (road) => {
    if (road.average_rating || road.reviews_avg_rating) {
        return (road.average_rating || road.reviews_avg_rating).toFixed(1);
    }
    
    if (road.reviews && road.reviews.length > 0) {
        const sum = road.reviews.reduce((total, review) => total + review.rating, 0);
        return (sum / road.reviews.length).toFixed(1);
    }
    
    return 'No ratings';
};

/**
 * Calculate distance between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371; // Earth's radius in kilometers
    
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return earthRadius * c;
};

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} - Radians
 */
export const deg2rad = (deg) => {
    return deg * (Math.PI/180);
};

/**
 * Calculate road length from geometry
 * @param {Array} geometry - Array of points with lat/lon
 * @returns {number} - Length in meters
 */
export const calculateRoadLength = (geometry) => {
    let length = 0;
    for (let i = 1; i < geometry.length; i++) {
        length += calculateDistance(
            geometry[i - 1].lat, geometry[i - 1].lon,
            geometry[i].lat, geometry[i].lon
        );
    }
    return length * 1000; // Convert to meters
};

/**
 * Calculate twistiness from geometry
 * @param {Array} geometry - Array of points with lat/lon
 * @returns {Object|number} - Twistiness data or 0
 */
export const calculateTwistiness = (geometry) => {
    let totalAngle = 0;
    let totalDistance = 0;
    let cornerCount = 0;
    
    for (let i = 1; i < geometry.length - 1; i++) {
        const prev = geometry[i - 1];
        const curr = geometry[i];
        const next = geometry[i + 1];
        
        const segmentDistance = calculateDistance(curr.lat, curr.lon, next.lat, next.lon);
        totalDistance += segmentDistance;
        
        const angle1 = Math.atan2(curr.lat - prev.lat, curr.lon - prev.lon);
        const angle2 = Math.atan2(next.lat - curr.lat, next.lon - curr.lon);
        let angle = Math.abs(angle2 - angle1);
        
        if (angle > Math.PI) angle = 2 * Math.PI - angle;
        if (angle > 0.087) cornerCount++;
        
        totalAngle += angle;
    }
    
    if (totalDistance === 0) return 0;
    
    const twistiness = totalAngle / totalDistance;
    return twistiness < 0.0025 && cornerCount < 1 ? 0 : { twistiness, corner_count: cornerCount };
};
