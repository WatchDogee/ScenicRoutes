/**
 * Kurviger Route Extractor Helper
 * 
 * This utility helps extract route coordinates from Kurviger's website.
 * Run these functions in the browser console while on Kurviger's route planning page.
 */

/**
 * Extract route coordinates from Leaflet map (if Kurviger uses Leaflet)
 */
export const extractFromLeaflet = () => {
    if (typeof L === 'undefined') {
        console.error('Leaflet not found. Kurviger may not use Leaflet.');
        return null;
    }
    
    // Find all polylines on the map
    const polylines = [];
    if (window.map && window.map.eachLayer) {
        window.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline) {
                const latlngs = layer.getLatLngs();
                if (latlngs && latlngs.length > 0) {
                    const coordinates = latlngs.map(ll => [ll.lat, ll.lng]);
                    polylines.push({
                        name: layer.options?.name || 'Route',
                        coordinates: coordinates
                    });
                }
            }
        });
    }
    
    return polylines.length > 0 ? polylines : null;
};

/**
 * Extract route coordinates from OpenLayers map (if Kurviger uses OpenLayers)
 */
export const extractFromOpenLayers = () => {
    // Implementation for OpenLayers if needed
    console.log('OpenLayers extraction not yet implemented');
    return null;
};

/**
 * Extract route from network request response
 * Use this if you can intercept Kurviger's API response
 */
export const extractFromNetworkResponse = (response) => {
    try {
        // Common response formats
        let coordinates = [];
        let distance = 0;
        let duration = 0;
        
        // Format 1: GeoJSON
        if (response.geometry && response.geometry.coordinates) {
            coordinates = response.geometry.coordinates.map(c => 
                Array.isArray(c) && c.length >= 2 ? [c[1], c[0]] : null
            ).filter(c => c !== null);
        }
        
        // Format 2: Direct coordinates array
        if (response.coordinates && Array.isArray(response.coordinates)) {
            coordinates = response.coordinates.map(c => 
                Array.isArray(c) && c.length >= 2 ? [c[0], c[1]] : null
            ).filter(c => c !== null);
        }
        
        // Format 3: Route object with geometry
        if (response.routes && Array.isArray(response.routes) && response.routes.length > 0) {
            const route = response.routes[0];
            if (route.geometry && route.geometry.coordinates) {
                coordinates = route.geometry.coordinates.map(c => 
                    Array.isArray(c) && c.length >= 2 ? [c[1], c[0]] : null
                ).filter(c => c !== null);
            }
            distance = route.distance || 0;
            duration = route.duration || 0;
        }
        
        if (coordinates.length === 0) {
            throw new Error('No coordinates found in response');
        }
        
        return {
            name: 'Kurviger Route',
            coordinates: coordinates,
            distance: distance || response.distance || 0,
            duration: duration || response.duration || 0,
            curvature: response.curvature || null,
            corner_count: response.corner_count || null
        };
    } catch (error) {
        console.error('Error extracting from network response:', error);
        return null;
    }
};

/**
 * Calculate route statistics from coordinates
 */
export const calculateRouteStats = (coordinates) => {
    if (!coordinates || coordinates.length < 2) {
        return null;
    }
    
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
    
    let totalDistance = 0;
    let totalCurvature = 0;
    let cornerCount = 0;
    
    // Calculate distance
    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        totalDistance += getDistance(prev[0], prev[1], curr[0], curr[1]);
    }
    
    // Calculate curvature and corners
    for (let i = 1; i < coordinates.length - 1; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        const next = coordinates[i + 1];
        
        const bearing1 = Math.atan2(
            Math.sin((curr[1] - prev[1]) * Math.PI / 180) * Math.cos(curr[0] * Math.PI / 180),
            Math.cos(prev[0] * Math.PI / 180) * Math.sin(curr[0] * Math.PI / 180) -
            Math.sin(prev[0] * Math.PI / 180) * Math.cos(curr[0] * Math.PI / 180) *
            Math.cos((curr[1] - prev[1]) * Math.PI / 180)
        ) * 180 / Math.PI;
        
        const bearing2 = Math.atan2(
            Math.sin((next[1] - curr[1]) * Math.PI / 180) * Math.cos(next[0] * Math.PI / 180),
            Math.cos(curr[0] * Math.PI / 180) * Math.sin(next[0] * Math.PI / 180) -
            Math.sin(curr[0] * Math.PI / 180) * Math.cos(next[0] * Math.PI / 180) *
            Math.cos((next[1] - curr[1]) * Math.PI / 180)
        ) * 180 / Math.PI;
        
        let angleChange = Math.abs(bearing2 - bearing1);
        if (angleChange > 180) angleChange = 360 - angleChange;
        
        if (angleChange > 15) {
            cornerCount++;
        }
        
        const segmentDist = getDistance(prev[0], prev[1], curr[0], curr[1]);
        if (segmentDist > 0) {
            totalCurvature += (angleChange * Math.PI / 180) / segmentDist;
        }
    }
    
    const curvature = totalDistance > 0 ? totalCurvature / totalDistance : 0;
    
    return {
        distance: totalDistance,
        curvature: curvature,
        corner_count: cornerCount
    };
};

/**
 * Format route data for import into debug page
 */
export const formatForImport = (routeData) => {
    const stats = routeData.distance ? null : calculateRouteStats(routeData.coordinates);
    
    return {
        name: routeData.name || 'Kurviger Route',
        coordinates: routeData.coordinates,
        distance: routeData.distance || (stats?.distance || 0),
        duration: routeData.duration || 0,
        curvature: routeData.curvature || (stats?.curvature || 0),
        corner_count: routeData.corner_count || (stats?.corner_count || 0)
    };
};

/**
 * Browser console helper - Copy this into Kurviger's console
 */
export const browserConsoleHelper = `
// Kurviger Route Extractor - Run this in Kurviger's browser console

(function() {
    console.log('Kurviger Route Extractor Helper');
    console.log('Looking for route data...');
    
    // Method 1: Try to find Leaflet map
    if (typeof L !== 'undefined' && window.map) {
        console.log('Found Leaflet map');
        const routes = [];
        window.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline) {
                const latlngs = layer.getLatLngs();
                if (latlngs && latlngs.length > 0) {
                    const coords = latlngs.map(ll => [ll.lat, ll.lng]);
                    routes.push({
                        name: layer.options?.name || 'Route',
                        coordinates: coords
                    });
                }
            }
        });
        if (routes.length > 0) {
            console.log('Found routes:', routes);
            console.log('Copy this JSON:', JSON.stringify(routes[0], null, 2));
            return routes;
        }
    }
    
    // Method 2: Try to find route in global variables
    if (window.routeData || window.currentRoute) {
        const route = window.routeData || window.currentRoute;
        console.log('Found route in global:', route);
        return route;
    }
    
    // Method 3: Check for common route storage
    if (window.app && window.app.route) {
        console.log('Found route in app:', window.app.route);
        return window.app.route;
    }
    
    console.log('No route data found. Try:');
    console.log('1. Check Network tab for API responses');
    console.log('2. Look for route data in window object');
    console.log('3. Inspect map layer objects');
})();
`;














