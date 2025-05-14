import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

import PointOfInterestService from '../Services/PointOfInterestService';
export default function usePointsOfInterest(mapRef) {
    const [tourism, setTourism] = useState([]);
    const [fuelStations, setFuelStations] = useState([]);
    const [chargingStations, setChargingStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const tourismLayerRef = useRef(null);
    const fuelLayerRef = useRef(null);
    const chargingLayerRef = useRef(null);
    
    const [showTourism, setShowTourism] = useState(false);
    const [showFuelStations, setShowFuelStations] = useState(false);
    const [showChargingStations, setShowChargingStations] = useState(false);
    
    useEffect(() => {
        if (!mapRef.current) return;
        
        if (!tourismLayerRef.current) {
            tourismLayerRef.current = L.layerGroup().addTo(mapRef.current);
        }
        if (!fuelLayerRef.current) {
            fuelLayerRef.current = L.layerGroup().addTo(mapRef.current);
        }
        if (!chargingLayerRef.current) {
            chargingLayerRef.current = L.layerGroup().addTo(mapRef.current);
        }
        
        return () => {
            if (tourismLayerRef.current) tourismLayerRef.current.clearLayers();
            if (fuelLayerRef.current) fuelLayerRef.current.clearLayers();
            if (chargingLayerRef.current) chargingLayerRef.current.clearLayers();
        };
    }, [mapRef.current]);
    
    useEffect(() => {
        if (!mapRef.current || !tourismLayerRef.current) return;
        try {
            if (showTourism) {
                if (!mapRef.current.hasLayer(tourismLayerRef.current)) {
                    mapRef.current.addLayer(tourismLayerRef.current);
                }
            } else {
                if (mapRef.current.hasLayer(tourismLayerRef.current)) {
                    mapRef.current.removeLayer(tourismLayerRef.current);
                }
            }
        } catch (error) {
        }
    }, [showTourism]);
    
    useEffect(() => {
        if (!mapRef.current || !fuelLayerRef.current) return;
        try {
            if (showFuelStations) {
                if (!mapRef.current.hasLayer(fuelLayerRef.current)) {
                    mapRef.current.addLayer(fuelLayerRef.current);
                }
            } else {
                if (mapRef.current.hasLayer(fuelLayerRef.current)) {
                    mapRef.current.removeLayer(fuelLayerRef.current);
                }
            }
        } catch (error) {
        }
    }, [showFuelStations]);
    
    useEffect(() => {
        if (!mapRef.current || !chargingLayerRef.current) return;
        try {
            if (showChargingStations) {
                if (!mapRef.current.hasLayer(chargingLayerRef.current)) {
                    mapRef.current.addLayer(chargingLayerRef.current);
                }
            } else {
                if (mapRef.current.hasLayer(chargingLayerRef.current)) {
                    mapRef.current.removeLayer(chargingLayerRef.current);
                }
            }
        } catch (error) {
        }
    }, [showChargingStations]);
    
    const fetchTourism = async (lat, lon, radius = 10, types = []) => {
        if (!lat || !lon) return;
        setLoading(true);
        setError(null);
        try {
            const tourismData = await PointOfInterestService.fetchTourismObjects(lat, lon, radius, types);
            setTourism(tourismData);
            
            if (tourismLayerRef.current) {
                tourismLayerRef.current.clearLayers();
            }
            
            tourismData.forEach(poi => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin tourism-pin">
                             <i class="fa fa-${getTourismIcon(poi.subtype)}"></i>
                           </div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42], 
                    popupAnchor: [0, -42]  
                });
                L.marker([poi.latitude, poi.longitude], { icon })
                    .bindPopup(createTourismPopup(poi))
                    .addTo(tourismLayerRef.current);
            });
            
            setShowTourism(true);
        } catch (error) {
            setError('Failed to fetch tourism points of interest');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchFuelStations = async (lat, lon, radius = 10) => {
        if (!lat || !lon) return;
        setLoading(true);
        setError(null);
        try {
            const fuelData = await PointOfInterestService.fetchFuelStations(lat, lon, radius);
            setFuelStations(fuelData);
            
            if (!fuelLayerRef.current && mapRef.current) {
                fuelLayerRef.current = L.layerGroup().addTo(mapRef.current);
            }
            
            if (fuelLayerRef.current) {
                fuelLayerRef.current.clearLayers();
            } else {
                return;
            }
            
            fuelData.forEach(poi => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin fuel-pin">
                             <i class="fa fa-gas-pump"></i>
                           </div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42], 
                    popupAnchor: [0, -42]  
                });
                try {
                    L.marker([poi.latitude, poi.longitude], {
                        icon,
                        zIndexOffset: 500 
                    })
                    .bindPopup(createFuelPopup(poi))
                    .addTo(fuelLayerRef.current);
                } catch (err) {
                    
                }
            });
            
            setShowFuelStations(true);
            
            if (mapRef.current && !mapRef.current.hasLayer(fuelLayerRef.current)) {
                mapRef.current.addLayer(fuelLayerRef.current);
            }
        } catch (error) {
            setError('Failed to fetch fuel stations');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchChargingStations = async (lat, lon, radius = 10) => {
        if (!lat || !lon) return;
        setLoading(true);
        setError(null);
        try {
            const chargingData = await PointOfInterestService.fetchChargingStations(lat, lon, radius);
            setChargingStations(chargingData);
            
            if (chargingLayerRef.current) {
                chargingLayerRef.current.clearLayers();
            }
            
            chargingData.forEach(poi => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin charging-pin">
                             <i class="fa fa-bolt"></i>
                           </div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42], 
                    popupAnchor: [0, -42]  
                });
                L.marker([poi.latitude, poi.longitude], { icon })
                    .bindPopup(createChargingPopup(poi))
                    .addTo(chargingLayerRef.current);
            });
            
            setShowChargingStations(true);
        } catch (error) {
            setError('Failed to fetch charging stations');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchAllPois = async (lat, lon, radius = 10) => {
        if (!lat || !lon) {
            setError('Invalid location coordinates. Please select a location on the map.');
            return;
        }
        try {
            setLoading(true);
            setError(null); 
            let fetchCount = 0;
            let successCount = 0;
            
            if (!mapRef.current) {
                setError('Map is not initialized. Please refresh the page and try again.');
                return;
            }
            
            if (showTourism) {
                fetchCount++;
                try {
                    await fetchTourism(lat, lon, radius);
                    successCount++;
                } catch (err) {
                }
            }
            if (showFuelStations) {
                fetchCount++;
                try {
                    await fetchFuelStations(lat, lon, radius);
                    successCount++;
                } catch (err) {
                }
            }
            if (showChargingStations) {
                fetchCount++;
                try {
                    await fetchChargingStations(lat, lon, radius);
                    successCount++;
                } catch (err) {
                }
            }
            
            if (fetchCount === 0) {
                setShowTourism(true);
                try {
                    await fetchTourism(lat, lon, radius);
                    successCount++;
                    fetchCount = 1;
                } catch (err) {
                }
            }
            
            if (showTourism && tourismLayerRef.current && !mapRef.current.hasLayer(tourismLayerRef.current)) {
                mapRef.current.addLayer(tourismLayerRef.current);
            }
            if (showFuelStations && fuelLayerRef.current && !mapRef.current.hasLayer(fuelLayerRef.current)) {
                mapRef.current.addLayer(fuelLayerRef.current);
            }
            if (showChargingStations && chargingLayerRef.current && !mapRef.current.hasLayer(chargingLayerRef.current)) {
                mapRef.current.addLayer(chargingLayerRef.current);
            }
            if (successCount === 0 && fetchCount > 0) {
                setError('Failed to fetch any points of interest. Please try again later.');
            } else if (successCount < fetchCount) {
                setError('Some points of interest could not be loaded. Try again or select different POI types.');
            } else {
            }
        } catch (error) {
            setError('Failed to fetch points of interest. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    const getTourismIcon = (type) => {
        const icons = {
            'attraction': 'monument',
            'museum': 'landmark',
            'gallery': 'image',
            'viewpoint': 'binoculars',
            'hotel': 'hotel',
            'guest_house': 'house',
            'hostel': 'bed',
            'camp_site': 'campground',
            'alpine_hut': 'mountain',
            'wilderness_hut': 'tree',
            'information': 'info',
            'picnic_site': 'utensils',
            'default': 'map-marker'
        };
        return icons[type] || icons.default;
    };
    
    const createTourismPopup = (poi) => {
        const properties = poi.properties || {};
        return `
            <div class="poi-popup tourism-popup">
                <h3 class="font-bold">${poi.name}</h3>
                <p class="text-sm text-gray-600">${poi.subtype.replace('_', ' ')}</p>
                ${properties.description ? `<p class="mt-2">${properties.description}</p>` : ''}
                ${properties.website ? `<p class="mt-1"><a href="${properties.website}" target="_blank" class="text-blue-500 hover:underline">Website</a></p>` : ''}
                ${properties.phone ? `<p class="mt-1">Phone: ${properties.phone}</p>` : ''}
                ${properties.opening_hours ? `<p class="mt-1">Hours: ${properties.opening_hours}</p>` : ''}
                <button id="view-poi-${poi.osm_id}" class="bg-blue-500 text-white px-2 py-1 rounded mt-2">View Details</button>
            </div>
        `;
    };
    
    const createFuelPopup = (poi) => {
        const properties = poi.properties || {};
        const fuelTypes = properties.fuel_types || [];
        return `
            <div class="poi-popup fuel-popup">
                <h3 class="font-bold">${poi.name}</h3>
                <p class="text-sm text-gray-600">Fuel Station</p>
                ${properties.brand ? `<p class="mt-1">Brand: ${properties.brand}</p>` : ''}
                ${properties.operator ? `<p class="mt-1">Operator: ${properties.operator}</p>` : ''}
                ${properties.opening_hours ? `<p class="mt-1">Hours: ${properties.opening_hours}</p>` : ''}
                ${fuelTypes.length > 0 ? `
                    <div class="mt-2">
                        <p class="font-semibold">Fuel Types:</p>
                        <ul class="list-disc list-inside">
                            ${fuelTypes.map(type => `<li>${type.replace('_', ' ')}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <button id="view-poi-${poi.osm_id}" class="bg-blue-500 text-white px-2 py-1 rounded mt-2">View Details</button>
            </div>
        `;
    };
    
    const createChargingPopup = (poi) => {
        const properties = poi.properties || {};
        return `
            <div class="poi-popup charging-popup">
                <h3 class="font-bold">${poi.name}</h3>
                <p class="text-sm text-gray-600">EV Charging Station</p>
                ${properties.operator ? `<p class="mt-1">Operator: ${properties.operator}</p>` : ''}
                ${properties.network ? `<p class="mt-1">Network: ${properties.network}</p>` : ''}
                ${properties.opening_hours ? `<p class="mt-1">Hours: ${properties.opening_hours}</p>` : ''}
                ${properties.maxpower ? `<p class="mt-1">Max Power: ${properties.maxpower}</p>` : ''}
                ${properties.fee ? `<p class="mt-1">Fee: ${properties.fee}</p>` : ''}
                <div class="mt-2">
                    <p class="font-semibold">Connectors:</p>
                    <ul class="list-disc list-inside">
                        ${properties['socket:type2'] ? `<li>Type 2</li>` : ''}
                        ${properties['socket:chademo'] ? `<li>CHAdeMO</li>` : ''}
                        ${properties['socket:ccs'] ? `<li>CCS</li>` : ''}
                    </ul>
                </div>
                <button id="view-poi-${poi.osm_id}" class="bg-blue-500 text-white px-2 py-1 rounded mt-2">View Details</button>
            </div>
        `;
    };
    
    const clearAllPois = () => {
        if (tourismLayerRef.current) tourismLayerRef.current.clearLayers();
        if (fuelLayerRef.current) fuelLayerRef.current.clearLayers();
        if (chargingLayerRef.current) chargingLayerRef.current.clearLayers();
        setTourism([]);
        setFuelStations([]);
        setChargingStations([]);
    };
    return {
        tourism,
        fuelStations,
        chargingStations,
        loading,
        error,
        showTourism,
        showFuelStations,
        showChargingStations,
        setShowTourism,
        setShowFuelStations,
        setShowChargingStations,
        fetchTourism,
        fetchFuelStations,
        fetchChargingStations,
        fetchAllPois,
        clearAllPois
    };
}
