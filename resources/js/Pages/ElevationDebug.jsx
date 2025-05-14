import React, { useState, useEffect } from 'react';
import axios from 'axios';
export default function ElevationDebug() {
    const [roads, setRoads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchRoads = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Please log in to view road data');
                    setLoading(false);
                    return;
                }
                const response = await axios.get('/api/saved-roads', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRoads(response.data);
                setLoading(false);
            } catch (error) {
                setError('Failed to fetch road data');
                setLoading(false);
            }
        };
        fetchRoads();
    }, []);
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Elevation Data Debug</h1>
            {loading ? (
                <p>Loading road data...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <div>
                    <p className="mb-4">Found {roads.length} roads</p>
                    <table className="w-full border-collapse border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2">ID</th>
                                <th className="border p-2">Name</th>
                                <th className="border p-2">Elevation Gain</th>
                                <th className="border p-2">Elevation Loss</th>
                                <th className="border p-2">Max Elevation</th>
                                <th className="border p-2">Min Elevation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roads.map(road => (
                                <tr key={road.id}>
                                    <td className="border p-2">{road.id}</td>
                                    <td className="border p-2">{road.road_name}</td>
                                    <td className="border p-2">{road.elevation_gain || 'N/A'}</td>
                                    <td className="border p-2">{road.elevation_loss || 'N/A'}</td>
                                    <td className="border p-2">{road.max_elevation || 'N/A'}</td>
                                    <td className="border p-2">{road.min_elevation || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
