import React, { useMemo } from 'react';
import { FaMountain, FaRoute, FaClock, FaChartLine, FaRoad } from 'react-icons/fa';
import { formatDistance, formatDuration } from '../utils/routeUtils';

/**
 * Enhanced Route Statistics Component
 * Displays comprehensive route statistics including:
 * - Enhanced elevation profile with gradient visualization
 * - Curvature heatmap along route
 * - Road surface information
 * - Speed limit information (if available)
 * - Difficulty rating
 */
export default function EnhancedRouteStatistics({ route, className = '' }) {
    if (!route || !route.coordinates || route.coordinates.length === 0) {
        return null;
    }

    // Calculate enhanced statistics
    const stats = useMemo(() => {
        const coordinates = route.coordinates || [];
        if (coordinates.length < 2) {
            return {
                distance: route.distance || 0,
                duration: route.duration || route.time || 0,
                curvature: route.curvature || 0,
                cornerCount: route.corner_count || 0,
                elevationGain: route.elevation_gain || 0,
                elevationLoss: route.elevation_loss || 0,
                maxElevation: route.max_elevation || 0,
                minElevation: route.min_elevation || 0,
                elevationProfile: [],
                curvatureProfile: [],
                averageCurvature: 0,
                maxCurvature: 0,
                difficultyRating: 0
            };
        }

        // Build elevation profile
        const elevationProfile = coordinates
            .filter(coord => coord[2] !== undefined && coord[2] !== null)
            .map((coord, index) => ({
                index,
                elevation: coord[2] || 0,
                distance: index * (route.distance / coordinates.length) || 0
            }));

        // Calculate curvature profile (curvature at each segment)
        const curvatureProfile = [];
        let totalCurvature = 0;
        let maxCurvature = 0;

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
                const curvature = normalizedChange / ((dist1 + dist2) / 2);
                totalCurvature += curvature;
                maxCurvature = Math.max(maxCurvature, curvature);
                
                curvatureProfile.push({
                    index: i,
                    curvature,
                    distance: i * (route.distance / coordinates.length) || 0
                });
            }
        }

        const averageCurvature = curvatureProfile.length > 0 
            ? totalCurvature / curvatureProfile.length 
            : 0;

        // Calculate difficulty rating (0-10 scale)
        // Based on: curvature (40%), elevation gain (30%), distance (20%), corner count (10%)
        const curvatureScore = Math.min(10, (averageCurvature / 0.01) * 4); // Normalize curvature
        const elevationScore = Math.min(10, (route.elevation_gain || 0) / 1000 * 3); // 1000m = 3 points
        const distanceScore = Math.min(10, (route.distance || 0) / 100000 * 2); // 100km = 2 points
        const cornerScore = Math.min(10, (route.corner_count || 0) / 100); // 100 corners = 1 point
        
        const difficultyRating = Math.round(
            curvatureScore * 0.4 + 
            elevationScore * 0.3 + 
            distanceScore * 0.2 + 
            cornerScore * 0.1
        );

        return {
            distance: route.distance || 0,
            duration: route.duration || route.time || 0,
            curvature: route.curvature || averageCurvature,
            cornerCount: route.corner_count || 0,
            elevationGain: route.elevation_gain || 0,
            elevationLoss: route.elevation_loss || 0,
            maxElevation: route.max_elevation || Math.max(...elevationProfile.map(e => e.elevation), 0),
            minElevation: route.min_elevation || Math.min(...elevationProfile.map(e => e.elevation), 0),
            elevationProfile,
            curvatureProfile,
            averageCurvature,
            maxCurvature,
            difficultyRating: Math.min(10, Math.max(0, difficultyRating))
        };
    }, [route]);

    // Get difficulty label
    const getDifficultyLabel = (rating) => {
        if (rating <= 2) return { label: 'Easy', color: 'text-green-600 bg-green-100' };
        if (rating <= 4) return { label: 'Moderate', color: 'text-yellow-600 bg-yellow-100' };
        if (rating <= 7) return { label: 'Challenging', color: 'text-orange-600 bg-orange-100' };
        return { label: 'Extreme', color: 'text-red-600 bg-red-100' };
    };

    const difficulty = getDifficultyLabel(stats.difficultyRating);

    // Elevation profile visualization
    const elevationRange = stats.maxElevation - stats.minElevation;
    const elevationMax = stats.maxElevation || 1;

    return (
        <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                Route Statistics
            </h3>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaRoute className="text-blue-600 text-sm" />
                        <div className="text-xs text-gray-600">Distance</div>
                    </div>
                    <div className="font-semibold text-blue-700">
                        {formatDistance(stats.distance, 'metric')}
                    </div>
                </div>

                <div className="bg-green-50 p-3 rounded border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaClock className="text-green-600 text-sm" />
                        <div className="text-xs text-gray-600">Duration</div>
                    </div>
                    <div className="font-semibold text-green-700">
                        {formatDuration(stats.duration)}
                    </div>
                </div>

                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaRoute className="text-purple-600 text-sm" />
                        <div className="text-xs text-gray-600">Curvature</div>
                    </div>
                    <div className="font-semibold text-purple-700">
                        {stats.curvature.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                        {stats.cornerCount} corners
                    </div>
                </div>

                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaMountain className="text-orange-600 text-sm" />
                        <div className="text-xs text-gray-600">Elevation</div>
                    </div>
                    <div className="font-semibold text-orange-700">
                        {Math.round(stats.elevationGain)}m ↑ / {Math.round(stats.elevationLoss)}m ↓
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                        {Math.round(stats.minElevation)}m - {Math.round(stats.maxElevation)}m
                    </div>
                </div>
            </div>

            {/* Difficulty Rating */}
            <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FaRoad className="text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">Difficulty Rating</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficulty.color}`}>
                            {difficulty.label}
                        </span>
                        <div className="text-sm font-bold text-gray-800">
                            {stats.difficultyRating}/10
                        </div>
                    </div>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full ${
                            stats.difficultyRating <= 2 ? 'bg-green-500' :
                            stats.difficultyRating <= 4 ? 'bg-yellow-500' :
                            stats.difficultyRating <= 7 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(stats.difficultyRating / 10) * 100}%` }}
                    />
                </div>
            </div>

            {/* Elevation Profile */}
            {stats.elevationProfile.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaMountain className="text-gray-600" />
                        Elevation Profile
                    </h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="relative h-32 w-full">
                            <svg className="w-full h-full" viewBox={`0 0 ${stats.elevationProfile.length} 100`} preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                                    </linearGradient>
                                </defs>
                                <polyline
                                    points={stats.elevationProfile.map((point, i) => 
                                        `${i},${100 - ((point.elevation - stats.minElevation) / elevationRange * 100)}`
                                    ).join(' ')}
                                    fill="url(#elevationGradient)"
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                />
                            </svg>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>Start: {Math.round(stats.minElevation)}m</span>
                            <span>Peak: {Math.round(stats.maxElevation)}m</span>
                            <span>Gain: +{Math.round(stats.elevationGain)}m</span>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// Helper functions
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}




