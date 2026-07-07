import React, { useState } from 'react';
import Portal from './Portal';
import { encodePolyline, formatRouteForNavigation } from '../utils/routeUtils';

export default function NavigationAppSelector({ coordinates, roadName, onClose }) {
    const [selectedApp, setSelectedApp] = useState('google');
    
    const openInMaps = () => {
        if (!coordinates) {
            alert('Invalid route coordinates. Cannot navigate.');
            return;
        }
        
        let parsedCoordinates;
        try {
            if (typeof coordinates === 'string') {
                parsedCoordinates = JSON.parse(coordinates);
            } else if (Array.isArray(coordinates)) {
                parsedCoordinates = coordinates;
            } else {
                alert('Invalid route coordinates format.');
                return;
            }
        } catch (e) {
            alert('Failed to parse route coordinates.');
            return;
        }
        
        if (!Array.isArray(parsedCoordinates) || parsedCoordinates.length < 2) {
            alert('Route must have at least two points. Cannot navigate.');
            return;
        }

        // Normalize coordinates to [lat, lng] format
        const normalizedCoords = parsedCoordinates.map(coord => {
            if (Array.isArray(coord)) {
                return [coord[0], coord[1]];
            } else if (typeof coord === 'object') {
                return [coord.lat, coord.lng || coord.lon];
            }
            return null;
        }).filter(coord => coord !== null);

        if (normalizedCoords.length < 2) {
            alert('Invalid coordinate format. Cannot navigate.');
            return;
        }

        const startPoint = normalizedCoords[0];
        const endPoint = normalizedCoords[normalizedCoords.length - 1];
        const startLat = startPoint[0];
        const startLng = startPoint[1];
        const endLat = endPoint[0];
        const endLng = endPoint[1];

        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
            alert('Invalid coordinate values. Cannot navigate.');
            return;
        }

        const iOS = /iPad|iPhone|iPod/.test(navigator.platform);
        const android = /Android/.test(navigator.userAgent);
        let url;

        // Format route for navigation
        const routeData = formatRouteForNavigation(normalizedCoords, selectedApp);

        switch (selectedApp) {
            case 'google':
                // Google Maps supports waypoints via URL parameters
                if (routeData.waypoints.length > 0 && routeData.waypoints.length <= 23) {
                    // Limit to 23 waypoints (Google Maps limit)
                    const waypoints = routeData.waypoints.slice(0, 23)
                        .map(wp => `${wp[0]},${wp[1]}`)
                        .join('|');
                    
                if (iOS) {
                        // iOS Google Maps app doesn't support waypoints in URL scheme
                        url = `comgooglemaps://?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}&directionsmode=driving`;
                    } else {
                        url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
                    }
                } else {
                    // Fallback to start/end only if too many waypoints
                    if (iOS) {
                    url = `comgooglemaps://?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}&directionsmode=driving`;
                } else {
                    url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving`;
                    }
                }
                break;
            case 'apple':
                // Apple Maps supports waypoints via URL
                if (routeData.waypoints.length > 0) {
                    const waypoints = routeData.waypoints
                        .map(wp => `${wp[0]},${wp[1]}`)
                        .join('&waypoint=');
                    url = `maps://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}&waypoint=${waypoints}`;
                } else {
                url = `maps://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}`;
                }
                break;
            case 'waze':
                // Waze supports waypoints
                if (routeData.waypoints.length > 0) {
                    const waypoints = routeData.waypoints
                        .map(wp => `${wp[0]},${wp[1]}`)
                        .join('&navigate=yes&to=');
                    url = `https://www.waze.com/ul?ll=${endLat},${endLng}&navigate=yes&from=${startLat},${startLng}&to=${waypoints}`;
                } else {
                url = `https://www.waze.com/ul?ll=${endLat},${endLng}&navigate=yes&from=${startLat},${startLng}`;
                }
                break;
            default:
                url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving`;
        }
        
        window.open(url, '_blank');
    };

    return (
        <Portal rootId="navigation-modal-root">
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center navigation-modal-overlay"
                style={{
                    pointerEvents: 'auto',
                    zIndex: 10000001, 
                    position: 'fixed'
                }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onClose) onClose();
                }}
            >
                <div
                    className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow relative navigation-modal-content"
                    style={{
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 10000002 
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
            {/* Close button */}
            {onClose && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    aria-label="Close navigation panel"
                >
                    ✕
                </button>
            )}
            <h3 className="text-lg font-semibold">Navigate to {roadName}</h3>
            <div className="flex flex-col space-y-2">
                <label className="inline-flex items-center cursor-pointer">
                    <input
                        type="radio"
                        className="form-radio"
                        name="navigation-app"
                        value="google"
                        checked={selectedApp === 'google'}
                        onChange={() => setSelectedApp('google')}
                    />
                    <span className="ml-2">Google Maps</span>
                </label>
                {/iPad|iPhone|iPod/.test(navigator.platform) && (
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio"
                            name="navigation-app"
                            value="apple"
                            checked={selectedApp === 'apple'}
                            onChange={() => setSelectedApp('apple')}
                        />
                        <span className="ml-2">Apple Maps</span>
                    </label>
                )}
                <label className="inline-flex items-center cursor-pointer">
                    <input
                        type="radio"
                        className="form-radio"
                        name="navigation-app"
                        value="waze"
                        checked={selectedApp === 'waze'}
                        onChange={() => setSelectedApp('waze')}
                    />
                    <span className="ml-2">Waze</span>
                </label>
            </div>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openInMaps();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
                Open in Navigation App
            </button>
                </div>
            </div>
        </Portal>
    );
}