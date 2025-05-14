import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { calculateRoadMetrics } from '../utils/roadUtils';
import { FaTrash, FaSave, FaTimes, FaUndo } from 'react-icons/fa';

const MinimalRoadDrawer = ({ map, isDrawingMode, setIsDrawingMode, onRoadDrawn }) => {
    
    const [points, setPoints] = useState([]);

    
    const drawLayerRef = useRef(null);

    
    useEffect(() => {
        if (!map) return;

        
        const drawLayer = new L.FeatureGroup();
        map.addLayer(drawLayer);
        drawLayerRef.current = drawLayer;

        
        return () => {
            if (map && drawLayerRef.current) {
                map.removeLayer(drawLayerRef.current);
            }
        };
    }, [map]);

    
    const clearDrawing = () => {
        setPoints([]);
        if (drawLayerRef.current) {
            drawLayerRef.current.clearLayers();
        }
    };

    
    const addPoint = (lat, lng) => {
        
        const newPoints = [...points, [lat, lng]];
        setPoints(newPoints);

        
        L.circleMarker([lat, lng], {
            radius: 5,
            color: '#ff4500',
            fillColor: '#ff4500',
            fillOpacity: 1,
            weight: 2
        }).addTo(drawLayerRef.current);

        
        if (newPoints.length >= 2) {
            
            drawLayerRef.current.eachLayer(layer => {
                if (layer instanceof L.Polyline && !(layer instanceof L.CircleMarker)) {
                    drawLayerRef.current.removeLayer(layer);
                }
            });

            
            L.polyline(newPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawLayerRef.current);
        }
    };

    
    const handleMapClick = (e) => {
        console.log('Map click event received', e);

        if (!isDrawingMode) {
            console.log('Not in drawing mode, ignoring click');
            return;
        }

        console.log('Adding point at', e.latlng);

        
        addPoint(e.latlng.lat, e.latlng.lng);
    };

    
    const undoLastPoint = () => {
        if (points.length === 0) return;

        
        const newPoints = points.slice(0, -1);
        setPoints(newPoints);

        
        drawLayerRef.current.clearLayers();

        
        newPoints.forEach(point => {
            L.circleMarker(point, {
                radius: 5,
                color: '#ff4500',
                fillColor: '#ff4500',
                fillOpacity: 1,
                weight: 2
            }).addTo(drawLayerRef.current);
        });

        
        if (newPoints.length >= 2) {
            L.polyline(newPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawLayerRef.current);
        }
    };

    
    const completeDrawing = () => {
        if (points.length < 2) return;

        
        const roadMetrics = calculateRoadMetrics(points);

        
        const roadData = {
            ...roadMetrics,
            coordinates: points
        };

        
        onRoadDrawn(roadData);
    };

    
    useEffect(() => {
        if (!map) {
            console.log('Map not available yet');
            return;
        }

        console.log('Setting up drawing mode, isDrawingMode:', isDrawingMode);

        if (isDrawingMode) {
            console.log('Entering drawing mode, adding click handler');

            
            map.off('click');

            
            map.on('click', handleMapClick);

            
            map.getContainer().style.cursor = 'crosshair';

            
            const mapContainer = map.getContainer();
            const directClickHandler = (e) => {
                console.log('Direct DOM click on map container');

                
                if (e.target === mapContainer || e.target.classList.contains('leaflet-container')) {
                    const point = map.mouseEventToLatLng(e);
                    console.log('Converting DOM click to map point:', point);
                    addPoint(point.lat, point.lng);
                }
            };

            
            map._directClickHandler = directClickHandler;
            mapContainer.addEventListener('click', directClickHandler);

            console.log('Drawing mode setup complete');
        } else {
            
            map.off('click', handleMapClick);

            
            if (map._directClickHandler) {
                const mapContainer = map.getContainer();
                mapContainer.removeEventListener('click', map._directClickHandler);
                delete map._directClickHandler;
            }

            
            map.getContainer().style.cursor = '';

            
            clearDrawing();
        }

        
        return () => {
            if (map) {
                console.log('Cleaning up map handlers');

                
                map.off('click', handleMapClick);

                
                if (map._directClickHandler) {
                    const mapContainer = map.getContainer();
                    mapContainer.removeEventListener('click', map._directClickHandler);
                    delete map._directClickHandler;
                }

                
                map.getContainer().style.cursor = '';
            }
        };
    }, [isDrawingMode, map]);

    
    return (
        <div className="minimal-road-drawer">
            {isDrawingMode && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl z-[1200] text-center max-w-md w-full">
                    <p className="font-bold text-lg mb-2">Drawing Mode</p>
                    <p className="text-sm mb-1 text-red-500 font-semibold">Click directly on the map to add points to your road.</p>
                    <p className="text-sm mb-3 text-blue-600 font-bold">Drag the map normally to pan around.</p>

                    <div className="text-sm font-bold mb-3">
                        <div className={points.length > 0 ? "text-green-600" : "text-blue-600"}>
                            <p>{points.length} point{points.length !== 1 ? 's' : ''} added</p>
                            {points.length === 1 && (
                                <p className="mt-1 text-blue-500">Click again to add more points!</p>
                            )}
                            {points.length >= 2 && (
                                <p className="mt-1 text-blue-500">You can save your road now or add more points!</p>
                            )}
                            {points.length === 0 && (
                                <p>No points added yet. Click on the map to start drawing!</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 mb-2">
                        <button
                            onClick={undoLastPoint}
                            disabled={points.length === 0}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                points.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                            }`}
                            title="Undo Last Point"
                        >
                            <FaUndo className="mr-2" />
                            Undo Last Point
                        </button>

                        <button
                            onClick={clearDrawing}
                            disabled={points.length === 0}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                points.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                            title="Clear Drawing"
                        >
                            <FaTrash className="mr-2" />
                            Clear All
                        </button>

                        <button
                            onClick={completeDrawing}
                            disabled={points.length < 2}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                points.length < 2
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                            title="Complete Drawing"
                        >
                            <FaSave className="mr-2" />
                            Save Road
                        </button>

                        <button
                            onClick={() => {
                                clearDrawing();
                                setIsDrawingMode(false);
                            }}
                            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
                            title="Cancel Drawing"
                        >
                            <FaTimes className="mr-2" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MinimalRoadDrawer;
