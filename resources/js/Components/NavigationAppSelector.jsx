import React, { useState } from 'react';
import Portal from './Portal';
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
                alert('Invalid route coordinates format. Cannot navigate.');
                return;
            }
        } catch (e) {
            alert('Failed to parse route coordinates. Cannot navigate.');
            return;
        }
        
        if (!Array.isArray(parsedCoordinates) || parsedCoordinates.length < 2) {
            alert('Route must have at least two points. Cannot navigate.');
            return;
        }
        
        const startPoint = parsedCoordinates[0];
        const endPoint = parsedCoordinates[parsedCoordinates.length - 1];
        
        let startLat, startLng, endLat, endLng;
        if (Array.isArray(startPoint)) {
            
            if (startPoint.length < 2 || endPoint.length < 2) {
                alert('Invalid coordinate format. Cannot navigate.');
                return;
            }
            startLat = startPoint[0];
            startLng = startPoint[1];
            endLat = endPoint[0];
            endLng = endPoint[1];
        } else if (typeof startPoint === 'object') {
            
            if (!('lat' in startPoint) || !('lng' in startPoint) && !('lon' in startPoint) ||
                !('lat' in endPoint) || !('lng' in endPoint) && !('lon' in endPoint)) {
                alert('Invalid coordinate format. Cannot navigate.');
                return;
            }
            startLat = startPoint.lat;
            startLng = startPoint.lng || startPoint.lon;
            endLat = endPoint.lat;
            endLng = endPoint.lng || endPoint.lon;
        } else {
            alert('Unrecognized coordinate format. Cannot navigate.');
            return;
        }
        
        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
            alert('Invalid coordinate values. Cannot navigate.');
            return;
        }
        
        const iOS = /iPad|iPhone|iPod/.test(navigator.platform);
        const android = /Android/.test(navigator.userAgent);
        let url;
        switch (selectedApp) {
            case 'google':
                
                if (iOS) {
                    
                    url = `comgooglemaps://?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}&directionsmode=driving`;
                } else {
                    
                    url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving`;
                }
                break;
            case 'apple':
                
                url = `maps://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}`;
                break;
            case 'waze':
                
                url = `waze://?ll=${endLat},${endLng}&navigate=yes`;
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
            {$1}
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
                        onChange={(e) => {
                            e.stopPropagation();
                            setSelectedApp(e.target.value);
                        }}
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
                            onChange={(e) => {
                                e.stopPropagation();
                                setSelectedApp(e.target.value);
                            }}
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
                        onChange={(e) => {
                            e.stopPropagation();
                            setSelectedApp(e.target.value);
                        }}
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