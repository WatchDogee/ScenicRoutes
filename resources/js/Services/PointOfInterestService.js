import axios from 'axios';

// Create a custom Axios instance for external APIs that doesn't send credentials
const externalApiClient = axios.create({
    withCredentials: false,
    timeout: 30000
});

/**
 * Service for fetching and managing Points of Interest
 */
class PointOfInterestService {
    /**
     * Process tourism response from Overpass API
     *
     * @param {Object} response The API response
     * @returns {Array} Processed tourism objects
     */
    processChargingStationsResponse(response) {
        if (!response.data || !response.data.elements) {
            console.error('Invalid response from Overpass API');
            return [];
        }

        return response.data.elements.map(element => {
            if (element.type === 'node' && element.tags && element.tags.amenity === 'charging_station') {
                return {
                    id: element.id,
                    type: 'charging',
                    subtype: 'ev_charging',
                    name: element.tags.name || 'Unnamed Charging Station',
                    latitude: element.lat,
                    longitude: element.lon,
                    properties: {
                        operator: element.tags.operator,
                        network: element.tags.network,
                        opening_hours: element.tags.opening_hours,
                        socket_type2: element.tags['socket:type2'],
                        socket_chademo: element.tags['socket:chademo'],
                        socket_ccs: element.tags['socket:ccs'],
                        capacity: element.tags.capacity,
                        authentication: element.tags.authentication,
                        payment: element.tags.payment,
                        fee: element.tags.fee,
                        maxpower: element.tags.maxpower,
                    }
                };
            }
            return null;
        }).filter(Boolean);
    }

    processFuelStationsResponse(response) {
        if (!response.data || !response.data.elements) {
            console.error('Invalid response from Overpass API');
            return [];
        }

        return response.data.elements.map(element => {
            if (element.type === 'node' && element.tags && element.tags.amenity === 'fuel') {
                // Extract fuel types
                const fuelTypes = [];
                for (const key in element.tags) {
                    if (key.startsWith('fuel:') && element.tags[key] === 'yes') {
                        fuelTypes.push(key.replace('fuel:', ''));
                    }
                }

                return {
                    id: element.id,
                    type: 'fuel',
                    subtype: 'gas_station',
                    name: element.tags.name || 'Unnamed Fuel Station',
                    latitude: element.lat,
                    longitude: element.lon,
                    properties: {
                        brand: element.tags.brand,
                        operator: element.tags.operator,
                        opening_hours: element.tags.opening_hours,
                        fuel_types: fuelTypes,
                        payment_credit_card: element.tags['payment:credit_card'],
                        payment_debit_card: element.tags['payment:debit_card'],
                        payment_cash: element.tags['payment:cash'],
                        wheelchair: element.tags.wheelchair,
                        shop: element.tags.shop,
                    }
                };
            }
            return null;
        }).filter(Boolean);
    }

    processTourismResponse(response) {
        if (!response.data || !response.data.elements) {
            console.error('Invalid response from Overpass API');
            return [];
        }

        return response.data.elements.map(element => {
            if (element.type === 'node' && element.tags && element.tags.tourism) {
                return {
                    id: element.id,
                    type: 'tourism',
                    subtype: element.tags.tourism,
                    name: element.tags.name || 'Unnamed',
                    latitude: element.lat,
                    longitude: element.lon,
                    properties: {
                        website: element.tags.website,
                        phone: element.tags.phone,
                        opening_hours: element.tags.opening_hours,
                        description: element.tags.description,
                        wheelchair: element.tags.wheelchair,
                        internet_access: element.tags.internet_access,
                    }
                };
            }
            return null;
        }).filter(Boolean);
    }
    /**
     * Fetch tourism objects from Overpass API
     *
     * @param {number} lat Latitude
     * @param {number} lon Longitude
     * @param {number} radius Radius in kilometers
     * @param {Array} types Specific tourism types to fetch (empty for all)
     * @returns {Promise<Array>} Tourism objects
     */
    async fetchTourismObjects(lat, lon, radius, types = []) {
        const radiusMeters = radius * 1000;
        const tourismTypes = types.length > 0 ? types : [
            'attraction',
            'museum',
            'gallery',
            'viewpoint',
            'hotel',
            'guest_house',
            'hostel',
            'camp_site',
            'alpine_hut',
            'wilderness_hut',
            'information',
            'picnic_site',
        ];

        // Build the Overpass query
        let query = "[out:json];(";

        tourismTypes.forEach(type => {
            query += `node[tourism="${type}"](around:${radiusMeters},${lat},${lon});`;
        });

        query += ");out body;";

        try {
            console.log('Sending Overpass API query for tourism:', query);
            // Try the proxy endpoint first
            try {
                const response = await axios.get('/api/overpass-proxy', {
                    params: { data: query }
                });
                console.log('Overpass API proxy response for tourism:', response.data);
                return this.processTourismResponse(response);
            } catch (proxyError) {
                console.warn('Proxy request failed, trying direct API:', proxyError);
                // Fall back to direct API call if proxy fails
                const response = await externalApiClient.get('https://overpass-api.de/api/interpreter', {
                    params: { data: query }
                });

                console.log('Overpass API direct response for tourism:', response.data);

                if (!response.data || !response.data.elements) {
                    console.error('Invalid response from Overpass API');
                    return [];
                }

                return this.processTourismResponse(response);
            }
        } catch (error) {
            console.error('Error fetching tourism objects:', error);
            return [];
        }
    }

    /**
     * Fetch fuel stations from Overpass API
     *
     * @param {number} lat Latitude
     * @param {number} lon Longitude
     * @param {number} radius Radius in kilometers
     * @returns {Promise<Array>} Fuel stations
     */
    async fetchFuelStations(lat, lon, radius) {
        const radiusMeters = radius * 1000;

        // Build the Overpass query
        const query = `[out:json];(node[amenity="fuel"](around:${radiusMeters},${lat},${lon}););out body;`;

        try {
            console.log('Sending Overpass API query for fuel stations:', query);
            // Try the proxy endpoint first
            try {
                const response = await axios.get('/api/overpass-proxy', {
                    params: { data: query }
                });
                console.log('Overpass API proxy response for fuel stations:', response.data);
                return this.processFuelStationsResponse(response);
            } catch (proxyError) {
                console.warn('Proxy request failed, trying direct API:', proxyError);
                // Fall back to direct API call if proxy fails
                const response = await externalApiClient.get('https://overpass-api.de/api/interpreter', {
                    params: { data: query }
                });

            console.log('Overpass API direct response for fuel stations:', response.data);
            return this.processFuelStationsResponse(response);
            }
        } catch (error) {
            console.error('Error fetching fuel stations:', error);
            return [];
        }
    }

    /**
     * Fetch EV charging stations from Overpass API
     *
     * @param {number} lat Latitude
     * @param {number} lon Longitude
     * @param {number} radius Radius in kilometers
     * @returns {Promise<Array>} EV charging stations
     */
    async fetchChargingStations(lat, lon, radius) {
        const radiusMeters = radius * 1000;

        // Build the Overpass query
        const query = `[out:json];(node[amenity="charging_station"](around:${radiusMeters},${lat},${lon}););out body;`;

        try {
            console.log('Sending Overpass API query for charging stations:', query);
            // Try the proxy endpoint first
            try {
                const response = await axios.get('/api/overpass-proxy', {
                    params: { data: query }
                });
                console.log('Overpass API proxy response for charging stations:', response.data);
                return this.processChargingStationsResponse(response);
            } catch (proxyError) {
                console.warn('Proxy request failed, trying direct API:', proxyError);
                // Fall back to direct API call if proxy fails
                const response = await externalApiClient.get('https://overpass-api.de/api/interpreter', {
                    params: { data: query }
                });

            console.log('Overpass API direct response for charging stations:', response.data);
            return this.processChargingStationsResponse(response);
            }
        } catch (error) {
            console.error('Error fetching charging stations:', error);
            return [];
        }
    }
}

export default new PointOfInterestService();
