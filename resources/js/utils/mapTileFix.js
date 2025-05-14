$1

$1
export const fixMapTiles = (map) => {
    if (!map) return;

    
    map.eachLayer(layer => {
        if (layer.redraw) {
            layer.redraw();
        }
    });

    
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            layer.setOpacity(1);

            
            if (layer._reset) {
                layer._reset();
            }
        }
    });

    
    if (window.mapTileLayers) {
        Object.values(window.mapTileLayers).forEach(layer => {
            if (map.hasLayer(layer)) {
                layer.redraw();
            }
        });
    }

    
    map.invalidateSize();

    
    setTimeout(() => {
        if (map) {
            
            map._resetView(map.getCenter(), map.getZoom(), true);
        }
    }, 100);
};

$1
export const fixDrawingModeTiles = (map, isDrawingMode) => {
    if (!map) return;

    
    const mapContainer = map.getContainer();

    
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();

    if (isDrawingMode) {
        
        mapContainer.classList.add('drawing-mode');
        document.body.classList.add('drawing-mode');

        
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
            

            
            tile.style.mixBlendMode = 'normal';
        });

        
        const mapPane = document.querySelector('.leaflet-map-pane');
        if (mapPane) {
            mapPane.style.visibility = 'visible';
            mapPane.style.opacity = '1';
            mapPane.style.display = 'block';
            mapPane.style.position = 'absolute';
        }

        
        fixMapTiles(map);

        
        fixTileBlendMode(map);

        
        map.invalidateSize(true);

        
        const refreshMap = () => {
            if (map) {
                
                map.setView(currentCenter, currentZoom, { animate: false });

                
                map._resetView(currentCenter, currentZoom, true);

                
                if (window.mapTileLayers) {
                    Object.values(window.mapTileLayers).forEach(layer => {
                        if (map.hasLayer(layer)) {
                            layer.redraw();
                        }
                    });
                }

                
                map.invalidateSize(true);

                
                map.setView(currentCenter, currentZoom, { animate: false });

                
                map.fitBounds(currentBounds, { animate: false });
            }
        };

        
        setTimeout(refreshMap, 100);
        setTimeout(refreshMap, 300);
        setTimeout(refreshMap, 500);
        setTimeout(refreshMap, 1000);
    } else {
        
        mapContainer.classList.remove('drawing-mode');
        document.body.classList.remove('drawing-mode');

        
        fixMapTiles(map);

        
        fixTileBlendMode(map);

        
        map.invalidateSize(true);

        
        setTimeout(() => {
            if (map) {
                
                map.setView(currentCenter, currentZoom, { animate: false });

                
                map._resetView(currentCenter, currentZoom, true);

                
                map.invalidateSize(true);

                
                map.setView(currentCenter, currentZoom, { animate: false });

                
                map.fitBounds(currentBounds, { animate: false });
            }
        }, 100);
    }
};

$1
export const fixTileBlendMode = (map) => {
    if (!map) return;

    
    const tileImages = document.querySelectorAll('.leaflet-tile-container img, .leaflet-tile img');

    
    tileImages.forEach(img => {
        img.style.mixBlendMode = 'normal';

        
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';

        
        img.style.filter = 'none';

        

        
        img.style.transition = 'none';
        img.style.animation = 'none';
        img.style.willChange = 'auto';
    });

    
    const plusLighterElements = document.querySelectorAll('[style*="mix-blend-mode: plus-lighter"]');
    plusLighterElements.forEach(element => {
        element.style.mixBlendMode = 'normal';
    });

    
    const osmTiles = document.querySelectorAll('img[src*="tile.openstreetmap.org"], img[src*="tile.opentopomap.org"], img[src*="arcgisonline.com"]');
    osmTiles.forEach(tile => {
        tile.style.visibility = 'visible';
        tile.style.opacity = '1';
        tile.style.display = 'block';
        tile.style.mixBlendMode = 'normal';
        tile.style.filter = 'none';
        
    });

    
    const tileContainers = document.querySelectorAll('.leaflet-tile-container');
    tileContainers.forEach(container => {
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.style.display = 'block';
    });
};

$1
export const applyDrawingModeEnterFix = (map) => {
    if (!map) return;

    
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();

    
    const guideLines = document.querySelectorAll('.leaflet-draw-guide-dash');
    guideLines.forEach(line => line.remove());

    
    const mapContainer = map.getContainer();
    mapContainer.classList.add('drawing-mode');
    document.body.classList.add('drawing-mode');

    
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    mapContainer.style.position = 'relative';
    mapContainer.style.overflow = 'hidden';
    mapContainer.style.visibility = 'visible';
    mapContainer.style.opacity = '1';
    mapContainer.style.display = 'block';

    
    const mapPane = document.querySelector('.leaflet-map-pane');
    if (mapPane) {
        mapPane.style.visibility = 'visible';
        mapPane.style.opacity = '1';
        mapPane.style.display = 'block';
        mapPane.style.position = 'absolute';
    }

    
    fixMapTiles(map);

    
    fixTileBlendMode(map);

    
    map.invalidateSize(true);

    
    const applyFixes = () => {
        
        fixMapTiles(map);

        
        fixTileBlendMode(map);

        
        if (map) {
            
            map.setView(currentCenter, currentZoom, { animate: false });

            
            map._resetView(currentCenter, currentZoom, true);

            
            map.invalidateSize(true);

            
            if (window.mapTileLayers) {
                Object.values(window.mapTileLayers).forEach(layer => {
                    if (map.hasLayer(layer)) {
                        layer.redraw();
                    }
                });
            }

            
            map.setView(currentCenter, currentZoom, { animate: false });

            
            map.fitBounds(currentBounds, { animate: false });
        }
    };

    
    setTimeout(applyFixes, 100);
    setTimeout(applyFixes, 300);
    setTimeout(applyFixes, 500);
    setTimeout(applyFixes, 1000);
};

$1
export const applyDrawingModeExitFix = (map) => {
    if (!map) return;

    
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();

    
    const guideLines = document.querySelectorAll('.leaflet-draw-guide-dash');
    guideLines.forEach(line => line.remove());

    
    const mapContainer = map.getContainer();
    mapContainer.classList.remove('drawing-mode');
    document.body.classList.remove('drawing-mode');

    
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    mapContainer.style.position = 'relative';
    mapContainer.style.overflow = 'hidden';
    mapContainer.style.visibility = 'visible';
    mapContainer.style.opacity = '1';
    mapContainer.style.display = 'block';

    
    fixMapTiles(map);

    
    fixTileBlendMode(map);

    
    map.invalidateSize(true);

    
    const applyFixes = () => {
        
        fixMapTiles(map);

        
        fixTileBlendMode(map);

        
        if (map) {
            
            map.setView(currentCenter, currentZoom, { animate: false });

            
            map._resetView(currentCenter, currentZoom, true);

            
            map.invalidateSize(true);

            
            if (window.mapTileLayers) {
                Object.values(window.mapTileLayers).forEach(layer => {
                    if (map.hasLayer(layer)) {
                        layer.redraw();
                    }
                });
            }

            
            map.setView(currentCenter, currentZoom, { animate: false });

            
            map.fitBounds(currentBounds, { animate: false });
        }
    };

    
    setTimeout(applyFixes, 100);
    setTimeout(applyFixes, 300);
    setTimeout(applyFixes, 500);
    setTimeout(applyFixes, 1000);
};

export default {
    fixMapTiles,
    fixDrawingModeTiles,
    fixTileBlendMode,
    applyDrawingModeEnterFix,
    applyDrawingModeExitFix
};
