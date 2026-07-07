import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline } from 'react-leaflet';
import axios from 'axios';
const MapComponent = () => {
    const [marker, setMarker] = useState(null);
    const [radius, setRadius] = useState(10);
    const [roads, setRoads] = useState([]);
    const [roadType, setRoadType] = useState('all');
    const [curvatureType, setCurvatureType] = useState('all');
    const searchRoads = async () => {
        if (!marker) {
            alert("Please select a location on the map first!");
            return;
        }
        const { lat, lng } = marker;
        try {
            const response = await axios.get('/api/roads', {
                params: { lat, lon: lng, radius, type: roadType }
            });
            setRoads(response.data);
        } catch (error) {
        }
    };
    return (
        <div className="map-container">
            <div id="sidebar">
                <h3>Filters</h3>
                <label>Search Radius (km):</label>
                <input type="range" min="1" max="50" value={radius} onChange={(e) => setRadius(e.target.value)} />
                <label>Road Type:</label>
                <select value={roadType} onChange={(e) => setRoadType(e.target.value)}>
                    <option value="all">All Roads</option>
                    <option value="primary">Primary Roads</option>
                    <option value="secondary">Secondary Roads</option>
                </select>
                <label>Curvature Type:</label>
                <select value={curvatureType} onChange={(e) => setCurvatureType(e.target.value)}>
                    <option value="all">All Curves</option>
                    <option value="curvy">Very Curved</option>
                    <option value="moderate">Medium Curved</option>
                    <option value="mellow">Mellow</option>
                </select>
                <button onClick={searchRoads}>Find Roads</button>
            </div>
            <MapContainer center={[57.1, 27.1]} zoom={10} onClick={(e) => setMarker(e.latlng)}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {marker && <Marker position={marker} />}
                {marker && <Circle center={marker} radius={radius * 1000} />}
                {roads.map((road, index) => (
                    <Polyline key={index} positions={road.coordinates} color="blue" />
                ))}
            </MapContainer>
        </div>
    );
};
export default MapComponent;
