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
    onRoadDrawn,
    auth
}) => {
    const drawControlRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const [currentPolyline, setCurrentPolyline] = useState(null);

    useEffect(() => {
        if (!map) return;

        // Initialize the FeatureGroup to store editable layers
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        // Add event listeners for map movement to ensure polyline stays visible
        const handleMapMoveEvent = () => {
            if (currentPolyline && drawnItemsRef.current) {
                // Re-add the polyline to ensure it's visible after map movement
                if (!drawnItemsRef.current.hasLayer(currentPolyline)) {
                    drawnItemsRef.current.addLayer(currentPolyline);
                }

                // Force redraw of the feature group
                if (drawnItemsRef.current.bringToFront) {
                    drawnItemsRef.current.bringToFront();
                }
            }
        };

        // Add event listeners for various map movement events
        map.on('moveend', handleMapMoveEvent);
        map.on('zoomend', handleMapMoveEvent);
        map.on('dragend', handleMapMoveEvent);

        // Initialize the draw control and pass it the FeatureGroup of editable layers
        const drawControl = new L.Control.Draw({
            position: 'topleft', // Position the control on the top left
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
                    // Disable all confirmation dialogs and popups
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
                // Disable edit confirmation popups
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

        // Handle the created event
        map.on(L.Draw.Event.CREATED, function (e) {
            const layer = e.layer;
            drawnItems.addLayer(layer);
            setCurrentPolyline(layer);

            // Get coordinates from the polyline
            const coordinates = layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);

            // Calculate road metrics
            const roadMetrics = calculateRoadMetrics(coordinates);

            // Instead of showing a browser popup, we'll let the user save from the drawing mode window
            console.log('Road drawing complete. Use the Save Road button to save.');

            // No automatic save dialog - user will use the Save Road button in the drawing mode window
        });

        // Handle the edited event
        map.on(L.Draw.Event.EDITED, function (e) {
            const layers = e.layers;
            layers.eachLayer(function (layer) {
                if (layer instanceof L.Polyline) {
                    const coordinates = layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);

                    // Calculate road metrics
                    const roadMetrics = calculateRoadMetrics(coordinates);

                    // Get elevation data
                    getElevationData(coordinates).then(elevationData => {
                        // Combine road metrics with elevation data
                        const roadData = {
                            ...roadMetrics,
                            ...elevationData,
                            coordinates
                        };

                        // Pass the road data to the parent component
                        onRoadDrawn(roadData);
                    });
                }
            });
        });

        // Handle the deleted event
        map.on(L.Draw.Event.DELETED, function () {
            setCurrentPolyline(null);
            onRoadDrawn(null);
        });

        // Clean up on unmount
        return () => {
            map.off(L.Draw.Event.CREATED);
            map.off(L.Draw.Event.EDITED);
            map.off(L.Draw.Event.DELETED);
            // Remove the map movement event listeners
            map.off('moveend');
            map.off('zoomend');
            map.off('dragend');
            if (drawnItemsRef.current) {
                map.removeLayer(drawnItemsRef.current);
            }
        };
    }, [map, onRoadDrawn]);

    // Toggle drawing mode
    useEffect(() => {
        if (!map || !drawControlRef.current) {
            console.log('🔄 [DRAWER] Map or draw control not available, skipping drawing mode toggle');
            return;
        }

        if (isDrawingMode) {
            console.log('🔄 [DRAWER] Entering drawing mode - START');
            try {
                // Add the drawing control
                console.log('🔄 [DRAWER] Adding drawing control to map');
                map.addControl(drawControlRef.current);

                // Check if drawing control was added successfully
                const drawControls = document.querySelectorAll('.leaflet-draw');
                console.log(`🔄 [DRAWER] Drawing controls in DOM after adding: ${drawControls.length}`);

                // Log the current map layers
                console.log('🔄 [DRAWER] Current map layers before redraw:');
                let layerCount = 0;
                map.eachLayer(layer => {
                    layerCount++;
                    console.log(`🔄 [DRAWER] Layer #${layerCount}: ${layer.constructor.name}, visible: ${map.hasLayer(layer)}`);
                });

                // Force redraw of all map layers to prevent white map
                console.log('🔄 [DRAWER] Scheduling map redraw after 100ms delay');
                setTimeout(() => {
                    if (map) {
                        console.log('🔄 [DRAWER] Executing delayed map redraw operations');

                        // Force redraw of all map layers
                        console.log('🔄 [DRAWER] Forcing redraw of all map layers');
                        let redrawCount = 0;
                        map.eachLayer(layer => {
                            if (layer.redraw) {
                                redrawCount++;
                                console.log(`🔄 [DRAWER] Redrawing layer #${redrawCount}: ${layer.constructor.name}`);
                                layer.redraw();
                            }
                        });
                        console.log(`🔄 [DRAWER] Redrawn ${redrawCount} layers`);

                        // Ensure tile layers are visible
                        console.log('🔄 [DRAWER] Ensuring tile layers are visible');
                        let tileLayerCount = 0;
                        map.eachLayer(layer => {
                            if (layer instanceof L.TileLayer) {
                                tileLayerCount++;
                                console.log(`🔄 [DRAWER] Setting opacity to 1 for tile layer #${tileLayerCount}`);
                                layer.setOpacity(1);
                            }
                        });
                        console.log(`🔄 [DRAWER] Processed ${tileLayerCount} tile layers`);

                        // Invalidate the map size to force a complete redraw
                        console.log('🔄 [DRAWER] Invalidating map size to force complete redraw');
                        map.invalidateSize();

                        // Check if map tiles are visible
                        console.log('🔄 [DRAWER] Checking map tile visibility after redraw:');
                        const tileElements = document.querySelectorAll('.leaflet-tile-container img');
                        console.log(`🔄 [DRAWER] Found ${tileElements.length} tile images`);
                        if (tileElements.length > 0) {
                            const sampleTile = tileElements[0];
                            const computedStyle = window.getComputedStyle(sampleTile);
                            console.log(`🔄 [DRAWER] Sample tile visibility: ${computedStyle.visibility}`);
                            console.log(`🔄 [DRAWER] Sample tile opacity: ${computedStyle.opacity}`);
                            console.log(`🔄 [DRAWER] Sample tile display: ${computedStyle.display}`);
                            console.log(`🔄 [DRAWER] Sample tile filter: ${computedStyle.filter}`);
                        }

                        console.log('🔄 [DRAWER] Delayed map redraw operations complete');
                    } else {
                        console.warn('⚠️ [DRAWER] Map reference not available during delayed redraw');
                    }
                }, 100);

                console.log('🔄 [DRAWER] Entering drawing mode - COMPLETE');
            } catch (error) {
                console.error('❌ [DRAWER] Error entering drawing mode:', error);
                console.error('❌ [DRAWER] Error stack:', error.stack);
            }
        } else {
            console.log('🔄 [DRAWER] Exiting drawing mode - START');
            // Remove the drawing control
            try {
                console.log('🔄 [DRAWER] Removing drawing control from map');
                map.removeControl(drawControlRef.current);

                // Find and remove any remaining draw controls
                console.log('🔄 [DRAWER] Searching for leftover drawing controls in DOM');
                const drawControls = document.querySelectorAll('.leaflet-draw');
                console.log(`🔄 [DRAWER] Found ${drawControls.length} leftover drawing controls`);
                drawControls.forEach((el, index) => {
                    console.log(`🔄 [DRAWER] Removing leftover drawing control #${index+1}`);
                    el.remove();
                });

                // Find and remove any remaining draw toolbars
                console.log('🔄 [DRAWER] Searching for leftover drawing toolbars in DOM');
                const drawToolbars = document.querySelectorAll('.leaflet-draw-toolbar');
                console.log(`🔄 [DRAWER] Found ${drawToolbars.length} leftover drawing toolbars`);
                drawToolbars.forEach((el, index) => {
                    console.log(`🔄 [DRAWER] Removing leftover drawing toolbar #${index+1}`);
                    el.remove();
                });

                // Also check for any other drawing-related elements
                console.log('🔄 [DRAWER] Searching for other drawing-related elements');
                const drawRelated = document.querySelectorAll('.leaflet-draw-section, .leaflet-draw-actions');
                console.log(`🔄 [DRAWER] Found ${drawRelated.length} other drawing-related elements`);
                drawRelated.forEach((el, index) => {
                    console.log(`🔄 [DRAWER] Removing drawing-related element #${index+1}: ${el.className}`);
                    el.remove();
                });
            } catch (error) {
                console.error('❌ [DRAWER] Error removing drawing control:', error);
                console.error('❌ [DRAWER] Error stack:', error.stack);
            }

            // Clear any existing drawings
            if (drawnItemsRef.current) {
                console.log('🔄 [DRAWER] Clearing drawn items feature group');
                drawnItemsRef.current.clearLayers();
                console.log('🔄 [DRAWER] Setting current polyline to null');
                setCurrentPolyline(null);
            } else {
                console.warn('⚠️ [DRAWER] No drawn items reference available');
            }

            // Force redraw of all map layers to prevent white map
            console.log('🔄 [DRAWER] Scheduling map redraw after 100ms delay');
            setTimeout(() => {
                if (map) {
                    console.log('🔄 [DRAWER] Executing delayed map redraw operations');

                    // Force redraw of all map layers
                    console.log('🔄 [DRAWER] Forcing redraw of all map layers');
                    let redrawCount = 0;
                    map.eachLayer(layer => {
                        if (layer.redraw) {
                            redrawCount++;
                            console.log(`🔄 [DRAWER] Redrawing layer #${redrawCount}: ${layer.constructor.name}`);
                            layer.redraw();
                        }
                    });
                    console.log(`🔄 [DRAWER] Redrawn ${redrawCount} layers`);

                    // Make sure the tile layer is visible
                    console.log('🔄 [DRAWER] Ensuring tile layers are visible');
                    let tileLayerCount = 0;
                    map.eachLayer(layer => {
                        if (layer instanceof L.TileLayer) {
                            tileLayerCount++;
                            console.log(`🔄 [DRAWER] Setting opacity to 1 for tile layer #${tileLayerCount}`);
                            layer.setOpacity(1);
                            console.log(`🔄 [DRAWER] Forcing redraw of tile layer #${tileLayerCount}`);
                            layer.redraw();
                        }
                    });
                    console.log(`🔄 [DRAWER] Processed ${tileLayerCount} tile layers`);

                    // Invalidate the map size to force a complete redraw
                    console.log('🔄 [DRAWER] Invalidating map size to force complete redraw');
                    map.invalidateSize({ animate: false, pan: false, debounceMoveend: false });

                    // Additional redraw after a short delay
                    console.log('🔄 [DRAWER] Scheduling additional redraw after 200ms delay');
                    setTimeout(() => {
                        if (map) {
                            console.log('🔄 [DRAWER] Executing second delayed map invalidation');
                            map.invalidateSize({ animate: false, pan: false });

                            // Check if map tiles are visible
                            console.log('🔄 [DRAWER] Checking map tile visibility after second redraw:');
                            const tileElements = document.querySelectorAll('.leaflet-tile-container img');
                            console.log(`🔄 [DRAWER] Found ${tileElements.length} tile images`);
                            if (tileElements.length > 0) {
                                const sampleTile = tileElements[0];
                                const computedStyle = window.getComputedStyle(sampleTile);
                                console.log(`🔄 [DRAWER] Sample tile visibility: ${computedStyle.visibility}`);
                                console.log(`🔄 [DRAWER] Sample tile opacity: ${computedStyle.opacity}`);
                                console.log(`🔄 [DRAWER] Sample tile display: ${computedStyle.display}`);
                                console.log(`🔄 [DRAWER] Sample tile filter: ${computedStyle.filter}`);
                            }

                            console.log('🔄 [DRAWER] Second delayed map invalidation complete');
                        } else {
                            console.warn('⚠️ [DRAWER] Map reference not available during second delayed redraw');
                        }
                    }, 200);
                } else {
                    console.warn('⚠️ [DRAWER] Map reference not available during delayed redraw');
                }
            }, 100);

            console.log('🔄 [DRAWER] Exiting drawing mode - COMPLETE');
        }
    }, [isDrawingMode, map]);

    // Get elevation data for the road
    const getElevationData = async (coordinates) => {
        try {
            // Sample coordinates to reduce API calls (take every 10th point)
            const sampledCoordinates = coordinates.filter((_, index) => index % 10 === 0);

            // Ensure we have at least start, middle, and end points
            if (sampledCoordinates.length < 3 && coordinates.length >= 3) {
                sampledCoordinates.push(coordinates[0]);
                sampledCoordinates.push(coordinates[Math.floor(coordinates.length / 2)]);
                sampledCoordinates.push(coordinates[coordinates.length - 1]);
            }

            // Format coordinates for the API
            const locations = sampledCoordinates.map(coord => `${coord[0]},${coord[1]}`).join('|');

            // Call the Open Elevation API
            const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${locations}`);

            if (response.data && response.data.results) {
                const elevations = response.data.results.map(result => result.elevation);

                // Calculate elevation metrics
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
            console.error('Error fetching elevation data:', error);
            return {
                elevation_gain: 0,
                elevation_loss: 0,
                max_elevation: 0,
                min_elevation: 0
            };
        }
    };

    // Calculate elevation gain (sum of positive elevation changes)
    const calculateElevationGain = (elevations) => {
        let gain = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) gain += diff;
        }
        return gain;
    };

    // Calculate elevation loss (sum of negative elevation changes)
    const calculateElevationLoss = (elevations) => {
        let loss = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff < 0) loss += Math.abs(diff);
        }
        return loss;
    };

    // Clear the current drawing
    const clearDrawing = () => {
        console.log('🔄 [DRAWER] Clearing drawing - START');
        try {
            if (drawnItemsRef.current) {
                console.log('🔄 [DRAWER] Drawn items ref exists, clearing layers');

                // Count layers before clearing
                let layerCount = 0;
                drawnItemsRef.current.eachLayer(() => {
                    layerCount++;
                });
                console.log(`🔄 [DRAWER] Found ${layerCount} layers to remove`);

                // Remove all layers from the feature group
                console.log('🔄 [DRAWER] Removing individual layers from feature group');
                drawnItemsRef.current.eachLayer(layer => {
                    console.log(`🔄 [DRAWER] Removing layer: ${layer.constructor.name}`);
                    drawnItemsRef.current.removeLayer(layer);
                });

                // Also clear the layers directly
                console.log('🔄 [DRAWER] Calling clearLayers() on feature group');
                drawnItemsRef.current.clearLayers();

                // Reset the current polyline
                console.log('🔄 [DRAWER] Setting current polyline to null');
                setCurrentPolyline(null);

                // Notify parent component
                console.log('🔄 [DRAWER] Notifying parent component (onRoadDrawn)');
                onRoadDrawn(null);

                // Force redraw of the map
                if (map) {
                    console.log('🔄 [DRAWER] Preparing to redraw map');

                    // Remove any existing polylines from the map
                    console.log('🔄 [DRAWER] Removing any existing polylines from map');
                    let polylineCount = 0;
                    map.eachLayer(layer => {
                        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                            console.log(`🔄 [DRAWER] Removing polyline: ${layer.constructor.name}`);
                            map.removeLayer(layer);
                            polylineCount++;
                        }
                    });
                    console.log(`🔄 [DRAWER] Removed ${polylineCount} polylines from map`);

                    // Force a redraw of all map layers
                    console.log('🔄 [DRAWER] Forcing redraw of all map layers');
                    let redrawCount = 0;
                    map.eachLayer(layer => {
                        if (layer.redraw) {
                            console.log(`🔄 [DRAWER] Redrawing layer: ${layer.constructor.name}`);
                            layer.redraw();
                            redrawCount++;
                        }
                    });
                    console.log(`🔄 [DRAWER] Redrawn ${redrawCount} layers`);

                    // Ensure tile layers are visible
                    console.log('🔄 [DRAWER] Ensuring tile layers are visible');
                    let tileLayerCount = 0;
                    map.eachLayer(layer => {
                        if (layer instanceof L.TileLayer) {
                            tileLayerCount++;
                            console.log(`🔄 [DRAWER] Setting opacity to 1 for tile layer #${tileLayerCount}`);
                            layer.setOpacity(1);
                        }
                    });
                    console.log(`🔄 [DRAWER] Processed ${tileLayerCount} tile layers`);

                    // Invalidate the map size to force a complete redraw
                    console.log('🔄 [DRAWER] Scheduling map invalidation after 100ms delay');
                    setTimeout(() => {
                        console.log('🔄 [DRAWER] Executing delayed map invalidation');
                        map.invalidateSize();
                        console.log('🔄 [DRAWER] Delayed map invalidation complete');

                        // Check if map tiles are visible
                        console.log('🔄 [DRAWER] Checking map tile visibility after redraw:');
                        const tileElements = document.querySelectorAll('.leaflet-tile-container img');
                        console.log(`🔄 [DRAWER] Found ${tileElements.length} tile images`);
                        if (tileElements.length > 0) {
                            const sampleTile = tileElements[0];
                            const computedStyle = window.getComputedStyle(sampleTile);
                            console.log(`🔄 [DRAWER] Sample tile visibility: ${computedStyle.visibility}`);
                            console.log(`🔄 [DRAWER] Sample tile opacity: ${computedStyle.opacity}`);
                            console.log(`🔄 [DRAWER] Sample tile display: ${computedStyle.display}`);
                            console.log(`🔄 [DRAWER] Sample tile filter: ${computedStyle.filter}`);
                        }
                    }, 100);
                } else {
                    console.warn('⚠️ [DRAWER] Map reference not available for redraw');
                }
            } else {
                console.warn('⚠️ [DRAWER] No drawn items ref found');
            }
            console.log('🔄 [DRAWER] Clearing drawing - COMPLETE');
        } catch (error) {
            console.error('❌ [DRAWER] Error clearing drawing:', error);
            console.error('❌ [DRAWER] Error stack:', error.stack);
        }
    };

    return (
        <div className="custom-road-drawer">
            {/* Drawing Instructions */}
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
                                    // No confirmation dialog - directly save the road
                                    const coordinates = currentPolyline.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
                                    const roadMetrics = calculateRoadMetrics(coordinates);

                                    // Ensure sidebar is visible before proceeding
                                    const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                                    if (sidebar) {
                                        sidebar.style.visibility = 'visible';
                                        sidebar.style.opacity = '1';
                                        sidebar.style.zIndex = '2000';
                                        sidebar.style.display = 'flex';
                                        sidebar.style.pointerEvents = 'auto';
                                    }

                                    // Ensure sidebar toggle button is visible
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

                                // Ensure sidebar is visible before exiting drawing mode
                                const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                                if (sidebar) {
                                    sidebar.style.visibility = 'visible';
                                    sidebar.style.opacity = '1';
                                    sidebar.style.zIndex = '2000';
                                    sidebar.style.display = 'flex';
                                    sidebar.style.pointerEvents = 'auto';
                                }

                                // Ensure sidebar toggle button is visible
                                const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
                                if (sidebarToggleButton) {
                                    sidebarToggleButton.style.visibility = 'visible';
                                    sidebarToggleButton.style.opacity = '1';
                                    sidebarToggleButton.style.zIndex = '3000';
                                    sidebarToggleButton.style.display = 'block';
                                    sidebarToggleButton.style.pointerEvents = 'auto';
                                }

                                // Remove drawing-mode class from map container
                                const mapContainer = document.getElementById('map');
                                if (mapContainer) {
                                    mapContainer.classList.remove('drawing-mode');
                                }

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


