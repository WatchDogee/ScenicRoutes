import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
export default function useMapInteraction(initialCenter = [57.1, 27.1], initialZoom = 10) {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const radiusCircleRef = useRef(null);
    const roadsLayerRef = useRef(null);
    const [radius, setRadius] = useState(10);
    
    useEffect(() => {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        const leafletMap = L.map(mapContainer).setView(initialCenter, initialZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
            updateWhenIdle: false,
            updateWhenZooming: false,
            updateInterval: 250,
        }).addTo(leafletMap);
        
        setTimeout(() => {
            leafletMap.invalidateSize();
        }, 100);
        leafletMap.on('click', handleMapClick);
        mapRef.current = leafletMap;
        const newLayerGroup = L.layerGroup().addTo(leafletMap);
        roadsLayerRef.current = newLayerGroup;
        return () => {
            leafletMap.off();
            leafletMap.remove();
            mapRef.current = null;
            markerRef.current = null;
            radiusCircleRef.current = null;
            roadsLayerRef.current = null;
        };
    }, [initialCenter, initialZoom]);
    
    const handleMapClick = (e) => {
        const map = mapRef.current;
        if (!map) return;
        const latlng = e.latlng;
        if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
        } else {
            markerRef.current = L.marker(latlng).addTo(map);
        }
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setLatLng(latlng).setRadius(radius * 1000);
        } else {
            radiusCircleRef.current = L.circle(latlng, {
                radius: radius * 1000,
                color: 'blue',
                fillColor: 'blue',
                fillOpacity: 0.05,
            }).addTo(map);
        }
    };
    
    const handleRadiusChange = (newRadius) => {
        const numericRadius = Number(newRadius);
        setRadius(numericRadius);
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setRadius(numericRadius * 1000);
        }
    };
    
    const updateMapLocation = (lat, lon, zoom = 13) => {
        if (!mapRef.current) return;
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        if (markerRef.current) {
            markerRef.current.setLatLng([latNum, lonNum]);
        } else {
            markerRef.current = L.marker([latNum, lonNum]).addTo(mapRef.current);
        }
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setLatLng([latNum, lonNum]);
        } else {
            radiusCircleRef.current = L.circle([latNum, lonNum], {
                radius: radius * 1000,
                color: 'blue',
                fillColor: 'blue',
                fillOpacity: 0.05,
            }).addTo(mapRef.current);
        }
        mapRef.current.setView([latNum, lonNum], zoom);
    };
    
    const displayRoadOnMap = (roadCoordinates, color = 'blue', weight = 6) => {
        if (!mapRef.current || !roadsLayerRef.current) return;
        
        roadsLayerRef.current.clearLayers();
        
        const coordinates = typeof roadCoordinates === 'string' 
            ? JSON.parse(roadCoordinates) 
            : roadCoordinates;
        
        const polyline = L.polyline(coordinates, { 
            color, 
            weight, 
            opacity: 0.8 
        }).addTo(roadsLayerRef.current);
        
        mapRef.current.fitBounds(polyline.getBounds(), {
            padding: [50, 50] 
        });
        return polyline;
    };
    
    const clearRoadsFromMap = () => {
        if (roadsLayerRef.current) {
            roadsLayerRef.current.clearLayers();
        }
    };
    
    const getCurrentLocation = () => {
        if (!markerRef.current) return null;
        const latLng = markerRef.current.getLatLng();
        return {
            lat: latLng.lat,
            lon: latLng.lng
        };
    };
    return {
        mapRef,
        markerRef,
        radiusCircleRef,
        roadsLayerRef,
        radius,
        setRadius,
        handleRadiusChange,
        updateMapLocation,
        displayRoadOnMap,
        clearRoadsFromMap,
        getCurrentLocation
    };
}
