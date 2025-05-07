import React, { useState } from 'react';

export default function NavigationAppSelector({ coordinates, roadName, onClose }) {
    const [selectedApp, setSelectedApp] = useState('google');

    const openInMaps = () => {
        // Log the coordinates for debugging
        console.log('Raw coordinates:', coordinates);

        // Ensure coordinates are valid and in the correct format
        if (!coordinates) {
            console.error('Coordinates are null or undefined');
            alert('Invalid route coordinates. Cannot navigate.');
            return;
        }

        // Parse coordinates if they're in string format
        let parsedCoordinates;
        try {
            if (typeof coordinates === 'string') {
                parsedCoordinates = JSON.parse(coordinates);
            } else if (Array.isArray(coordinates)) {
                parsedCoordinates = coordinates;
            } else {
                console.error('Coordinates are not in a recognized format:', coordinates);
                alert('Invalid route coordinates format. Cannot navigate.');
                return;
            }
        } catch (e) {
            console.error('Failed to parse coordinates:', e, coordinates);
            alert('Failed to parse route coordinates. Cannot navigate.');
            return;
        }

        console.log('Parsed coordinates:', parsedCoordinates);

        // Ensure we have at least two points for a route
        if (!Array.isArray(parsedCoordinates) || parsedCoordinates.length < 2) {
            console.error('Not enough coordinate points:', parsedCoordinates);
            alert('Route must have at least two points. Cannot navigate.');
            return;
        }

        // Get first and last coordinates for the route
        const startPoint = parsedCoordinates[0];
        const endPoint = parsedCoordinates[parsedCoordinates.length - 1];

        console.log('Start point:', startPoint, 'End point:', endPoint);

        // Check if coordinates are in [lat, lng] format or {lat, lng} format
        let startLat, startLng, endLat, endLng;

        if (Array.isArray(startPoint)) {
            // [lat, lng] format
            if (startPoint.length < 2 || endPoint.length < 2) {
                console.error('Coordinate points do not have enough values:', { startPoint, endPoint });
                alert('Invalid coordinate format. Cannot navigate.');
                return;
            }
            startLat = startPoint[0];
            startLng = startPoint[1];
            endLat = endPoint[0];
            endLng = endPoint[1];
        } else if (typeof startPoint === 'object') {
            // {lat, lng} or {lat, lon} format
            if (!('lat' in startPoint) || !('lng' in startPoint) && !('lon' in startPoint) ||
                !('lat' in endPoint) || !('lng' in endPoint) && !('lon' in endPoint)) {
                console.error('Coordinate objects missing lat/lng properties:', { startPoint, endPoint });
                alert('Invalid coordinate format. Cannot navigate.');
                return;
            }
            startLat = startPoint.lat;
            startLng = startPoint.lng || startPoint.lon;
            endLat = endPoint.lat;
            endLng = endPoint.lng || endPoint.lon;
        } else {
            console.error('Unrecognized coordinate format:', { startPoint, endPoint });
            alert('Unrecognized coordinate format. Cannot navigate.');
            return;
        }

        // Final validation of coordinate values
        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
            console.error('Coordinate values are not numbers:', { startLat, startLng, endLat, endLng });
            alert('Invalid coordinate values. Cannot navigate.');
            return;
        }

        // Detect platform
        const iOS = /iPad|iPhone|iPod/.test(navigator.platform);
        const android = /Android/.test(navigator.userAgent);

        let url;

        switch (selectedApp) {
            case 'google':
                // Google Maps URL format
                if (iOS) {
                    // iOS Google Maps
                    url = `comgooglemaps://?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}&directionsmode=driving`;
                } else {
                    // Web/Android Google Maps
                    url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving`;
                }
                break;

            case 'apple':
                // Apple Maps (iOS only)
                url = `maps://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}`;
                break;

            case 'waze':
                // Waze URL format
                url = `waze://?ll=${endLat},${endLng}&navigate=yes`;
                break;

            default:
                url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving`;
        }

        // Open in a new tab instead of redirecting
        window.open(url, '_blank');
    };

    return (
        <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow relative">
            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    aria-label="Close navigation panel"
                >
                    ✕
                </button>
            )}

            <h3 className="text-lg font-semibold">Navigate to {roadName}</h3>

            <div className="flex flex-col space-y-2">
                <label className="inline-flex items-center">
                    <input
                        type="radio"
                        className="form-radio"
                        name="navigation-app"
                        value="google"
                        checked={selectedApp === 'google'}
                        onChange={(e) => setSelectedApp(e.target.value)}
                    />
                    <span className="ml-2">Google Maps</span>
                </label>

                {/iPad|iPhone|iPod/.test(navigator.platform) && (
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio"
                            name="navigation-app"
                            value="apple"
                            checked={selectedApp === 'apple'}
                            onChange={(e) => setSelectedApp(e.target.value)}
                        />
                        <span className="ml-2">Apple Maps</span>
                    </label>
                )}

                <label className="inline-flex items-center">
                    <input
                        type="radio"
                        className="form-radio"
                        name="navigation-app"
                        value="waze"
                        checked={selectedApp === 'waze'}
                        onChange={(e) => setSelectedApp(e.target.value)}
                    />
                    <span className="ml-2">Waze</span>
                </label>
            </div>

            <button
                onClick={openInMaps}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
                Open in Navigation App
            </button>
        </div>
    );
}