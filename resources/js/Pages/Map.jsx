import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

export default function Map() {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const radiusCircleRef = useRef(null);
    const roadsLayerRef = useRef(null);
    const [radius, setRadius] = useState(10);
    const [roadType, setRoadType] = useState('all');
    const [curvatureType, setCurvatureType] = useState('all');
    const [loading, setLoading] = useState(false);
    const [roads, setRoads] = useState([]);
    const [auth, setAuth] = useState({ user: null, token: null });
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });

    const handleRadiusChange = (e) => {
        setRadius(Number(e.target.value));
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setRadius(Number(e.target.value) * 1000);
        }
    };

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

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const earthRadius = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
    
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) ** 2;
    
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    
    const getRoadLength = (geometry) => {
        let length = 0;
        for (let i = 1; i < geometry.length; i++) {
            length += getDistance(
                geometry[i - 1].lat, geometry[i - 1].lon,
                geometry[i].lat, geometry[i].lon
            );
        }
        return length;
    };
    
    const calculateTwistiness = (geometry) => {
        let totalAngle = 0;
        let totalDistance = 0;
        let cornerCount = 0;
    
        for (let i = 1; i < geometry.length - 1; i++) {
            const prev = geometry[i - 1];
            const curr = geometry[i];
            const next = geometry[i + 1];
    
            const segmentDistance = getDistance(curr.lat, curr.lon, next.lat, next.lon);
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

    const searchRoads = async () => {
        const map = mapRef.current;
        if (!markerRef.current || !map) {
            alert("Please select a location on the map first!");
            return;
        }

        setLoading(true);
        const lat = markerRef.current.getLatLng().lat;
        const lon = markerRef.current.getLatLng().lng;

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
            roadsLayerRef.current.clearLayers();

            const newRoads = [];
            data.elements.forEach((way) => {
                if (!way.geometry) return;

                const roadLength = getRoadLength(way.geometry);
                if (roadLength < 1750) return; // Filter roads by length

                const twistinessData = calculateTwistiness(way.geometry);
                if (twistinessData === 0) return; // Skip if twistiness calculation fails

                // Apply user-selected curvature type filters
                if (curvatureType === "curvy" && twistinessData.twistiness <= 0.007) return;
                if (curvatureType === "moderate" && (twistinessData.twistiness < 0.0035 || twistinessData.twistiness > 0.007)) return;
                if (curvatureType === "mellow" && twistinessData.twistiness > 0.0035) return;

                const coordinates = way.geometry.map(point => [point.lat, point.lon]);
                const name = way.tags.name || "Unnamed Road";

                let color = "green"; 
                if (twistinessData.twistiness > 0.007) color = "red"; // Very Curvy
                else if (twistinessData.twistiness > 0.0035) color = "yellow"; // Moderately Curvy

                const polyline = L.polyline(coordinates, { color, weight: 8 }).addTo(roadsLayerRef.current);

                const popupContent = `
                    <b>${name}</b><br>
                    Length: ${(roadLength / 1000).toFixed(2)} km<br>
                    Corners: ${twistinessData.corner_count}<br>
                    Curve Score: ${twistinessData.twistiness.toFixed(4)}<br>
                    <button id="save-road-${way.id}">Save Road</button>
                `;

                polyline.bindPopup(popupContent);
                polyline.on("popupopen", () => {
                    document.getElementById(`save-road-${way.id}`).addEventListener('click', () => saveRoad({ id: way.id, name, coordinates }));
                });

                newRoads.push({ id: way.id, name, coordinates });
            });

            setRoads(newRoads);
        } catch (error) {
            console.error("Error fetching roads:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveRoad = async (road) => {
        if (!auth.token) {
            alert("Please log in to save roads.");
            return;
        }

        const isPublic = confirm("Do you want to make this road public?");

        try {
            await axios.post('/api/saved-roads', { ...road, is_public: isPublic }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            alert("Road saved successfully!");
        } catch (error) {
            console.error("Error saving road:", error);
            alert("Failed to save road.");
        }
    };

    const addReview = async (roadId, rating) => {
        try {
            await axios.post(`/api/saved-roads/${roadId}/review`, { rating }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            alert("Review added successfully!");
        } catch (error) {
            console.error("Error adding review:", error);
            alert("Failed to add review.");
        }
    };

    const addComment = async (roadId, comment) => {
        try {
            await axios.post(`/api/saved-roads/${roadId}/comment`, { comment }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            alert("Comment added successfully!");
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to add comment.");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/login', loginForm);
            setAuth({ user: response.data.user, token: response.data.token });
            alert("Login successful!");
        } catch (error) {
            console.error("Login error:", error);
            alert("Failed to log in.");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            // Update the endpoint to match the correct API route
            await axios.post('/register', registerForm); // Adjusted endpoint
            alert("Registration successful! Please log in.");
            setAuthMode('login');
        } catch (error) {
            console.error("Registration error:", error);
            alert("Failed to register.");
        }
    };

    useEffect(() => {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        const leafletMap = L.map(mapContainer).setView([57.1, 27.1], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(leafletMap);

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
    }, []);

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-80 p-4 bg-white shadow-md overflow-y-auto">
                {auth.user ? (
                    <div>
                        <h3>Welcome, {auth.user.name}</h3>
                        <button onClick={() => setAuth({ user: null, token: null })} className="bg-red-500 text-white w-full p-1 mt-2">
                            Log Out
                        </button>
                    </div>
                ) : authMode === 'login' ? (
                    <form onSubmit={handleLogin}>
                        <h3 className="font-semibold mb-2">Login</h3>
                        <input
                            type="email"
                            placeholder="Email"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <button type="submit" className="bg-blue-500 text-white w-full p-1">
                            Log In
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthMode('register')}
                            className="text-sm text-blue-600 mt-2"
                        >
                            Don't have an account? Register
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <h3 className="font-semibold mb-2">Register</h3>
                        <input
                            type="text"
                            placeholder="Name"
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={registerForm.password_confirmation}
                            onChange={(e) => setRegisterForm({ ...registerForm, password_confirmation: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <button type="submit" className="bg-green-500 text-white w-full p-1">
                            Register
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="text-sm text-blue-600 mt-2"
                        >
                            Already have an account? Log In
                        </button>
                    </form>
                )}

                <h3 className="font-semibold mt-4 mb-2">Filters</h3>
                <label>Search Radius: {radius} km</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={handleRadiusChange}
                    className="w-full mb-4"
                />
                <label>Road Type</label>
                <select
                    value={roadType}
                    onChange={(e) => setRoadType(e.target.value)}
                    className="w-full mb-2"
                >
                    <option value="all">All Roads</option>
                    <option value="primary">Primary Roads</option>
                    <option value="secondary">Secondary Roads</option>
                </select>
                <label>Curvature Type</label>
                <select
                    value={curvatureType}
                    onChange={(e) => setCurvatureType(e.target.value)}
                    className="w-full mb-2"
                >
                    <option value="all">All Curves</option>
                    <option value="curvy">Very Curved</option>
                    <option value="moderate">Moderately Curved</option>
                    <option value="mellow">Mellow</option>
                </select>
                <button onClick={searchRoads} className="bg-green-500 text-white w-full p-1 mt-2">
                    Search Roads
                </button>
            </div>

            {/* Map */}
            <div className="flex-1" id="map"></div>
        </div>
    );
}