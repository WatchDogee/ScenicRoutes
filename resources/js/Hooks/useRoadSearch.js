import { useState } from 'react';
import axios from 'axios';
import {
    canConnectRoads,
    connectRoads,
    isInUrbanArea,
    getRoadStyle,
    getRoadLengthCategory
} from '../utils/roadUtils';
export default function useRoadSearch() {
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [publicRoads, setPublicRoads] = useState([]);
    
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const earthRadius = 6371; 
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return earthRadius * c;
    };
    const deg2rad = (deg) => {
        return deg * (Math.PI/180);
    };
    
    const calculateRoadLength = (geometry) => {
        let length = 0;
        for (let i = 1; i < geometry.length; i++) {
            length += calculateDistance(
                geometry[i - 1].lat, geometry[i - 1].lon,
                geometry[i].lat, geometry[i].lon
            );
        }
        return length * 1000; 
    };
    
    const calculateTwistiness = (geometry) => {
        let totalAngle = 0;
        let totalDistance = 0;
        let cornerCount = 0;
        for (let i = 1; i < geometry.length - 1; i++) {
            const prev = geometry[i - 1];
            const curr = geometry[i];
            const next = geometry[i + 1];
            const segmentDistance = calculateDistance(curr.lat, curr.lon, next.lat, next.lon);
            totalDistance += segmentDistance;
            const angle1 = Math.atan2(curr.lat - prev.lat, curr.lon - prev.lon);
            const angle2 = Math.atan2(next.lat - curr.lat, next.lon - curr.lon);
            let angle = Math.abs(angle2 - angle1);
            if (angle > Math.PI) angle = 2 * Math.PI - angle;
            if (angle > 0.087) cornerCount++;
            totalAngle += angle;
        }
        if (totalDistance === 0) return 0;
        const twistiness = totalAngle / totalDistance;
        return twistiness < 0.0025 && cornerCount < 1 ? 0 : { twistiness, corner_count: cornerCount };
    };
    
    const searchRoads = async (lat, lon, radius, roadType = 'all', curvatureType = 'all') => {
        if (!lat || !lon) {
            setSearchError("Please select a location first");
            return;
        }
        setLoading(true);
        setSearchError(null);
        const roadFilters = {
            "all": "motorway|primary|secondary|tertiary|unclassified",
            "primary": "motorway|primary",
            "secondary": "secondary|tertiary"
        };
        const selectedRoadFilter = roadFilters[roadType] || roadFilters["all"];
        const query = `[out:json];way['highway'~'${selectedRoadFilter}'](around:${radius * 1000},${lat},${lon});out tags geom;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            
            const roadSegments = [];
            data.elements.forEach((way) => {
                if (!way.geometry) return;
                const roadLength = calculateRoadLength(way.geometry);
                
                if (roadLength < 2000) return;
                const twistinessData = calculateTwistiness(way.geometry);
                if (twistinessData === 0) return;
                if (curvatureType === "curvy" && twistinessData.twistiness <= 0.007) return;
                if (curvatureType === "moderate" && (twistinessData.twistiness < 0.0035 || twistinessData.twistiness > 0.007)) return;
                if (curvatureType === "mellow" && twistinessData.twistiness > 0.0035) return;
                
                if (isInUrbanArea(way) && twistinessData.twistiness <= 0.007) return;
                roadSegments.push({
                    id: way.id,
                    name: way.tags.name || "Unnamed Road",
                    geometry: way.geometry,
                    tags: way.tags,
                    twistiness: twistinessData.twistiness,
                    corner_count: twistinessData.corner_count,
                    length: roadLength
                });
            });
            
            const processedSegments = new Set();
            const connectedRoads = [];
            
            for (let i = 0; i < roadSegments.length; i++) {
                if (processedSegments.has(roadSegments[i].id)) continue;
                let currentRoad = roadSegments[i];
                let hasConnected = true;
                
                while (hasConnected) {
                    hasConnected = false;
                    for (let j = 0; j < roadSegments.length; j++) {
                        if (i === j || processedSegments.has(roadSegments[j].id)) continue;
                        if (canConnectRoads(currentRoad, roadSegments[j])) {
                            currentRoad = connectRoads(currentRoad, roadSegments[j]);
                            processedSegments.add(roadSegments[j].id);
                            hasConnected = true;
                            break;
                        }
                    }
                }
                
                const roadLength = calculateRoadLength(currentRoad.geometry);
                const twistinessData = calculateTwistiness(currentRoad.geometry);
                
                connectedRoads.push({
                    id: currentRoad.id,
                    name: currentRoad.name,
                    geometry: currentRoad.geometry,
                    tags: currentRoad.tags,
                    twistiness: twistinessData.twistiness,
                    corner_count: twistinessData.corner_count,
                    length: roadLength,
                    is_connected: currentRoad.id.includes('_') 
                });
                processedSegments.add(roadSegments[i].id);
            }
            
            connectedRoads.sort((a, b) => b.length - a.length);
            
            const newRoads = connectedRoads.map(road => {
                const coordinates = road.geometry.map(point => [point.lat, point.lon]);
                const style = getRoadStyle(road.length, road.twistiness);
                return {
                    id: road.id,
                    name: road.name,
                    coordinates,
                    twistiness: road.twistiness,
                    corner_count: road.corner_count,
                    length: road.length,
                    road_name: road.name,
                    is_connected: road.is_connected,
                    length_category: getRoadLengthCategory(road.length),
                    style
                };
            });
            setPublicRoads(newRoads);
        } catch (error) {
            setSearchError("Failed to fetch roads. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    
    const searchPublicRoads = async (lat, lon, radius, filters = {}) => {
        try {
            setLoading(true);
            setSearchError(null);
            const params = {
                lat,
                lon,
                radius: radius || 50,
                ...filters
            };
            const response = await axios.get('/api/public-roads', { params });
            
            const formattedRoads = response.data.map(road => ({
                ...road,
                average_rating: road.reviews_avg_rating ? parseFloat(road.reviews_avg_rating) : null,
                user: road.user || { name: 'Unknown User' }
            }));
            setPublicRoads(formattedRoads);
        } catch (error) {
            setSearchError('Failed to fetch public roads. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    return {
        loading,
        searchError,
        publicRoads,
        setPublicRoads,
        searchRoads,
        searchPublicRoads,
        calculateDistance,
        calculateRoadLength,
        calculateTwistiness
    };
}
