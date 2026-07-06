import React, { useState, useEffect } from 'react';
import { FaWifi, FaBan, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

/**
 * Offline Indicator Component
 * Shows online/offline status and available downloaded regions
 */
export default function OfflineIndicator({ auth = null, className = '' }) {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [downloadedRegions, setDownloadedRegions] = useState([]);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isInDownloadedRegion, setIsInDownloadedRegion] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (auth?.token && isOffline) {
            loadDownloadedRegions();
        }
    }, [auth, isOffline]);

    useEffect(() => {
        if (navigator.geolocation && isOffline) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                () => {
                    // Geolocation failed
                }
            );
        }
    }, [isOffline]);

    useEffect(() => {
        if (currentLocation && downloadedRegions.length > 0) {
            const inRegion = downloadedRegions.some(region => {
                const bounds = region.bounds;
                return (
                    currentLocation.lat >= bounds.south &&
                    currentLocation.lat <= bounds.north &&
                    currentLocation.lng >= bounds.west &&
                    currentLocation.lng <= bounds.east
                );
            });
            setIsInDownloadedRegion(inRegion);
        }
    }, [currentLocation, downloadedRegions]);

    const loadDownloadedRegions = async () => {
        try {
            const response = await axios.get('/api/offline-maps/downloads', {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setDownloadedRegions(response.data);
        } catch (error) {
            console.error('Error loading downloaded regions:', error);
        }
    };

    if (!isOffline) {
        return (
            <div className={`offline-indicator online ${className}`}>
                <div className="flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm">
                    <FaWifi className="mr-2" />
                    <span>Online</span>
                </div>
            </div>
        );
    }

        return (
            <div className={`offline-indicator offline ${className}`}>
                <div className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${
                    isInDownloadedRegion 
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                }`}>
                    {isInDownloadedRegion ? (
                        <>
                            <FaCheckCircle className="mr-2" />
                            <span>Offline - Maps Available</span>
                        </>
                    ) : (
                        <>
                            <FaBan className="mr-2" />
                            <span>Offline - Limited Maps</span>
                        </>
                    )}
                </div>
            </div>
        );
}

