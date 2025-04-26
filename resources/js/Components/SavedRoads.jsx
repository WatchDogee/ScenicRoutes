import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import NavigationAppSelector from './NavigationAppSelector';

export default function SavedRoads({ auth }) {
    const [roads, setRoads] = useState([]);
    const [publicRoads, setPublicRoads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);
    const [expandedRoads, setExpandedRoads] = useState({});
    const [isListExpanded, setIsListExpanded] = useState(true);

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

    const handleNavigateClick = (road) => {
        if (!road.road_coordinates) {
            alert('No coordinates available for this road');
            return;
        }
        setSelectedRoad(road);
        setShowNavigationSelector(true);
    };

    const toggleRoadExpansion = (roadId) => {
        setExpandedRoads(prev => ({
            ...prev,
            [roadId]: !prev[roadId]
        }));
    };

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="p-4">
            {/* Collapsible header for Saved Roads */}
            <div 
                className="flex justify-between items-center mb-4 cursor-pointer"
                onClick={() => setIsListExpanded(!isListExpanded)}
            >
                <h2 className="text-xl font-bold">Saved Roads</h2>
                <span className="text-gray-500">
                    {isListExpanded ? '▼' : '▶'}
                </span>
            </div>

            {isListExpanded && (
                loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="space-y-4">
                        {roads.map(road => (
                            <div key={road.id} className="border rounded-lg bg-white shadow">
                                <div 
                                    className="p-3 cursor-pointer"
                                    onClick={() => toggleRoadExpansion(road.id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-medium">{road.road_name || 'Unnamed Road'}</h3>
                                        <span className="text-gray-500">
                                            {expandedRoads[road.id] ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </div>
                                
                                {expandedRoads[road.id] && (
                                    <div className="px-3 pb-3 border-t">
                                        <p className="text-sm text-gray-600 mb-2">
                                            {road.description || 'No description available'}
                                        </p>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleNavigateClick(road)}
                                                className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                            >
                                                Navigate
                                            </button>
                                            <button 
                                                onClick={() => handleViewDetails(road)}
                                                className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                                View Details
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(road.id)}
                                                className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Navigation App Selector Modal */}
            {showNavigationSelector && selectedRoad && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                        <div className="flex justify-between items-start mb-4">
                            <NavigationAppSelector 
                                coordinates={JSON.parse(selectedRoad.road_coordinates)}
                                roadName={selectedRoad.road_name}
                            />
                            <button 
                                onClick={() => {
                                    setShowNavigationSelector(false);
                                    setSelectedRoad(null);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-xl font-bold mt-8 mb-4">Public Roads</h2>
            <div className="space-y-4">
                {publicRoads.map(road => (
                    <div key={road.id} className="border rounded-lg p-4 bg-white shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-medium">{road.road_name || 'Unnamed Road'}</h3>
                                <p className="text-sm text-gray-600">Rating: {road.average_rating || 'No ratings yet'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleNavigateClick(road);
                                    }}
                                    className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    Navigate
                                </button>
                            </div>
                        </div>
                        {road.comments && road.comments.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {road.comments.map(comment => (
                                    <div key={comment.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                        {comment.comment}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}