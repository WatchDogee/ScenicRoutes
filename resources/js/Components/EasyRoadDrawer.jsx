import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { calculateRoadMetrics } from '../utils/roadUtils';
import { FaTrash, FaSave, FaTimes, FaUndo } from 'react-icons/fa';

const EasyRoadDrawer = ({
    map,
    isDrawingMode,
    setIsDrawingMode,
    onRoadDrawn,
    auth
}) => {
    
    const [points, setPoints] = useState([]);
    const drawLayerRef = useRef(new L.FeatureGroup());
    const [polyline, setPolyline] = useState(null);

    
    useEffect(() => {
        if (!map) return;

        
        map.addLayer(drawLayerRef.current);

        
        return () => {
            if (map && drawLayerRef.current) {
                map.removeLayer(drawLayerRef.current);
            }
        };
    }, [map]);

    
    const clearDrawing = () => {
        setPoints([]);
        drawLayerRef.current.clearLayers();
        setPolyline(null);
    };

    
    const addPoint = (latlng) => {
        console.log('Adding point at', latlng);

        
        const newPoints = [...points, [latlng.lat, latlng.lng]];
        setPoints(newPoints);

        
        const marker = L.circleMarker([latlng.lat, latlng.lng], {
            radius: 5,
            color: '#ff4500',
            fillColor: '#ff4500',
            fillOpacity: 1,
            weight: 2
        }).addTo(drawLayerRef.current);

        
        if (newPoints.length >= 2) {
            if (polyline) {
                
                drawLayerRef.current.removeLayer(polyline);
            }

            
            const newPolyline = L.polyline(newPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawLayerRef.current);

            setPolyline(newPolyline);
        }
    };

    
    const handleMapClick = (e) => {
        console.log('Map clicked', e);

        
        if (!isDrawingMode) {
            console.log('Not in drawing mode, ignoring click');
            return;
        }

        
        if (e.originalEvent && (
            e.originalEvent.target.closest('.leaflet-control') ||
            e.originalEvent.target.closest('.easy-road-drawer') ||
            e.originalEvent.target.closest('button')
        )) {
            console.log('Click on control or UI element, ignoring');
            return;
        }

        
        addPoint(e.latlng);
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
            const newPolyline = L.polyline(newPoints, {
                color: '#ff4500',
                weight: 4,
                opacity: 0.8
            }).addTo(drawLayerRef.current);

            setPolyline(newPolyline);
        } else {
            setPolyline(null);
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
        if (!map) return;

        if (isDrawingMode) {
            console.log('Entering drawing mode');

            
            map.dragging.enable();

            
            map.on('click', handleMapClick);

            
            map.getContainer().style.cursor = 'crosshair';
        } else {
            
            map.off('click', handleMapClick);

            
            map.getContainer().style.cursor = '';

            
            clearDrawing();
        }

        
        return () => {
            if (map) {
                map.off('click', handleMapClick);
                map.getContainer().style.cursor = '';
            }
        };
    }, [isDrawingMode, map]);

    
    return (
        <div className="easy-road-drawer">
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

export default EasyRoadDrawer;
