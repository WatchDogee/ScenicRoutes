import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RoutePlanner from '../Components/RoutePlanner';
import { Head } from '@inertiajs/react';
import { fixMapTiles } from '../utils/mapTileFix';

const DebugRoute = () => {
    const mapRef = useRef(null);
    const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(true);
    
    // Debug locations - same as backend constants
    const DEBUG_START = { lat: 57.1314, lng: 27.2658, name: 'Balvi' };
    const DEBUG_END = { lat: 56.9496, lng: 24.1052, name: 'Riga' };
    
    // Cities between Balvi and Riga (same as backend)
    const DEBUG_WAYPOINT_CITIES = [
        { name: 'Madona', lat: 56.8533, lng: 26.2167 },
        { name: 'Gulbene', lat: 57.1833, lng: 26.7500 },
        { name: 'Cēsis', lat: 57.3117, lng: 25.2744 },
        { name: 'Valmiera', lat: 57.5417, lng: 25.4250 },
        { name: 'Smiltene', lat: 57.4167, lng: 25.9000 },
        { name: 'Alūksne', lat: 57.4167, lng: 27.0500 },
        { name: 'Valka', lat: 57.7750, lng: 26.0083 },
    ];
    
    // Get random waypoint city
    const getRandomWaypoint = () => {
        const randomCity = DEBUG_WAYPOINT_CITIES[Math.floor(Math.random() * DEBUG_WAYPOINT_CITIES.length)];
        return { lat: randomCity.lat, lng: randomCity.lng, name: randomCity.name, id: Date.now() };
    };
    
    const [randomWaypoint] = useState(() => getRandomWaypoint());

    useEffect(() => {
        const mapContainer = document.getElementById('debug-map');
        if (!mapContainer || mapRef.current) return;

        const leafletMap = L.map(mapContainer, {
            center: [57.1, 27.1], // Center on Latvia (between Balvi and Riga)
            zoom: 9,
            zoomControl: true,
            attributionControl: true,
            fadeAnimation: false,
            zoomAnimation: true,
            markerZoomAnimation: true,
            preferCanvas: true,
            worldCopyJump: true,
            maxBoundsViscosity: 1.0,
        });

        // Add tile layers
        const tileLayers = {
            standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                maxNativeZoom: 18,
                keepBuffer: 2,
                attribution: '&copy; OpenStreetMap contributors',
                crossOrigin: true
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenTopoMap contributors',
                maxZoom: 17,
                updateWhenIdle: false,
                updateWhenZooming: true,
                updateInterval: 100,
                keepBuffer: 4,
                className: 'map-tiles',
                zIndex: 1,
                opacity: 1,
                detectRetina: true,
                crossOrigin: true
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
                maxZoom: 19,
                updateWhenIdle: false,
                updateWhenZooming: true,
                updateInterval: 100,
                keepBuffer: 4,
                className: 'map-tiles',
                zIndex: 1,
                opacity: 1,
                detectRetina: true,
                crossOrigin: true
            })
        };

        // Add default tile layer
        tileLayers.standard.addTo(leafletMap);
        tileLayers.standard.setZIndex(100);
        window.mapTileLayers = tileLayers;

        // Add layer control
        const baseMaps = {
            "Standard": tileLayers.standard,
            "Terrain": tileLayers.terrain,
            "Satellite": tileLayers.satellite
        };
        L.control.layers(baseMaps, {}, { position: 'bottomleft' }).addTo(leafletMap);

        // Fix map tiles
        fixMapTiles(leafletMap);

        // Invalidate size after a short delay
        setTimeout(() => {
            leafletMap.invalidateSize();
        }, 500);

        mapRef.current = leafletMap;

        return () => {
            if (leafletMap) {
                leafletMap.remove();
            }
        };
    }, []);

    const handleRouteCalculated = (routeData) => {
        console.log('Route calculated:', routeData);
    };

    const handleCloseRoutePlanner = () => {
        setIsRoutePlanningMode(false);
    };

    return (
        <div className="h-screen w-screen relative">
            <Head title="Debug Route - Scenic Routes" />
            
            {/* Debug Banner */}
            <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-[10000] font-semibold">
                🐛 DEBUG MODE - Route Development Testing (Balvi → {randomWaypoint.name} → Riga)
            </div>

            {/* Map Container */}
            <div 
                id="debug-map" 
                className="w-full h-full"
                style={{ marginTop: '40px' }}
            />

            {/* Route Planner */}
            {isRoutePlanningMode && mapRef.current && (
                <RoutePlanner
                    map={mapRef.current}
                    isActive={isRoutePlanningMode}
                    onRouteCalculated={handleRouteCalculated}
                    onClose={handleCloseRoutePlanner}
                    initialStart={DEBUG_START}
                    initialEnd={DEBUG_END}
                    initialWaypoints={[randomWaypoint]}
                    autoCalculate={true}
                />
            )}

            {/* Toggle Route Planner Button */}
            {!isRoutePlanningMode && (
                <button
                    onClick={() => setIsRoutePlanningMode(true)}
                    className="absolute top-16 left-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-[1000] flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Open Route Planner
                </button>
            )}
        </div>
    );
};

export default DebugRoute;

