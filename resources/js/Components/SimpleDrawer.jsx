import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { calculateRoadMetrics } from '../utils/roadUtils';
import axios from 'axios';
import { FaTrash, FaSave, FaTimes, FaUndo } from 'react-icons/fa';

const SimpleDrawer = ({
    map,
    isDrawingMode,
    setIsDrawingMode,
    onRoadDrawn,
    auth
}) => {
    
    const [drawnPoints, setDrawnPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);

    
    const drawLayerRef = useRef(null);

    
    useEffect(() => {
        if (!map) return;

        console.log('Initializing drawing layer');
        const drawLayer = new L.FeatureGroup();
        map.addLayer(drawLayer);
        drawLayerRef.current = drawLayer;

        return () => {
            if (drawLayerRef.current) {
                map.removeLayer(drawLayerRef.current);
            }
        };
    }, [map]);

    
    const clearDrawing = () => {
        setDrawnPoints([]);
        setIsDrawing(false);

        if (drawLayerRef.current) {
            drawLayerRef.current.clearLayers();
        }

        onRoadDrawn(null);
        console.log('Drawing cleared');
    };

    
    const addPointAtCoordinates = (lat, lng) => {
        console.log('Adding point at:', lat, lng);

        
        L.circleMarker([lat, lng], {
            radius: 5,
            color: '#ff4500',
            fillColor: '#ff4500',
            fillOpacity: 1,
            weight: 2
        }).addTo(drawLayerRef.current);

        
        const newPoint = [lat, lng];
        const updatedPoints = [...drawnPoints, newPoint];
        setDrawnPoints(updatedPoints);
        setIsDrawing(true);

        
        if (updatedPoints.length >= 2) {
            
            drawLayerRef.current.eachLayer(layer => {
                if (layer instanceof L.Polyline && !(layer instanceof L.CircleMarker)) {
                    drawLayerRef.current.removeLayer(layer);
                }
            });

            
            L.polyline(updatedPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawLayerRef.current);
        }

        console.log('Points updated, count:', updatedPoints.length);
    };

    
    const handleMapClick = (e) => {
        console.log('Map click event received', e);

        
        if (!isDrawingMode) {
            console.log('Not in drawing mode, ignoring click');
            return;
        }

        
        if (e.originalEvent && (
            e.originalEvent.target.closest('.leaflet-control') ||
            e.originalEvent.target.closest('.simple-drawer') ||
            e.originalEvent.target.closest('button')
        )) {
            console.log('Click on control or UI element, ignoring');
            return;
        }

        console.log('Map clicked in drawing mode, adding point at', e.latlng);

        
        addPointAtCoordinates(e.latlng.lat, e.latlng.lng);
    };

    
    const undoLastPoint = () => {
        if (drawnPoints.length <= 1) {
            clearDrawing();
            return;
        }

        const updatedPoints = drawnPoints.slice(0, -1);
        setDrawnPoints(updatedPoints);

        
        if (drawLayerRef.current) {
            drawLayerRef.current.clearLayers();

            
            updatedPoints.forEach(point => {
                L.circleMarker(point, {
                    radius: 5,
                    color: '#ff4500',
                    fillColor: '#ff4500',
                    fillOpacity: 1,
                    weight: 2
                }).addTo(drawLayerRef.current);
            });

            
            if (updatedPoints.length >= 2) {
                L.polyline(updatedPoints, {
                    color: '#ff4500',
                    weight: 4,
                    opacity: 0.8
                }).addTo(drawLayerRef.current);
            }
        }

        console.log('Last point removed, count:', updatedPoints.length);
    };

    
    const completeDrawing = () => {
        if (!isDrawing || drawnPoints.length < 2) return;

        console.log('Completing drawing with points:', drawnPoints);

        
        const roadMetrics = calculateRoadMetrics(drawnPoints);

        
        const roadData = {
            ...roadMetrics,
            coordinates: drawnPoints
        };

        console.log('Road data:', roadData);
        onRoadDrawn(roadData);
    };

    
    useEffect(() => {
        if (!map) {
            console.log('Map not available yet');
            return;
        }

        console.log('Setting up map handlers, drawing mode:', isDrawingMode);

        if (isDrawingMode) {
            
            map.dragging.enable();

            
            map.off('click');

            
            map.on('click', handleMapClick, { priority: 'high' });

            
            const mapContainer = map.getContainer();
            mapContainer.addEventListener('click', (e) => {
                
                if (e.target === mapContainer || e.target.classList.contains('leaflet-container')) {
                    console.log('Direct map container click');
                    const point = map.mouseEventToLatLng(e);
                    addPointAtCoordinates(point.lat, point.lng);
                }
            });

            console.log('Drawing mode activated - Click to add points, drag to pan');
        } else {
            
            map.off('click', handleMapClick);

            const mapContainer = map.getContainer();
            mapContainer.removeEventListener('click', handleMapClick);

            
            clearDrawing();

            console.log('Drawing mode deactivated');
        }

        return () => {
            if (map) {
                
                map.off('click', handleMapClick);

                const mapContainer = map.getContainer();
                mapContainer.removeEventListener('click', handleMapClick);
            }
        };
    }, [isDrawingMode, map]);

    
    return (
        <div className="simple-drawer">
            {isDrawingMode && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl z-[1200] text-center max-w-md w-full">
                    <p className="font-bold text-lg mb-2">Drawing Mode</p>
                    <p className="text-sm mb-1 text-red-500 font-semibold">Click directly on the map to add points to your road.</p>
                    <p className="text-sm mb-3 text-blue-600 font-bold">Drag the map normally to pan around.</p>

                    <div className="text-sm font-bold mb-3">
                        <div className={drawnPoints.length > 0 ? "text-green-600" : "text-blue-600"}>
                            <p>{drawnPoints.length} point{drawnPoints.length !== 1 ? 's' : ''} added</p>
                            {drawnPoints.length === 1 && (
                                <p className="mt-1 text-blue-500">Click again to add more points!</p>
                            )}
                            {drawnPoints.length >= 2 && (
                                <p className="mt-1 text-blue-500">You can save your road now or add more points!</p>
                            )}
                            {drawnPoints.length === 0 && (
                                <p>No points added yet. Click on the map to start drawing!</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 mb-2">
                        <button
                            onClick={undoLastPoint}
                            disabled={drawnPoints.length === 0}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                drawnPoints.length === 0
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
                            disabled={drawnPoints.length === 0}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                drawnPoints.length === 0
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
                            disabled={drawnPoints.length < 2}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                drawnPoints.length < 2
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

                    <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                        <p className="font-bold">Tips:</p>
                        <ul className="list-disc list-inside text-left mt-1">
                            <li>Click on the map to add points</li>
                            <li>Drag the map normally to pan around</li>
                            <li>Add at least 2 points to save your road</li>
                            <li>Use "Undo" to remove the last point</li>
                            <li>Use "Clear All" to start over</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleDrawer;
