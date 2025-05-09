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
 * Categorize road by length
 * @param {number} lengthInMeters - Road length in meters
 * @returns {string} - Road length category
 */
export const getRoadLengthCategory = (lengthInMeters) => {
    const lengthInKm = lengthInMeters / 1000;
    if (lengthInKm >= 15) return 'long';
    if (lengthInKm >= 5) return 'medium';
    return 'short';
};

/**
 * Get road style based on length and twistiness
 * @param {number} lengthInMeters - Road length in meters
 * @param {number} twistiness - Twistiness value
 * @returns {Object} - Road style object with color and weight
 */
export const getRoadStyle = (lengthInMeters, twistiness) => {
    // Determine color based on twistiness
    let color = 'green';
    if (twistiness > 0.007) color = 'red';
    else if (twistiness > 0.0035) color = 'yellow';

    // Determine weight based on road length category
    const category = getRoadLengthCategory(lengthInMeters);
    let weight = 5; // Default weight for short roads

    if (category === 'long') {
        weight = 9;
    } else if (category === 'medium') {
        weight = 7;
    }

    return { color, weight };
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

/**
 * Check if two road segments can be connected
 * @param {Object} road1 - First road segment
 * @param {Object} road2 - Second road segment
 * @returns {boolean} - Whether the roads can be connected
 */
export const canConnectRoads = (road1, road2) => {
    // If roads have different names and both are named, they're probably different roads
    if (road1.name && road2.name && road1.name !== 'Unnamed Road' && road2.name !== 'Unnamed Road' && road1.name !== road2.name) {
        return false;
    }

    // Get endpoints of both roads
    const road1Start = road1.geometry[0];
    const road1End = road1.geometry[road1.geometry.length - 1];
    const road2Start = road2.geometry[0];
    const road2End = road2.geometry[road2.geometry.length - 1];

    // Check if any endpoints are close enough to connect
    const connectionThreshold = 0.05; // 50 meters in km

    // Check all possible connections between endpoints
    const connections = [
        { from: road1End, to: road2Start },
        { from: road1Start, to: road2End },
        { from: road1End, to: road2End },
        { from: road1Start, to: road2Start }
    ];

    for (const conn of connections) {
        const distance = calculateDistance(
            conn.from.lat, conn.from.lon,
            conn.to.lat, conn.to.lon
        );

        if (distance <= connectionThreshold) {
            return true;
        }
    }

    return false;
};

/**
 * Connect two road segments
 * @param {Object} road1 - First road segment
 * @param {Object} road2 - Second road segment
 * @returns {Object} - Connected road
 */
export const connectRoads = (road1, road2) => {
    // Get endpoints of both roads
    const road1Start = road1.geometry[0];
    const road1End = road1.geometry[road1.geometry.length - 1];
    const road2Start = road2.geometry[0];
    const road2End = road2.geometry[road2.geometry.length - 1];

    // Find which endpoints are closest
    const connections = [
        { type: 'end-start', from: road1End, to: road2Start, distance: calculateDistance(road1End.lat, road1End.lon, road2Start.lat, road2Start.lon) },
        { type: 'start-end', from: road1Start, to: road2End, distance: calculateDistance(road1Start.lat, road1Start.lon, road2End.lat, road2End.lon) },
        { type: 'end-end', from: road1End, to: road2End, distance: calculateDistance(road1End.lat, road1End.lon, road2End.lat, road2End.lon) },
        { type: 'start-start', from: road1Start, to: road2Start, distance: calculateDistance(road1Start.lat, road1Start.lon, road2Start.lat, road2Start.lon) }
    ];

    // Sort by distance and get the closest connection
    connections.sort((a, b) => a.distance - b.distance);
    const closestConnection = connections[0];

    // Create a new connected geometry based on the connection type
    let newGeometry = [];

    if (closestConnection.type === 'end-start') {
        // road1 -> road2
        newGeometry = [...road1.geometry, ...road2.geometry];
    } else if (closestConnection.type === 'start-end') {
        // road2 -> road1
        newGeometry = [...road2.geometry, ...road1.geometry];
    } else if (closestConnection.type === 'end-end') {
        // road1 -> reverse(road2)
        newGeometry = [...road1.geometry, ...road2.geometry.slice().reverse()];
    } else if (closestConnection.type === 'start-start') {
        // reverse(road1) -> road2
        newGeometry = [...road1.geometry.slice().reverse(), ...road2.geometry];
    }

    // Create a new connected road
    const connectedRoad = {
        id: `${road1.id}_${road2.id}`,
        name: road1.name || road2.name || 'Unnamed Road',
        geometry: newGeometry,
        tags: { ...road1.tags, ...road2.tags }
    };

    return connectedRoad;
};

/**
 * Check if a road is in an urban area
 * @param {Object} road - Road object with tags
 * @returns {boolean} - Whether the road is in an urban area
 */
export const isInUrbanArea = (road) => {
    // Check road tags for urban indicators
    const urbanTags = ['residential', 'living_street', 'urban'];

    if (road.tags) {
        // Check if any urban tags are present
        for (const tag of urbanTags) {
            if (road.tags[tag] || (road.tags.highway && road.tags.highway.includes(tag))) {
                return true;
            }
        }

        // Check for maxspeed tag indicating urban area (usually <= 50 km/h)
        if (road.tags.maxspeed && parseInt(road.tags.maxspeed) <= 50) {
            return true;
        }
    }

    return false;
};
