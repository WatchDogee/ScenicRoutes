import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { calculateRoadMetrics } from '../utils/roadUtils';
import axios from 'axios';
import { FaTrash, FaSave, FaTimes, FaUndo } from 'react-icons/fa';

const BasicRoadDrawer = ({
    map,
    isDrawingMode,
    setIsDrawingMode,
    onRoadDrawn,
    auth
}) => {
    
    const [drawnPoints, setDrawnPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPolyline, setCurrentPolyline] = useState(null);

    
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
        setCurrentPolyline(null);

        if (drawLayerRef.current) {
            drawLayerRef.current.clearLayers();
        }

        onRoadDrawn(null);
        console.log('Drawing cleared');
    };

    
    const [isShiftPressed, setIsShiftPressed] = useState(false);

    
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

        
        if (currentPolyline) {
            currentPolyline.setLatLngs(updatedPoints);
        } else {
            const polyline = L.polyline(updatedPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawLayerRef.current);
            setCurrentPolyline(polyline);
        }

        console.log('Points updated, count:', updatedPoints.length);
    };

    
    const handleMapClick = (e) => {
        
        if (e.target.closest('.basic-road-drawer') ||
            e.target.closest('.leaflet-control') ||
            e.target.closest('.leaflet-popup') ||
            !isDrawingMode ||
            isShiftPressed ||  
            e.shiftKey) {
            return;
        }

        console.log('Map clicked in drawing mode');

        
        const mapContainer = map.getContainer();
        const rect = mapContainer.getBoundingClientRect();

        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        
        const point = map.containerPointToLatLng([x, y]);

        
        addPointAtCoordinates(point.lat, point.lng);
    };

    
    const handleLeafletMapClick = (e) => {
        if (!isDrawingMode || isShiftPressed) {
            return;
        }

        console.log('Leaflet map clicked in drawing mode');

        
        addPointAtCoordinates(e.latlng.lat, e.latlng.lng);
    };

    
    const handleKeyDown = (e) => {
        if (e.key === 'Shift' && map && !isShiftPressed) {
            setIsShiftPressed(true);

            
            map.dragging.enable();
            map.boxZoom.disable();
            map.getContainer().style.cursor = 'grab';

            
            map.getContainer().classList.add('panning-mode');

            
            e.preventDefault();

            
            if (!map._customDragHandler) {
                map._customDragHandler = new L.Handler.Drag(map);
            }

            
            if (map._customDragHandler && !map._customDragHandler._enabled) {
                map._customDragHandler.enable();
            }

            console.log('Shift key down - panning mode activated');
        }
    };

    
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState(null);

    
    const handleMouseDown = (e) => {
        
        if (isShiftPressed && isDrawingMode) {
            map.getContainer().style.cursor = 'grabbing';
            setIsDragging(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });

            
            e.preventDefault();
            e.stopPropagation();
        }
    };

    
    const handleMouseMove = (e) => {
        if (isDragging && isShiftPressed && lastMousePos) {
            
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;

            
            map.panBy([-dx, -dy]);

            
            setLastMousePos({ x: e.clientX, y: e.clientY });

            
            e.preventDefault();
            e.stopPropagation();
        }
    };

    
    const handleMouseUp = (e) => {
        
        if (isShiftPressed && isDrawingMode) {
            map.getContainer().style.cursor = 'grab';
            setIsDragging(false);
            setLastMousePos(null);
        }
    };

    
    const handleKeyUp = (e) => {
        if (e.key === 'Shift' && map && isShiftPressed) {
            setIsShiftPressed(false);

            
            map.boxZoom.enable();
            map.getContainer().style.cursor = 'crosshair';

            
            map.getContainer().classList.remove('panning-mode');

            
            map.dragging.disable();

            
            if (map._customDragHandler && map._customDragHandler._enabled) {
                map._customDragHandler.disable();
            }

            console.log('Shift key up - drawing mode reactivated');
        }
    };

    
    useEffect(() => {
        if (!map) return;

        
        const mapContainer = map.getContainer();

        if (isDrawingMode) {
            
            mapContainer.addEventListener('click', handleMapClick);

            
            map.on('click', handleLeafletMapClick);

            
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);

            
            mapContainer.addEventListener('mousedown', handleMouseDown);
            mapContainer.addEventListener('mousemove', handleMouseMove);
            mapContainer.addEventListener('mouseup', handleMouseUp);

            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            
            mapContainer.style.cursor = 'crosshair';

            
            map.dragging.disable();

            
            const originalKeyboardPanValue = map.keyboard.enabled();
            map._originalKeyboardPan = originalKeyboardPanValue;
            map.keyboard.disable();

            console.log('Drawing mode activated - Click to add points, hold SHIFT to pan');
        } else {
            
            mapContainer.removeEventListener('click', handleMapClick);
            map.off('click', handleLeafletMapClick);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            mapContainer.removeEventListener('mousedown', handleMouseDown);
            mapContainer.removeEventListener('mousemove', handleMouseMove);
            mapContainer.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            
            mapContainer.classList.remove('panning-mode');

            
            mapContainer.style.cursor = '';

            
            map.dragging.enable();

            
            if (map._originalKeyboardPan !== undefined) {
                if (map._originalKeyboardPan) {
                    map.keyboard.enable();
                }
                delete map._originalKeyboardPan;
            }

            
            clearDrawing();
        }

        return () => {
            mapContainer.removeEventListener('click', handleMapClick);
            map.off('click', handleLeafletMapClick);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            mapContainer.removeEventListener('mousedown', handleMouseDown);
            mapContainer.removeEventListener('mousemove', handleMouseMove);
            mapContainer.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            
            mapContainer.classList.remove('panning-mode');

            
            if (map) {
                map.dragging.enable();
                map.boxZoom.enable();

                
                if (map._customDragHandler && map._customDragHandler._enabled) {
                    map._customDragHandler.disable();
                }

                
                if (map._originalKeyboardPan !== undefined) {
                    if (map._originalKeyboardPan) {
                        map.keyboard.enable();
                    }
                    delete map._originalKeyboardPan;
                }
            }
        };
    }, [isDrawingMode, map, drawnPoints, currentPolyline]);

    
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

            
            const polyline = L.polyline(updatedPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawLayerRef.current);
            setCurrentPolyline(polyline);
        }

        console.log('Last point removed, count:', updatedPoints.length);
    };

    
    const getElevationData = async (coordinates) => {
        try {
            
            const sampledCoordinates = coordinates.filter((_, index) => index % 10 === 0);

            
            const locations = sampledCoordinates.map(coord => `${coord[0]},${coord[1]}`).join('|');

            
            const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${locations}`, {
                withCredentials: false
            });

            if (response.data && response.data.results) {
                const elevations = response.data.results.map(result => result.elevation);
                return {
                    elevation_gain: calculateElevationChange(elevations, true),
                    elevation_loss: calculateElevationChange(elevations, false),
                    max_elevation: Math.max(...elevations),
                    min_elevation: Math.min(...elevations)
                };
            }

            return { elevation_gain: 0, elevation_loss: 0, max_elevation: 0, min_elevation: 0 };
        } catch (error) {
            return { elevation_gain: 0, elevation_loss: 0, max_elevation: 0, min_elevation: 0 };
        }
    };

    
    const calculateElevationChange = (elevations, isGain) => {
        let change = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if ((isGain && diff > 0) || (!isGain && diff < 0)) {
                change += Math.abs(diff);
            }
        }
        return change;
    };

    
    const completeDrawing = () => {
        if (!isDrawing || drawnPoints.length < 2) return;

        console.log('Completing drawing with points:', drawnPoints);

        
        const roadMetrics = calculateRoadMetrics(drawnPoints);

        
        getElevationData(drawnPoints).then(elevationData => {
            const roadData = {
                ...roadMetrics,
                ...elevationData,
                coordinates: drawnPoints
            };

            console.log('Road data:', roadData);
            onRoadDrawn(roadData);
        }).catch(error => {
            console.error('Error getting elevation data:', error);

            
            const roadData = {
                ...roadMetrics,
                elevation_gain: 0,
                elevation_loss: 0,
                max_elevation: 0,
                min_elevation: 0,
                coordinates: drawnPoints
            };

            onRoadDrawn(roadData);
        });
    };

    
    return (
        <div className="basic-road-drawer">
            {isDrawingMode && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl z-[1200] text-center max-w-md w-full">
                    <p className="font-bold text-lg mb-2">Drawing Mode</p>
                    <p className="text-sm mb-1 text-red-500 font-semibold">Click directly on the map to add points to your road.</p>
                    <p className="text-sm mb-3 text-blue-600 font-bold">Hold SHIFT key to pan/drag the map.</p>

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
                            <li><strong>Hold SHIFT key</strong> to pan/drag the map</li>
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

export default BasicRoadDrawer;
