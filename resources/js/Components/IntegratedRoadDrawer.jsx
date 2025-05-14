import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { calculateRoadMetrics } from '../utils/roadUtils';
import axios from 'axios';
import { FaDrawPolygon, FaTrash, FaSave, FaTimes, FaUndo } from 'react-icons/fa';

const IntegratedRoadDrawer = ({
    map,
    isDrawingMode,
    setIsDrawingMode,
    onRoadDrawn,
    auth
}) => {
    const drawnItemsRef = useRef(null);
    const pointsRef = useRef([]); 
    const [currentPolyline, setCurrentPolyline] = useState(null);
    const [activeDrawHandler, setActiveDrawHandler] = useState(null);
    const [points, setPoints] = useState([]);
    const [pointCount, setPointCount] = useState(0); 
    const [isDrawing, setIsDrawing] = useState(false);

    
    useEffect(() => {
        if (!map) return;

        console.log('Initializing drawing layer');

        
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        
        drawnItems.setZIndex(1000);

        
        const mapContainer = map.getContainer();
        mapContainer.classList.add('has-integrated-drawer');

        
        return () => {
            console.log('Cleaning up drawing layer');
            if (drawnItemsRef.current) {
                map.removeLayer(drawnItemsRef.current);
                drawnItemsRef.current = null;
            }

            
            mapContainer.classList.remove('has-integrated-drawer');
        };
    }, [map]);

    
    const [activeDrawing, setActiveDrawing] = useState(false);

    
    useEffect(() => {
        if (!map || !drawnItemsRef.current) return;

        
        const mapContainer = map.getContainer();

        if (isDrawingMode) {
            
            mapContainer.addEventListener('click', handleDirectMapClick);

            
            map.on('mousemove', handleMouseMove);

            
            map.dragging.enable();

            
            mapContainer.classList.add('drawing-mode-active');

            
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);

            
            mapContainer.style.cursor = 'crosshair';

            console.log('Drawing mode activated - Click to add points, hold SHIFT to pan map');
        } else {
            
            cleanupDrawing();

            
            mapContainer.removeEventListener('click', handleDirectMapClick);

            
            map.off('mousemove', handleMouseMove);

            
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);

            
            map.dragging.enable();

            
            mapContainer.classList.remove('drawing-mode-active');

            
            mapContainer.style.cursor = '';

            console.log('Drawing mode deactivated');
        }

        return () => {
            
            mapContainer.removeEventListener('click', handleDirectMapClick);
            map.off('mousemove', handleMouseMove);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);

            
            mapContainer.style.cursor = '';
        };
    }, [isDrawingMode, map]);

    
    const handleKeyDown = (e) => {
        if (e.key === 'Shift' && map && isDrawingMode) {
            setActiveDrawing(false);
            map.dragging.enable();
            const mapContainer = map.getContainer();
            mapContainer.style.cursor = 'grab';
            console.log('Panning mode activated (SHIFT key down)');
        }
    };

    
    const handleKeyUp = (e) => {
        if (e.key === 'Shift' && map && isDrawingMode) {
            setActiveDrawing(true);
            const mapContainer = map.getContainer();
            mapContainer.style.cursor = 'crosshair';
            console.log('Drawing mode reactivated (SHIFT key up)');
        }
    };

    
    const handleDirectMapClick = (e) => {
        
        if (e.target.closest('.integrated-road-drawer') ||
            e.target.closest('.leaflet-control') ||
            e.target.closest('.leaflet-popup') ||
            !isDrawingMode ||
            e.shiftKey) { 
            console.log('Click ignored - not on map, not in drawing mode, or shift key pressed');
            return;
        }

        console.log('Map clicked in drawing mode');

        
        const mapContainer = map.getContainer();
        const rect = mapContainer.getBoundingClientRect();

        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        
        const point = map.containerPointToLatLng([x, y]);
        const newPoint = [point.lat, point.lng];

        console.log('New point:', newPoint, 'at pixel position:', x, y);

        
        if (!isDrawing) {
            console.log('Starting new line');
            setIsDrawing(true);

            
            const marker = L.circleMarker([point.lat, point.lng], {
                radius: 5,
                color: '#ff4500',
                fillColor: '#ff4500',
                fillOpacity: 1,
                weight: 2
            }).addTo(drawnItemsRef.current);

            
            const polyline = L.polyline([[point.lat, point.lng]], {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawnItemsRef.current);

            
            const newPoints = [[point.lat, point.lng]];
            pointsRef.current = newPoints; 
            setCurrentPolyline(polyline);
            setPoints(newPoints);
            setPointCount(1); 

            
            console.log('Initial point set:', newPoints, 'Count:', 1);

            console.log('First point added, polyline created');
        } else {
            console.log('Adding point to existing line');

            
            L.circleMarker([point.lat, point.lng], {
                radius: 5,
                color: '#ff4500',
                fillColor: '#ff4500',
                fillOpacity: 1,
                weight: 2
            }).addTo(drawnItemsRef.current);

            
            const currentPoints = pointsRef.current || [];
            const updatedPoints = [...currentPoints, [point.lat, point.lng]];
            const newCount = updatedPoints.length;

            console.log('Updated points array:', updatedPoints, 'Length:', newCount);

            
            pointsRef.current = updatedPoints;
            setPoints(updatedPoints);
            setPointCount(newCount); 

            
            console.log('Points updated. New count:', newCount);

            
            if (currentPolyline) {
                currentPolyline.setLatLngs(updatedPoints);
                console.log('Polyline updated with new point, now has', updatedPoints.length, 'points');
            } else {
                
                console.log('Polyline was lost, recreating');
                const polyline = L.polyline(updatedPoints, {
                    color: '#ff4500',
                    weight: 4,
                    opacity: 0.8
                }).addTo(drawnItemsRef.current);
                setCurrentPolyline(polyline);
            }
        }

        
        if (drawnItemsRef.current) {
            drawnItemsRef.current.bringToFront();
        }
    };

    
    const handleMapClick = (e) => {
        if (!isDrawingMode) return;

        const newPoint = [e.latlng.lat, e.latlng.lng];
        console.log('Leaflet map click:', newPoint);

        
        if (!isDrawing) {
            setIsDrawing(true);
            setPoints([newPoint]);

            
            const polyline = L.polyline([newPoint], {
                color: '#3388ff',
                weight: 6,
                opacity: 0.8
            }).addTo(drawnItemsRef.current);
            setCurrentPolyline(polyline);
        } else {
            
            const updatedPoints = [...points, newPoint];
            setPoints(updatedPoints);

            
            if (currentPolyline) {
                currentPolyline.setLatLngs(updatedPoints);
            }
        }
    };

    
    const handleMouseMove = (e) => {
        if (!isDrawingMode || !isDrawing || points.length === 0) return;

        
        const tempPoints = [...points, [e.latlng.lat, e.latlng.lng]];

        
        if (currentPolyline) {
            currentPolyline.setLatLngs(tempPoints);

            
            currentPolyline.setStyle({
                color: '#ff4500',
                weight: 4,
                opacity: 0.8,
                dashArray: '5, 10' 
            });

            
            currentPolyline.bringToFront();
        } else if (points.length > 0) {
            
            console.log('Recreating polyline during mouse move');
            const polyline = L.polyline(tempPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8,
                dashArray: '5, 10' 
            }).addTo(drawnItemsRef.current);
            setCurrentPolyline(polyline);
        }

        
        if (drawnItemsRef.current) {
            drawnItemsRef.current.bringToFront();
        }
    };

    
    const completeDrawing = () => {
        if (!isDrawing || pointCount < 2) return;

        
        const currentPoints = pointsRef.current || [];
        console.log('Completing drawing with points:', currentPoints, 'Count:', pointCount);

        
        const roadMetrics = calculateRoadMetrics(currentPoints);
        console.log('Road metrics:', roadMetrics);

        
        getElevationData(currentPoints).then(elevationData => {
            console.log('Elevation data:', elevationData);

            const roadData = {
                ...roadMetrics,
                ...elevationData,
                coordinates: currentPoints
            };

            console.log('Final road data:', roadData);
            onRoadDrawn(roadData);

            
            
            setIsDrawing(false);
        }).catch(error => {
            console.error('Error getting elevation data:', error);

            
            const roadData = {
                ...roadMetrics,
                elevation_gain: 0,
                elevation_loss: 0,
                max_elevation: 0,
                min_elevation: 0,
                coordinates: currentPoints
            };

            console.log('Final road data (without elevation):', roadData);
            onRoadDrawn(roadData);

            
            setIsDrawing(false);
        });
    };

    
    const clearDrawing = () => {
        try {
            
            setIsDrawing(false);
            setPoints([]);
            setPointCount(0);
            pointsRef.current = [];

            
            if (drawnItemsRef.current) {
                drawnItemsRef.current.clearLayers();
            }

            
            setCurrentPolyline(null);

            
            onRoadDrawn(null);

            
            cleanupDrawingElements();

            console.log('Drawing cleared, point count reset to 0');
        } catch (error) {
            console.error("Error clearing drawing:", error);
        }
    };

    
    const undoLastPoint = () => {
        if (pointCount <= 1) {
            
            clearDrawing();
            return;
        }

        
        const currentPoints = pointsRef.current || [];

        
        const updatedPoints = currentPoints.slice(0, -1);
        const newCount = updatedPoints.length;

        
        pointsRef.current = updatedPoints;
        setPoints(updatedPoints);
        setPointCount(newCount);

        
        if (currentPolyline) {
            currentPolyline.setLatLngs(updatedPoints);
        }

        console.log('Last point removed. New count:', newCount);
    };

    
    const cleanupDrawing = () => {
        console.log('Cleaning up drawing');

        
        setIsDrawing(false);
        setPoints([]);
        setPointCount(0);
        pointsRef.current = [];

        
        if (drawnItemsRef.current) {
            console.log('Clearing drawn items layer');
            drawnItemsRef.current.eachLayer(layer => {
                drawnItemsRef.current.removeLayer(layer);
            });
            drawnItemsRef.current.clearLayers();
        }

        
        if (currentPolyline) {
            console.log('Removing current polyline');
            if (map && map.hasLayer(currentPolyline)) {
                map.removeLayer(currentPolyline);
            }
            if (drawnItemsRef.current && drawnItemsRef.current.hasLayer(currentPolyline)) {
                drawnItemsRef.current.removeLayer(currentPolyline);
            }
            setCurrentPolyline(null);
        }

        
        cleanupDrawingElements();

        
        if (map) {
            console.log('Forcing map redraw');
            map.invalidateSize();
        }
    };

    
    const cleanupDrawingElements = () => {
        console.log('Cleaning up drawing elements from DOM');

        
        const editMarkers = document.querySelectorAll('.leaflet-editing-icon, .leaflet-marker-icon:not(.main-location-marker), .leaflet-marker-shadow, .leaflet-draw-guide-dash');
        editMarkers.forEach(marker => {
            marker.remove();
        });

        
        const drawControls = document.querySelectorAll('.leaflet-draw, .leaflet-draw-toolbar, .leaflet-draw-section, .leaflet-draw-actions');
        drawControls.forEach(control => {
            control.remove();
        });

        
        const guideLines = document.querySelectorAll('.leaflet-draw-guide-dash, .leaflet-draw-tooltip');
        guideLines.forEach(line => {
            line.remove();
        });

        
        const polylinePaths = document.querySelectorAll('.leaflet-interactive:not(.main-location-marker)');
        polylinePaths.forEach(path => {
            
            if (path.classList.contains('leaflet-interactive') && !path.classList.contains('road-polyline')) {
                path.remove();
            }
        });
    };

    
    const getElevationData = async (coordinates) => {
        try {
            
            const sampledCoordinates = coordinates.filter((_, index) => index % 10 === 0);
            
            if (sampledCoordinates.length < 3 && coordinates.length >= 3) {
                sampledCoordinates.push(coordinates[0]);
                sampledCoordinates.push(coordinates[Math.floor(coordinates.length / 2)]);
                sampledCoordinates.push(coordinates[coordinates.length - 1]);
            }
            
            const locations = sampledCoordinates.map(coord => `${coord[0]},${coord[1]}`).join('|');
            
            const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${locations}`, {
                withCredentials: false
            });
            if (response.data && response.data.results) {
                const elevations = response.data.results.map(result => result.elevation);
                
                const elevationGain = calculateElevationGain(elevations);
                const elevationLoss = calculateElevationLoss(elevations);
                const maxElevation = Math.max(...elevations);
                const minElevation = Math.min(...elevations);
                return {
                    elevation_gain: elevationGain,
                    elevation_loss: elevationLoss,
                    max_elevation: maxElevation,
                    min_elevation: minElevation
                };
            }
            return {
                elevation_gain: 0,
                elevation_loss: 0,
                max_elevation: 0,
                min_elevation: 0
            };
        } catch (error) {
            return {
                elevation_gain: 0,
                elevation_loss: 0,
                max_elevation: 0,
                min_elevation: 0
            };
        }
    };

    
    const calculateElevationGain = (elevations) => {
        let gain = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) gain += diff;
        }
        return gain;
    };

    
    const calculateElevationLoss = (elevations) => {
        let loss = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff < 0) loss += Math.abs(diff);
        }
        return loss;
    };

    return (
        <div className="integrated-road-drawer">
            {isDrawingMode && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl z-[1200] text-center max-w-md w-full">
                    <p className="font-bold text-lg mb-2">Drawing Mode</p>
                    <p className="text-sm mb-1 text-red-500 font-semibold">Click directly on the map to add points to your road.</p>
                    <p className="text-sm mb-3 text-blue-600 font-bold">Hold SHIFT key to pan/drag the map.</p>

                    <div className="text-sm font-bold mb-3">
                        {isDrawing && pointCount > 0 ? (
                            <div className="text-green-600">
                                <p>{pointCount} point{pointCount !== 1 ? 's' : ''} added</p>
                                {pointCount === 1 && (
                                    <p className="mt-1 text-blue-500">Click again to add more points!</p>
                                )}
                                {pointCount >= 2 && (
                                    <p className="mt-1 text-blue-500">You can save your road now or add more points!</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-blue-600">
                                <p>No points added yet. Click on the map to start drawing!</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 mb-2">
                        <button
                            onClick={undoLastPoint}
                            disabled={!isDrawing || pointCount === 0}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                !isDrawing || pointCount === 0
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
                            disabled={!isDrawing || pointCount === 0}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                !isDrawing || pointCount === 0
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
                            disabled={!isDrawing || pointCount < 2}
                            className={`px-3 py-2 rounded-md flex items-center ${
                                !isDrawing || pointCount < 2
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

export default IntegratedRoadDrawer;
