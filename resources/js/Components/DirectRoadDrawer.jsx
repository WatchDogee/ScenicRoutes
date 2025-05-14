import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { calculateRoadMetrics } from '../utils/roadUtils';
import { FaTrash, FaSave, FaTimes, FaUndo } from 'react-icons/fa';

const DirectRoadDrawer = ({ map, isDrawingMode, setIsDrawingMode, onRoadDrawn }) => {
    
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
        
        const newPoint = [lat, lng];

        
        
        setPoints(prevPoints => {
            const newPoints = [...prevPoints, newPoint];

            
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

            return newPoints;
        });
    };

    
    const undoLastPoint = () => {
        if (points.length === 0) return;

        
        setPoints(prevPoints => {
            if (prevPoints.length === 0) return prevPoints;

            const newPoints = prevPoints.slice(0, -1);

            
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

            return newPoints;
        });
    };

    
    const completeDrawing = () => {
        if (points.length < 2) {
            return;
        }

        
        const roadMetrics = calculateRoadMetrics(points);

        
        const roadData = {
            ...roadMetrics,
            coordinates: points
        };

        
        onRoadDrawn(roadData);
    };

    
    const mapStateRef = useRef({
        center: null,
        zoom: null,
        bounds: null
    });

    
    useEffect(() => {
        if (!map) return;

        
        if (!mapStateRef.current.center) {
            mapStateRef.current = {
                center: map.getCenter(),
                zoom: map.getZoom(),
                bounds: map.getBounds()
            };
        }

        
        const handleMapClick = (e) => {
            
            if (!isDrawingMode) {
                return;
            }

            
            if (e.target.closest('.direct-road-drawer') ||
                e.target.closest('.leaflet-control') ||
                e.target.closest('button')) {
                return;
            }

            
            const rect = map.getContainer().getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const latlng = map.containerPointToLatLng([x, y]);

            
            addPoint(latlng.lat, latlng.lng);
        };

        
        const ensureMapTilesVisible = () => {
            
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const currentBounds = map.getBounds();

            
            mapStateRef.current = {
                center: currentCenter,
                zoom: currentZoom,
                bounds: currentBounds
            };

            
            const mapContainer = map.getContainer();
            mapContainer.style.width = '100%';
            mapContainer.style.height = '100%';
            mapContainer.style.position = 'relative';
            mapContainer.style.overflow = 'hidden';
            mapContainer.style.visibility = 'visible';
            mapContainer.style.opacity = '1';
            mapContainer.style.display = 'block';

            
            const tileContainers = document.querySelectorAll('.leaflet-tile-container');
            tileContainers.forEach(container => {
                container.style.visibility = 'visible';
                container.style.opacity = '1';
                container.style.display = 'block';
                container.style.position = 'absolute';
            });

            
            const tiles = document.querySelectorAll('.leaflet-tile');
            tiles.forEach(tile => {
                tile.style.visibility = 'visible';
                tile.style.opacity = '1';
                tile.style.display = 'block';
                tile.style.position = 'absolute';
            });

            
            const tileImages = document.querySelectorAll('.leaflet-tile-container img, .leaflet-tile img');
            tileImages.forEach(img => {
                img.style.visibility = 'visible';
                img.style.opacity = '1';
                img.style.display = 'block';
                img.style.mixBlendMode = 'normal';
                img.style.filter = 'none';
                
            });

            
            const mapPane = document.querySelector('.leaflet-map-pane');
            if (mapPane) {
                mapPane.style.visibility = 'visible';
                mapPane.style.opacity = '1';
                mapPane.style.display = 'block';
                mapPane.style.position = 'absolute';
            }

            
            map.invalidateSize(true);

            
            map.eachLayer(layer => {
                if (layer.redraw) {
                    layer.redraw();
                }
            });

            
            map.setView(currentCenter, currentZoom, { animate: false });

            
            map.fitBounds(currentBounds, { animate: false });
        };

        if (isDrawingMode) {
            
            mapStateRef.current = {
                center: map.getCenter(),
                zoom: map.getZoom(),
                bounds: map.getBounds()
            };

            
            map.getContainer().style.cursor = 'crosshair';

            
            map.getContainer().classList.add('drawing-mode');
            document.body.classList.add('drawing-mode');

            
            map.getContainer().addEventListener('click', handleMapClick);

            
            map._directClickHandler = handleMapClick;

            
            ensureMapTilesVisible();

            
            setTimeout(ensureMapTilesVisible, 100);
            setTimeout(ensureMapTilesVisible, 300);
            setTimeout(ensureMapTilesVisible, 500);
            setTimeout(ensureMapTilesVisible, 1000);
        } else {
            
            map.getContainer().style.cursor = '';

            
            map.getContainer().classList.remove('drawing-mode');
            document.body.classList.remove('drawing-mode');

            
            if (map._directClickHandler) {
                map.getContainer().removeEventListener('click', map._directClickHandler);
                delete map._directClickHandler;
            }

            
            clearDrawing();

            
            ensureMapTilesVisible();
            setTimeout(ensureMapTilesVisible, 100);
            setTimeout(ensureMapTilesVisible, 300);
            setTimeout(ensureMapTilesVisible, 500);
        }

        
        return () => {
            if (map) {
                
                map.getContainer().style.cursor = '';

                
                map.getContainer().classList.remove('drawing-mode');
                document.body.classList.remove('drawing-mode');

                
                if (map._directClickHandler) {
                    map.getContainer().removeEventListener('click', map._directClickHandler);
                    delete map._directClickHandler;
                }

                
                ensureMapTilesVisible();
            }
        };
    }, [isDrawingMode, map]); 

    
    return (
        <div className="direct-road-drawer">
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

export default DirectRoadDrawer;
