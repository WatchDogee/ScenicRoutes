import React, { useEffect, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaRoute, FaMapMarkerAlt, FaClock, FaRuler } from 'react-icons/fa';

export default function SharedRoute({ share, route, routeName, routeDescription, error, message }) {
    const mapRef = useRef(null);
    const routeLayerRef = useRef(null);
    const [mapInitialized, setMapInitialized] = useState(false);

    useEffect(() => {
        if (error || !route || !route.coordinates || route.coordinates.length < 2) {
            return;
        }

        if (!mapRef.current && !mapInitialized) {
            const mapContainer = document.getElementById('shared-route-map');
            if (!mapContainer) return;

            const map = L.map(mapContainer, {
                center: [route.coordinates[0][0], route.coordinates[0][1]],
                zoom: 10,
                zoomControl: true
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Draw route
            const coordinates = route.coordinates.map(coord => {
                if (Array.isArray(coord)) {
                    return [coord[0], coord[1]];
                } else if (coord && typeof coord === 'object' && coord.lat && coord.lng) {
                    return [coord.lat, coord.lng];
                }
                return null;
            }).filter(coord => coord !== null);

            if (coordinates.length >= 2) {
                const polyline = L.polyline(coordinates, {
                    color: '#006400',
                    weight: 5,
                    opacity: 0.8
                }).addTo(map);

                // Add start marker
                if (coordinates[0]) {
                    const startIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker(coordinates[0], { icon: startIcon })
                        .bindPopup('<b>Start</b>')
                        .addTo(map);
                }

                // Add end marker
                if (coordinates[coordinates.length - 1]) {
                    const endIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker(coordinates[coordinates.length - 1], { icon: endIcon })
                        .bindPopup('<b>End</b>')
                        .addTo(map);
                }

                map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
                mapRef.current = map;
                routeLayerRef.current = polyline;
                setMapInitialized(true);
            }
        }
    }, [route, error, mapInitialized]);

    if (error) {
        return (
            <div>
                <Head title="Route Not Found" />
                <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Route Not Found</h1>
                        <p className="text-gray-600 mb-6">{message || 'This shared route does not exist or has expired.'}</p>
                        <Link
                            href="/map"
                            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                        >
                            Go to Route Planner
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Head title={`Shared Route: ${routeName || 'Route'}`} />
            
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8 max-w-6xl">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{routeName || 'Shared Route'}</h1>
                        {routeDescription && (
                            <p className="text-gray-600 mb-4">{routeDescription}</p>
                        )}
                        {share && (
                            <div className="text-sm text-gray-500">
                                Viewed {share.view_count} time{share.view_count !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                    {/* Map */}
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div id="shared-route-map" className="w-full h-96 rounded-lg border border-gray-200"></div>
                    </div>

                    {/* Route Information */}
                    {route && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Route Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {route.distance && (
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 p-3 rounded-lg">
                                            <FaRuler className="text-blue-600 text-xl" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Distance</div>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {(route.distance / 1000).toFixed(2)} km
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {route.time && (
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-3 rounded-lg">
                                            <FaClock className="text-green-600 text-xl" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Duration</div>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {Math.round(route.time / 60)} min
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {route.curvature && (
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-100 p-3 rounded-lg">
                                            <FaRoute className="text-purple-600 text-xl" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Curvature</div>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {route.curvature.toFixed(6)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6">
                                <Link
                                    href="/map"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                                >
                                    <FaRoute />
                                    Open in Route Planner
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}






