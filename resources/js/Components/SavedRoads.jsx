import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

export default function SavedRoads({ auth }) {
    const [roads, setRoads] = useState([]);
    const [publicRoads, setPublicRoads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (auth.token) {
            fetchSavedRoads();
        }
    }, [auth.token]);

    useEffect(() => {
        fetchPublicRoads();
    }, []);

    const fetchSavedRoads = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/saved-roads');
            setRoads(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching saved roads:', error);
            setError('Failed to load saved roads');
            if (error.response?.status === 401) {
                // Handle unauthorized access
                window.dispatchEvent(new CustomEvent('auth:failed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPublicRoads = async () => {
        try {
            const response = await apiClient.get('/public-roads');
            setPublicRoads(response.data);
        } catch (error) {
            console.error('Error fetching public roads:', error);
        }
    };

    const saveRoad = async (roadData) => {
        try {
            const response = await apiClient.post('/saved-roads', roadData);
            setRoads([...roads, response.data]);
            return response.data;
        } catch (error) {
            console.error('Error saving road:', error);
            throw error;
        }
    };

    const deleteRoad = async (roadId) => {
        try {
            await apiClient.delete(`/saved-roads/${roadId}`);
            setRoads(roads.filter(road => road.id !== roadId));
        } catch (error) {
            console.error('Error deleting road:', error);
            throw error;
        }
    };

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div>
            <h1>Saved Roads</h1>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <ul>
                    {roads.map(road => (
                        <li key={road.id}>
                            <h2>{road.road_name || 'Unnamed Road'}</h2>
                            <p>{road.road_surface || 'Unknown Surface'}</p>
                            <button onClick={() => deleteRoad(road.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            )}
            <h1>Public Roads</h1>
            <ul>
                {publicRoads.map(road => (
                    <li key={road.id}>
                        <h2>{road.road_name || 'Unnamed Road'}</h2>
                        <p>Rating: {road.average_rating || 'No ratings yet'}</p>
                        <ul>
                            {road.comments?.map(comment => (
                                <li key={comment.id}>{comment.comment}</li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
}