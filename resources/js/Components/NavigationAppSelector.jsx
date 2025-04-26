import React, { useState } from 'react';

export default function NavigationAppSelector({ coordinates, roadName }) {
    const [selectedApp, setSelectedApp] = useState('google');

    const openInMaps = () => {
        // Get first and last coordinates for the route
        const startPoint = coordinates[0];
        const endPoint = coordinates[coordinates.length - 1];
        
        // Detect platform
        const iOS = /iPad|iPhone|iPod/.test(navigator.platform);
        const android = /Android/.test(navigator.userAgent);
        
        let url;
        
        switch (selectedApp) {
            case 'google':
                // Google Maps URL format
                if (iOS) {
                    // iOS Google Maps
                    url = `comgooglemaps://?saddr=${startPoint[0]},${startPoint[1]}&daddr=${endPoint[0]},${endPoint[1]}&directionsmode=driving`;
                } else {
                    // Web/Android Google Maps
                    url = `https://www.google.com/maps/dir/?api=1&origin=${startPoint[0]},${startPoint[1]}&destination=${endPoint[0]},${endPoint[1]}&travelmode=driving`;
                }
                break;
                
            case 'apple':
                // Apple Maps (iOS only)
                url = `maps://maps.apple.com/?saddr=${startPoint[0]},${startPoint[1]}&daddr=${endPoint[0]},${endPoint[1]}`;
                break;
                
            case 'waze':
                // Waze URL format
                url = `waze://?ll=${endPoint[0]},${endPoint[1]}&navigate=yes`;
                break;
                
            default:
                url = `https://www.google.com/maps/dir/?api=1&origin=${startPoint[0]},${startPoint[1]}&destination=${endPoint[0]},${endPoint[1]}&travelmode=driving`;
        }

        // Try to open the app, fallback to browser if app not installed
        window.location.href = url;
    };

    return (
        <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow">
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