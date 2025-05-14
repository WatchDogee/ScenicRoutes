$1
export const formatLength = (meters) => {
    return (meters / 1000).toFixed(2) + ' km';
};
$1
export const getTwistinessLabel = (twistiness) => {
    if (twistiness > 0.007) return 'Very Curvy';
    if (twistiness > 0.0035) return 'Moderately Curvy';
    return 'Mellow';
};
$1
export const getRoadLengthCategory = (lengthInMeters) => {
    const lengthInKm = lengthInMeters / 1000;
    if (lengthInKm >= 15) return 'long';
    if (lengthInKm >= 5) return 'medium';
    return 'short';
};
$1
export const getRoadStyle = (lengthInMeters, twistiness) => {
    
    let color = 'green';
    if (twistiness > 0.007) color = 'red';
    else if (twistiness > 0.0035) color = 'yellow';
    
    const category = getRoadLengthCategory(lengthInMeters);
    let weight = 5; 
    if (category === 'long') {
        weight = 9;
    } else if (category === 'medium') {
        weight = 7;
    }
    return { color, weight };
};
$1
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
$1
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return earthRadius * c;
};
$1
export const deg2rad = (deg) => {
    return deg * (Math.PI/180);
};
$1
export const calculateRoadLength = (geometry) => {
    let length = 0;
    for (let i = 1; i < geometry.length; i++) {
        length += calculateDistance(
            geometry[i - 1].lat, geometry[i - 1].lon,
            geometry[i].lat, geometry[i].lon
        );
    }
    return length * 1000; 
};
$1
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
$1
export const canConnectRoads = (road1, road2) => {
    
    if (road1.name && road2.name && road1.name !== 'Unnamed Road' && road2.name !== 'Unnamed Road' && road1.name !== road2.name) {
        return false;
    }
    
    const road1Start = road1.geometry[0];
    const road1End = road1.geometry[road1.geometry.length - 1];
    const road2Start = road2.geometry[0];
    const road2End = road2.geometry[road2.geometry.length - 1];
    
    const connectionThreshold = 0.05; 
    
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
$1
export const connectRoads = (road1, road2) => {
    
    const road1Start = road1.geometry[0];
    const road1End = road1.geometry[road1.geometry.length - 1];
    const road2Start = road2.geometry[0];
    const road2End = road2.geometry[road2.geometry.length - 1];
    
    const connections = [
        { type: 'end-start', from: road1End, to: road2Start, distance: calculateDistance(road1End.lat, road1End.lon, road2Start.lat, road2Start.lon) },
        { type: 'start-end', from: road1Start, to: road2End, distance: calculateDistance(road1Start.lat, road1Start.lon, road2End.lat, road2End.lon) },
        { type: 'end-end', from: road1End, to: road2End, distance: calculateDistance(road1End.lat, road1End.lon, road2End.lat, road2End.lon) },
        { type: 'start-start', from: road1Start, to: road2Start, distance: calculateDistance(road1Start.lat, road1Start.lon, road2Start.lat, road2Start.lon) }
    ];
    
    connections.sort((a, b) => a.distance - b.distance);
    const closestConnection = connections[0];
    
    let newGeometry = [];
    if (closestConnection.type === 'end-start') {
        
        newGeometry = [...road1.geometry, ...road2.geometry];
    } else if (closestConnection.type === 'start-end') {
        
        newGeometry = [...road2.geometry, ...road1.geometry];
    } else if (closestConnection.type === 'end-end') {
        
        newGeometry = [...road1.geometry, ...road2.geometry.slice().reverse()];
    } else if (closestConnection.type === 'start-start') {
        
        newGeometry = [...road1.geometry.slice().reverse(), ...road2.geometry];
    }
    
    const connectedRoad = {
        id: `${road1.id}_${road2.id}`,
        name: road1.name || road2.name || 'Unnamed Road',
        geometry: newGeometry,
        tags: { ...road1.tags, ...road2.tags }
    };
    return connectedRoad;
};
$1
export const isInUrbanArea = (road) => {
    
    const urbanTags = ['residential', 'living_street', 'urban'];
    if (road.tags) {
        
        for (const tag of urbanTags) {
            if (road.tags[tag] || (road.tags.highway && road.tags.highway.includes(tag))) {
                return true;
            }
        }
        
        if (road.tags.maxspeed && parseInt(road.tags.maxspeed) <= 50) {
            return true;
        }
    }
    return false;
};
$1
export const calculateRoadMetrics = (coordinates) => {
    
    const geometry = coordinates.map(coord => ({ lat: coord[0], lon: coord[1] }));
    
    let totalDistance = 0;
    for (let i = 1; i < geometry.length; i++) {
        totalDistance += calculateDistance(
            geometry[i - 1].lat, geometry[i - 1].lon,
            geometry[i].lat, geometry[i].lon
        );
    }
    const lengthInMeters = totalDistance * 1000; 
    
    let totalAngle = 0;
    let cornerCount = 0;
    for (let i = 1; i < geometry.length - 1; i++) {
        const prev = geometry[i - 1];
        const curr = geometry[i];
        const next = geometry[i + 1];
        const angle1 = Math.atan2(curr.lat - prev.lat, curr.lon - prev.lon);
        const angle2 = Math.atan2(next.lat - curr.lat, next.lon - curr.lon);
        let angle = Math.abs(angle2 - angle1);
        if (angle > Math.PI) angle = 2 * Math.PI - angle;
        if (angle > 0.087) cornerCount++; 
        totalAngle += angle;
    }
    const twistiness = totalDistance > 0 ? totalAngle / totalDistance : 0;
    return {
        length: lengthInMeters,
        twistiness: twistiness,
        corner_count: cornerCount
    };
};
