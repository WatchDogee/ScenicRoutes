import axios from 'axios';

const externalApiClient = axios.create({
    withCredentials: false,
    timeout: 30000
});
$1
class PointOfInterestService {
    $1
    processChargingStationsResponse(response) {
        if (!response.data || !response.data.elements) {
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
            return [];
        }
        return response.data.elements.map(element => {
            if (element.type === 'node' && element.tags && element.tags.amenity === 'fuel') {
                
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
    $1
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
        
        let query = "[out:json];(";
        tourismTypes.forEach(type => {
            query += `node[tourism="${type}"](around:${radiusMeters},${lat},${lon});`;
        });
        query += ");out body;";
        try {
            
            try {
                const response = await axios.get('/api/overpass-proxy', {
                    params: { data: query }
                });
                return this.processTourismResponse(response);
            } catch (proxyError) {
                
                const response = await externalApiClient.get('https://overpass-api.de/api/interpreter', {
                    params: { data: query }
                });
                if (!response.data || !response.data.elements) {
                    return [];
                }
                return this.processTourismResponse(response);
            }
        } catch (error) {
            return [];
        }
    }
    $1
    async fetchFuelStations(lat, lon, radius) {
        const radiusMeters = radius * 1000;
        
        const query = `[out:json];(node[amenity="fuel"](around:${radiusMeters},${lat},${lon}););out body;`;
        try {
            
            try {
                const response = await axios.get('/api/overpass-proxy', {
                    params: { data: query }
                });
                return this.processFuelStationsResponse(response);
            } catch (proxyError) {
                
                const response = await externalApiClient.get('https://overpass-api.de/api/interpreter', {
                    params: { data: query }
                });
            return this.processFuelStationsResponse(response);
            }
        } catch (error) {
            return [];
        }
    }
    $1
    async fetchChargingStations(lat, lon, radius) {
        const radiusMeters = radius * 1000;
        
        const query = `[out:json];(node[amenity="charging_station"](around:${radiusMeters},${lat},${lon}););out body;`;
        try {
            
            try {
                const response = await axios.get('/api/overpass-proxy', {
                    params: { data: query }
                });
                return this.processChargingStationsResponse(response);
            } catch (proxyError) {
                
                const response = await externalApiClient.get('https://overpass-api.de/api/interpreter', {
                    params: { data: query }
                });
            return this.processChargingStationsResponse(response);
            }
        } catch (error) {
            return [];
        }
    }
}
export default new PointOfInterestService();
