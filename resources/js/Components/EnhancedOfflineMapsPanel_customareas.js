// Custom area drawing functions for EnhancedOfflineMapsPanel
// Insert these after handleDeleteSaved function

const startDrawingCustomArea = () => {
    if (!map) return;
    
    setIsDrawingCustomArea(true);
    setCustomAreaName('');
    setCustomAreaBounds(null);
    
    // Remove existing rectangle if any
    if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
    }
    
    // Create a new rectangle in the center of the current view
    const bounds = map.getBounds();
    const center = map.getCenter();
    const latDiff = (bounds.getNorth() - bounds.getSouth()) * 0.3;
    const lngDiff = (bounds.getEast() - bounds.getWest()) * 0.3;
    
    const rectangleBounds = [
        [center.lat - latDiff, center.lng - lngDiff],
        [center.lat + latDiff, center.lng + lngDiff]
    ];
    
    const rectangle = L.rectangle(rectangleBounds, {
        color: '#8b5cf6',
        weight: 3,
        fillOpacity: 0.2
    }).addTo(map);
    
    rectangleRef.current = rectangle;
    
    // Make it draggable
    rectangle.dragging = {
        enable: function() {
            let isDragging = false;
            let startLatLng = null;
            
            rectangle.on('mousedown', function(e) {
                isDragging = true;
                startLatLng = e.latlng;
                map.dragging.disable();
                L.DomEvent.stopPropagation(e);
            });
            
            map.on('mousemove', function(e) {
                if (isDragging && startLatLng) {
                    const latDiff = e.latlng.lat - startLatLng.lat;
                    const lngDiff = e.latlng.lng - startLatLng.lng;
                    
                    const currentBounds = rectangle.getBounds();
                    const newBounds = L.latLngBounds(
                        [currentBounds.getSouth() + latDiff, currentBounds.getWest() + lngDiff],
                        [currentBounds.getNorth() + latDiff, currentBounds.getEast() + lngDiff]
                    );
                    
                    rectangle.setBounds(newBounds);
                    startLatLng = e.latlng;
                    
                    updateCustomBounds();
                }
            });
            
            map.on('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    map.dragging.enable();
                }
            });
        }
    };
    
    rectangle.dragging.enable();
    
    // Update bounds state
    const updateCustomBounds = () => {
        const bounds = rectangle.getBounds();
        setCustomAreaBounds({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        });
    };
    
    updateCustomBounds();
};

const cancelDrawingCustomArea = () => {
    setIsDrawingCustomArea(false);
    setCustomAreaName('');
    setCustomAreaBounds(null);
    
    if (rectangleRef.current && map) {
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
    }
};

const saveCustomArea = async () => {
    if (!customAreaBounds || !customAreaName.trim()) {
        setError('Please provide a name for your custom area');
        return;
    }
    
    try {
        setError(null);
        setLoading(true);
        
        // Calculate estimated size based on area
        const latDiff = Math.abs(customAreaBounds.north - customAreaBounds.south);
        const lngDiff = Math.abs(customAreaBounds.east - customAreaBounds.west);
        const area = latDiff * lngDiff;
        const estimatedSizeMB = Math.max(5, Math.min(150, Math.round(area * 1000)));
        
        // Calculate center and radius
        const centerLat = (customAreaBounds.north + customAreaBounds.south) / 2;
        const centerLng = (customAreaBounds.east + customAreaBounds.west) / 2;
        const radiusKm = Math.round((latDiff * 111) / 2); // Rough approximation
        
        await axios.post('/api/offline-maps/save-custom', {
            region_name: customAreaName.trim(),
            bounds: customAreaBounds,
            zoom_levels: [10, 11, 12, 13, 14],
            estimated_size_mb: estimatedSizeMB,
            center_lat: centerLat,
            center_lng: centerLng,
            radius_km: radiusKm
        }, {
            headers: { Authorization: `Bearer ${auth.token}` }
        });
        
        await loadSaved();
        cancelDrawingCustomArea();
    } catch (error) {
        console.error('Error saving custom area:', error);
        setError(error.response?.data?.error || 'Failed to save custom area');
    } finally {
        setLoading(false);
    }
};

const saveCurrentMapView = async () => {
    if (!map) return;
    
    const bounds = map.getBounds();
    const customBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
    };
    
    const name = prompt('Enter a name for this map area:', 'Current Map View');
    if (!name) return;
    
    try {
        setError(null);
        setLoading(true);
        
        const latDiff = Math.abs(customBounds.north - customBounds.south);
        const lngDiff = Math.abs(customBounds.east - customBounds.west);
        const area = latDiff * lngDiff;
        const estimatedSizeMB = Math.max(5, Math.min(150, Math.round(area * 1000)));
        
        const centerLat = (customBounds.north + customBounds.south) / 2;
        const centerLng = (customBounds.east + customBounds.west) / 2;
        const radiusKm = Math.round((latDiff * 111) / 2);
        
        await axios.post('/api/offline-maps/save-custom', {
            region_name: name.trim(),
            bounds: customBounds,
            zoom_levels: [10, 11, 12, 13, 14],
            estimated_size_mb: estimatedSizeMB,
            center_lat: centerLat,
            center_lng: centerLng,
            radius_km: radiusKm
        }, {
            headers: { Authorization: `Bearer ${auth.token}` }
        });
        
        await loadSaved();
    } catch (error) {
        console.error('Error saving map view:', error);
        setError(error.response?.data?.error || 'Failed to save map view');
    } finally {
        setLoading(false);
    }
};
