import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
// Import the MarkerCluster plugin
import 'leaflet.markercluster/dist/leaflet.markercluster';
// Import the MarkerCluster styles
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import PointOfInterestService from '../Services/PointOfInterestService';

export default function usePointsOfInterest(mapRef) {
    const [tourism, setTourism] = useState([]);
    const [fuelStations, setFuelStations] = useState([]);
    const [chargingStations, setChargingStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Layer groups for different POI types
    const tourismLayerRef = useRef(null);
    const fuelLayerRef = useRef(null);
    const chargingLayerRef = useRef(null);

    // Visibility state
    const [showTourism, setShowTourism] = useState(false);
    const [showFuelStations, setShowFuelStations] = useState(false);
    const [showChargingStations, setShowChargingStations] = useState(false);

    // Initialize layer groups
    useEffect(() => {
        if (!mapRef.current) return;

        console.log('Initializing POI layer groups');

        // Only create marker cluster groups if they don't exist
        if (!tourismLayerRef.current) {
            tourismLayerRef.current = L.markerClusterGroup({
                disableClusteringAtZoom: 16,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: function(cluster) {
                    return L.divIcon({
                        html: `<div class="cluster-icon tourism-cluster">${cluster.getChildCount()}</div>`,
                        className: 'custom-cluster-icon',
                        iconSize: L.point(40, 40)
                    });
                }
            }).addTo(mapRef.current);
        }

        if (!fuelLayerRef.current) {
            fuelLayerRef.current = L.markerClusterGroup({
                disableClusteringAtZoom: 16,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: function(cluster) {
                    return L.divIcon({
                        html: `<div class="cluster-icon fuel-cluster">${cluster.getChildCount()}</div>`,
                        className: 'custom-cluster-icon',
                        iconSize: L.point(40, 40)
                    });
                }
            }).addTo(mapRef.current);
        }

        if (!chargingLayerRef.current) {
            chargingLayerRef.current = L.markerClusterGroup({
                disableClusteringAtZoom: 16,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: function(cluster) {
                    return L.divIcon({
                        html: `<div class="cluster-icon charging-cluster">${cluster.getChildCount()}</div>`,
                        className: 'custom-cluster-icon',
                        iconSize: L.point(40, 40)
                    });
                }
            }).addTo(mapRef.current);
        }

        // Clear layers on unmount
        return () => {
            if (tourismLayerRef.current) tourismLayerRef.current.clearLayers();
            if (fuelLayerRef.current) fuelLayerRef.current.clearLayers();
            if (chargingLayerRef.current) chargingLayerRef.current.clearLayers();
        };
    }, [mapRef.current]);

    // Toggle visibility of tourism POIs
    useEffect(() => {
        if (!mapRef.current || !tourismLayerRef.current) return;

        console.log('Tourism visibility changed:', showTourism);

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
            console.error('Error toggling tourism layer:', error);
        }
    }, [showTourism]);

    // Toggle visibility of fuel stations
    useEffect(() => {
        if (!mapRef.current || !fuelLayerRef.current) return;

        console.log('Fuel stations visibility changed:', showFuelStations);

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
            console.error('Error toggling fuel stations layer:', error);
        }
    }, [showFuelStations]);

    // Toggle visibility of charging stations
    useEffect(() => {
        if (!mapRef.current || !chargingLayerRef.current) return;

        console.log('Charging stations visibility changed:', showChargingStations);

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
            console.error('Error toggling charging stations layer:', error);
        }
    }, [showChargingStations]);

    // Fetch tourism POIs
    const fetchTourism = async (lat, lon, radius = 10, types = []) => {
        if (!lat || !lon) return;

        setLoading(true);
        setError(null);

        try {
            const tourismData = await PointOfInterestService.fetchTourismObjects(lat, lon, radius, types);

            setTourism(tourismData);

            // Clear existing markers
            if (tourismLayerRef.current) {
                tourismLayerRef.current.clearLayers();
            }

            // Add markers to the map
            tourismData.forEach(poi => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin tourism-pin">
                             <i class="fa fa-${getTourismIcon(poi.subtype)}"></i>
                           </div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 30], // Adjusted to center the icon horizontally and position it properly vertically
                    popupAnchor: [0, -30]  // Adjusted to position the popup above the icon
                });

                const marker = L.marker([poi.latitude, poi.longitude], { icon })
                    .bindPopup(createTourismPopup(poi))
                    .addTo(tourismLayerRef.current);
            });

            // Show the tourism layer if not already visible
            setShowTourism(true);

        } catch (error) {
            console.error('Error fetching tourism POIs:', error);
            setError('Failed to fetch tourism points of interest');
        } finally {
            setLoading(false);
        }
    };

    // Fetch fuel stations
    const fetchFuelStations = async (lat, lon, radius = 10) => {
        if (!lat || !lon) return;

        setLoading(true);
        setError(null);

        try {
            console.log(`Fetching fuel stations at lat: ${lat}, lon: ${lon}, radius: ${radius}km`);
            const fuelData = await PointOfInterestService.fetchFuelStations(lat, lon, radius);
            console.log('Received fuel stations data:', fuelData);

            setFuelStations(fuelData);

            // Ensure the layer group exists
            if (!fuelLayerRef.current && mapRef.current) {
                console.log('Creating new fuel stations layer group');
                fuelLayerRef.current = L.layerGroup().addTo(mapRef.current);
            }

            // Clear existing markers
            if (fuelLayerRef.current) {
                console.log('Clearing existing fuel station markers');
                fuelLayerRef.current.clearLayers();
            } else {
                console.error('Fuel layer reference is not available');
                return;
            }

            // Add markers to the map
            console.log(`Adding ${fuelData.length} fuel station markers to the map`);
            fuelData.forEach(poi => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin fuel-pin">
                             <i class="fa fa-gas-pump"></i>
                           </div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 30], // Adjusted to center the icon horizontally and position it properly vertically
                    popupAnchor: [0, -30]  // Adjusted to position the popup above the icon
                });

                try {
                    const marker = L.marker([poi.latitude, poi.longitude], {
                        icon,
                        zIndexOffset: 500 // Ensure markers are above other elements
                    })
                    .bindPopup(createFuelPopup(poi))
                    .addTo(fuelLayerRef.current);

                    console.log(`Added fuel station marker at [${poi.latitude}, ${poi.longitude}]`);
                } catch (err) {
                    console.error('Error adding fuel station marker:', err);
                }
            });

            // Show the fuel layer if not already visible
            console.log('Setting fuel stations visibility to true');
            setShowFuelStations(true);

            // Make sure the layer is added to the map
            if (mapRef.current && !mapRef.current.hasLayer(fuelLayerRef.current)) {
                console.log('Adding fuel layer to map');
                mapRef.current.addLayer(fuelLayerRef.current);
            }

        } catch (error) {
            console.error('Error fetching fuel stations:', error);
            setError('Failed to fetch fuel stations');
        } finally {
            setLoading(false);
        }
    };

    // Fetch charging stations
    const fetchChargingStations = async (lat, lon, radius = 10) => {
        if (!lat || !lon) return;

        setLoading(true);
        setError(null);

        try {
            const chargingData = await PointOfInterestService.fetchChargingStations(lat, lon, radius);

            setChargingStations(chargingData);

            // Clear existing markers
            if (chargingLayerRef.current) {
                chargingLayerRef.current.clearLayers();
            }

            // Add markers to the map
            chargingData.forEach(poi => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="marker-pin charging-pin">
                             <i class="fa fa-bolt"></i>
                           </div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 30], // Adjusted to center the icon horizontally and position it properly vertically
                    popupAnchor: [0, -30]  // Adjusted to position the popup above the icon
                });

                const marker = L.marker([poi.latitude, poi.longitude], { icon })
                    .bindPopup(createChargingPopup(poi))
                    .addTo(chargingLayerRef.current);
            });

            // Show the charging layer if not already visible
            setShowChargingStations(true);

        } catch (error) {
            console.error('Error fetching charging stations:', error);
            setError('Failed to fetch charging stations');
        } finally {
            setLoading(false);
        }
    };

    // Fetch all POI types
    const fetchAllPois = async (lat, lon, radius = 10) => {
        if (!lat || !lon) {
            console.error('Invalid coordinates for POI search:', { lat, lon });
            setError('Invalid location coordinates. Please select a location on the map.');
            return;
        }

        console.log(`Fetching all POIs at lat: ${lat}, lon: ${lon}, radius: ${radius}km`);

        try {
            setLoading(true);
            setError(null); // Clear any previous errors

            let fetchCount = 0;
            let successCount = 0;

            // Make sure we have a map reference
            if (!mapRef.current) {
                console.error('Map reference is not available');
                setError('Map is not initialized. Please refresh the page and try again.');
                return;
            }

            // Sequential fetching to avoid overwhelming the Overpass API
            if (showTourism) {
                fetchCount++;
                try {
                    console.log('Fetching tourism POIs...');
                    await fetchTourism(lat, lon, radius);
                    successCount++;
                } catch (err) {
                    console.error('Error fetching tourism POIs:', err);
                }
            }

            if (showFuelStations) {
                fetchCount++;
                try {
                    console.log('Fetching fuel stations...');
                    await fetchFuelStations(lat, lon, radius);
                    successCount++;
                } catch (err) {
                    console.error('Error fetching fuel stations:', err);
                }
            }

            if (showChargingStations) {
                fetchCount++;
                try {
                    console.log('Fetching charging stations...');
                    await fetchChargingStations(lat, lon, radius);
                    successCount++;
                } catch (err) {
                    console.error('Error fetching charging stations:', err);
                }
            }

            // If none are selected, fetch tourism by default
            if (fetchCount === 0) {
                console.log('No POI types selected, fetching tourism by default');
                setShowTourism(true);
                try {
                    await fetchTourism(lat, lon, radius);
                    successCount++;
                    fetchCount = 1;
                } catch (err) {
                    console.error('Error fetching default tourism POIs:', err);
                }
            }

            // Ensure all selected layers are visible on the map
            if (showTourism && tourismLayerRef.current && !mapRef.current.hasLayer(tourismLayerRef.current)) {
                console.log('Adding tourism layer to map');
                mapRef.current.addLayer(tourismLayerRef.current);
            }

            if (showFuelStations && fuelLayerRef.current && !mapRef.current.hasLayer(fuelLayerRef.current)) {
                console.log('Adding fuel stations layer to map');
                mapRef.current.addLayer(fuelLayerRef.current);
            }

            if (showChargingStations && chargingLayerRef.current && !mapRef.current.hasLayer(chargingLayerRef.current)) {
                console.log('Adding charging stations layer to map');
                mapRef.current.addLayer(chargingLayerRef.current);
            }

            if (successCount === 0 && fetchCount > 0) {
                setError('Failed to fetch any points of interest. Please try again later.');
            } else if (successCount < fetchCount) {
                setError('Some points of interest could not be loaded. Try again or select different POI types.');
            } else {
                console.log('All POIs fetched successfully');
            }
        } catch (error) {
            console.error('Error in fetchAllPois:', error);
            setError('Failed to fetch points of interest. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get icon for tourism type
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

    // Create popup content for tourism POI
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

    // Create popup content for fuel station
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

    // Create popup content for charging station
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

    // Clear all POI layers
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
