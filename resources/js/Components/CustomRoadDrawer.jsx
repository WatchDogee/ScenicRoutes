import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { calculateRoadMetrics } from '../utils/roadUtils';
import axios from 'axios';
const CustomRoadDrawer = ({
    map,
    isDrawingMode,
    setIsDrawingMode,
    onRoadDrawn
}) => {
    const drawControlRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const [currentPolyline, setCurrentPolyline] = useState(null);
    useEffect(() => {
        if (!map) return;
        
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;
        
        const handleMapMoveEvent = () => {
            if (currentPolyline && drawnItemsRef.current) {
                
                if (!drawnItemsRef.current.hasLayer(currentPolyline)) {
                    drawnItemsRef.current.addLayer(currentPolyline);
                }
                
                if (drawnItemsRef.current.bringToFront) {
                    drawnItemsRef.current.bringToFront();
                }
            }
        };
        
        map.on('moveend', handleMapMoveEvent);
        map.on('zoomend', handleMapMoveEvent);
        map.on('dragend', handleMapMoveEvent);
        
        const drawControl = new L.Control.Draw({
            position: 'topleft', 
            draw: {
                marker: false,
                circle: false,
                rectangle: false,
                polygon: false,
                circlemarker: false,
                polyline: {
                    shapeOptions: {
                        color: '#3388ff',
                        weight: 6,
                        opacity: 0.8
                    },
                    metric: true,
                    showLength: true,
                    feet: false,
                    tooltip: {
                        start: 'Click to start drawing road',
                        cont: 'Click to continue drawing road',
                        end: 'Double-click to finish'
                    },
                    
                    zIndexOffset: 2000,
                    completeOnDoubleClick: true,
                    showLengthPopup: false,
                    repeatMode: false,
                    allowIntersection: true,
                    drawError: {
                        color: '#e1e100',
                        message: ''
                    },
                    icon: new L.DivIcon({
                        iconSize: new L.Point(8, 8),
                        className: 'leaflet-div-icon leaflet-editing-icon'
                    })
                }
            },
            edit: {
                featureGroup: drawnItems,
                remove: true,
                poly: {
                    allowIntersection: true
                },
                
                edit: {
                    selectedPathOptions: {
                        dashArray: '10, 10',
                        fill: true,
                        fillColor: '#fe57a1',
                        fillOpacity: 0.1,
                        maintainColor: false
                    }
                }
            }
        });
        drawControlRef.current = drawControl;
        
        map.on(L.Draw.Event.CREATED, function (e) {
            const layer = e.layer;
            drawnItems.addLayer(layer);
            setCurrentPolyline(layer);
            
            
        });
        
        map.on(L.Draw.Event.EDITED, function (e) {
            const layers = e.layers;
            layers.eachLayer(function (layer) {
                if (layer instanceof L.Polyline) {
                    const coordinates = layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
                    
                    const roadMetrics = calculateRoadMetrics(coordinates);
                    
                    getElevationData(coordinates).then(elevationData => {
                        
                        const roadData = {
                            ...roadMetrics,
                            ...elevationData,
                            coordinates
                        };
                        
                        onRoadDrawn(roadData);
                    });
                }
            });
        });
        
        map.on(L.Draw.Event.DELETED, function () {
            setCurrentPolyline(null);
            onRoadDrawn(null);
        });
        
        return () => {
            map.off(L.Draw.Event.CREATED);
            map.off(L.Draw.Event.EDITED);
            map.off(L.Draw.Event.DELETED);
            
            map.off('moveend');
            map.off('zoomend');
            map.off('dragend');
            if (drawnItemsRef.current) {
                map.removeLayer(drawnItemsRef.current);
            }
        };
    }, [map, onRoadDrawn]);
    
    useEffect(() => {
        if (!map || !drawControlRef.current) {
            return;
        }
        if (isDrawingMode) {
            try {
                
                map.addControl(drawControlRef.current);
                

                
                setTimeout(() => {
                    if (map) {
                        
                        let redrawCount = 0;
                        map.eachLayer(layer => {
                            if (layer.redraw) {
                                redrawCount++;
                                layer.redraw();
                            }
                        });

                        
                        let tileLayerCount = 0;
                        map.eachLayer(layer => {
                            if (layer instanceof L.TileLayer) {
                                tileLayerCount++;
                                layer.setOpacity(1);
                            }
                        });

                        
                        map.invalidateSize();

                        
                    }
                }, 100);
            } catch (error) {
            }
        } else {
            
            try {
                map.removeControl(drawControlRef.current);
                
                const drawControls = document.querySelectorAll('.leaflet-draw');
                drawControls.forEach((el) => {
                    el.remove();
                });
                
                const drawToolbars = document.querySelectorAll('.leaflet-draw-toolbar');
                drawToolbars.forEach((el) => {
                    el.remove();
                });
                
                const drawRelated = document.querySelectorAll('.leaflet-draw-section, .leaflet-draw-actions');
                drawRelated.forEach((el) => {
                    el.remove();
                });
            } catch (error) {
            }
            
            if (drawnItemsRef.current) {
                drawnItemsRef.current.clearLayers();
                setCurrentPolyline(null);
            }
            
            setTimeout(() => {
                if (map) {
                    
                    let redrawCount = 0;
                    map.eachLayer(layer => {
                        if (layer.redraw) {
                            redrawCount++;
                            layer.redraw();
                        }
                    });

                    
                    let tileLayerCount = 0;
                    map.eachLayer(layer => {
                        if (layer instanceof L.TileLayer) {
                            tileLayerCount++;
                            layer.setOpacity(1);
                            layer.redraw();
                        }
                    });

                    
                    map.invalidateSize({ animate: false, pan: false, debounceMoveend: false });

                    
                    setTimeout(() => {
                        if (map) {
                            map.invalidateSize({ animate: false, pan: false });

                            
                        }
                    }, 200);
                }
            }, 100);
        }
    }, [isDrawingMode, map]);
    
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
    
    const clearDrawing = () => {
        try {
            if (drawnItemsRef.current) {
                
                let layerCount = 0;
                drawnItemsRef.current.eachLayer(() => {
                    layerCount++;
                });

                
                drawnItemsRef.current.eachLayer(layer => {
                    drawnItemsRef.current.removeLayer(layer);
                });

                
                drawnItemsRef.current.clearLayers();

                
                setCurrentPolyline(null);

                
                onRoadDrawn(null);

                
                if (map) {
                    
                    let polylineCount = 0;
                    map.eachLayer(layer => {
                        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                            map.removeLayer(layer);
                            polylineCount++;
                        }
                    });

                    
                    const editMarkers = document.querySelectorAll('.leaflet-editing-icon, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-draw-guide-dash');
                    editMarkers.forEach(marker => {
                        marker.remove();
                    });

                    
                    if (map._handlers) {
                        for (const key in map._handlers) {
                            const handler = map._handlers[key];
                            if (handler && handler.disable && (
                                handler instanceof L.Draw.Polyline ||
                                handler instanceof L.Edit.Poly ||
                                (handler.constructor && handler.constructor.name &&
                                 (handler.constructor.name.includes('Draw') ||
                                  handler.constructor.name.includes('Edit')))
                            )) {
                                handler.disable();
                            }
                        }
                    }

                    
                    let redrawCount = 0;
                    map.eachLayer(layer => {
                        if (layer.redraw) {
                            layer.redraw();
                            redrawCount++;
                        }
                    });

                    
                    let tileLayerCount = 0;
                    map.eachLayer(layer => {
                        if (layer instanceof L.TileLayer) {
                            tileLayerCount++;
                            layer.setOpacity(1);
                        }
                    });

                    
                    setTimeout(() => {
                        map.invalidateSize();

                        
                    }, 100);
                }
            }
        } catch (error) {
            console.error("Error clearing drawing:", error);
        }
    };
    return (
        <div className="custom-road-drawer">
            {$1}
            {isDrawingMode && (
                <div className="fixed top-0 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-3 rounded-b-lg shadow-xl z-[1200] text-center">
                    <p className="font-bold text-lg">Drawing Mode Active</p>
                    <p className="text-sm">Click on the map to start drawing your road. Click to add points, double-click to finish.</p>
                    <div className="mt-2 flex justify-center gap-2">
                        <button
                            onClick={clearDrawing}
                            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm shadow-md"
                        >
                            Clear Drawing
                        </button>
                        <button
                            onClick={() => {
                                if (currentPolyline) {
                                    
                                    const coordinates = currentPolyline.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
                                    const roadMetrics = calculateRoadMetrics(coordinates);
                                    
                                    const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                                    if (sidebar) {
                                        sidebar.style.visibility = 'visible';
                                        sidebar.style.opacity = '1';
                                        sidebar.style.zIndex = '2000';
                                        sidebar.style.display = 'flex';
                                        sidebar.style.pointerEvents = 'auto';
                                    }
                                    
                                    const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
                                    if (sidebarToggleButton) {
                                        sidebarToggleButton.style.visibility = 'visible';
                                        sidebarToggleButton.style.opacity = '1';
                                        sidebarToggleButton.style.zIndex = '3000';
                                        sidebarToggleButton.style.display = 'block';
                                        sidebarToggleButton.style.pointerEvents = 'auto';
                                    }
                                    getElevationData(coordinates).then(elevationData => {
                                        const roadData = {
                                            ...roadMetrics,
                                            ...elevationData,
                                            coordinates
                                        };
                                        onRoadDrawn(roadData);
                                    });
                                } else {
                                    alert("No road has been drawn yet. Draw a road first.");
                                }
                            }}
                            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm shadow-md"
                        >
                            Save Road
                        </button>
                        <button
                            onClick={() => {
                                clearDrawing();
                                
                                const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                                if (sidebar) {
                                    sidebar.style.visibility = 'visible';
                                    sidebar.style.opacity = '1';
                                    sidebar.style.zIndex = '2000';
                                    sidebar.style.display = 'flex';
                                    sidebar.style.pointerEvents = 'auto';
                                }
                                
                                const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
                                if (sidebarToggleButton) {
                                    sidebarToggleButton.style.visibility = 'visible';
                                    sidebarToggleButton.style.opacity = '1';
                                    sidebarToggleButton.style.zIndex = '3000';
                                    sidebarToggleButton.style.display = 'block';
                                    sidebarToggleButton.style.pointerEvents = 'auto';
                                }
                                
                                const mapContainer = document.getElementById('map');
                                if (mapContainer) {
                                    mapContainer.classList.remove('drawing-mode');
                                }

                                
                                const editMarkers = document.querySelectorAll('.leaflet-editing-icon, .leaflet-marker-icon:not(.main-location-marker), .leaflet-marker-shadow, .leaflet-draw-guide-dash');
                                editMarkers.forEach(marker => {
                                    marker.remove();
                                });

                                
                                const drawControls = document.querySelectorAll('.leaflet-draw, .leaflet-draw-toolbar, .leaflet-draw-section, .leaflet-draw-actions');
                                drawControls.forEach(control => {
                                    control.remove();
                                });

                                
                                setIsDrawingMode(false);
                            }}
                            className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm shadow-md"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default CustomRoadDrawer;

