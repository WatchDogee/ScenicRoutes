import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import NavigationAppSelector from './NavigationAppSelector';
import RatingModal from './RatingModal';

export default function SavedRoads({ auth }) {
    const [roads, setRoads] = useState([]);
    const [publicRoads, setPublicRoads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);
    const [expandedRoads, setExpandedRoads] = useState({});
    const [isListExpanded, setIsListExpanded] = useState(true);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedRoadForReview, setSelectedRoadForReview] = useState(null);
    const [localRating, setLocalRating] = useState(0);
    const [localComment, setLocalComment] = useState('');

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
            // Use the authenticated endpoint to get only the user's saved roads
            const response = await apiClient.get('/api/saved-roads');
            console.log('Fetched user saved roads:', response.data);
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
            // Use the public roads endpoint to get all public roads
            const response = await apiClient.get('/api/public-roads');
            // Check if the response has a roads property (newer API format)
            const roads = response.data.roads ? response.data.roads : response.data;
            console.log('Fetched public roads:', roads);
            setPublicRoads(roads);
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
            return { success: true, message: 'Road deleted successfully' };
        } catch (error) {
            console.error('Error deleting road:', error);
            let errorMessage = 'Failed to delete road. Please try again.';
            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = 'Road not found or you don\'t have permission to delete it.';
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            }
            throw new Error(errorMessage);
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

    const handleViewDetails = async (road) => {
        try {
            // Use the public endpoint to view road details without requiring authentication
            const response = await apiClient.get(`/api/public-roads/${road.id}`);
            setSelectedRoadForReview(response.data);
            setRatingModalOpen(true);

            // If user is logged in and has already reviewed, pre-fill the form
            if (auth?.user) {
                const existingReview = response.data.reviews?.find(review => review.user?.id === auth.user.id);
                if (existingReview) {
                    setLocalRating(existingReview.rating);
                    setLocalComment(existingReview.comment || '');
                } else {
                    setLocalRating(0);
                    setLocalComment('');
                }
            } else {
                setLocalRating(0);
                setLocalComment('');
            }
        } catch (error) {
            console.error('Error fetching road details:', error);
        }
    };

    const handleCloseRatingModal = () => {
        setRatingModalOpen(false);
        setSelectedRoadForReview(null);
        setLocalRating(0);
        setLocalComment('');
    };

    const handleSubmitReview = async (rating, comment) => {
        try {
            await apiClient.post(`/saved-roads/${selectedRoadForReview.id}/review`, {
                rating,
                comment
            });
            handleCloseRatingModal();
            // Refresh the roads lists
            fetchSavedRoads();
            fetchPublicRoads();
        } catch (error) {
            console.error('Error submitting review:', error);
        }
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
                                                onClick={async () => {
                                                    if (window.confirm(`Are you sure you want to delete "${road.road_name || 'Unnamed Road'}"? This action cannot be undone.`)) {
                                                        try {
                                                            await deleteRoad(road.id);
                                                            alert("Road deleted successfully!");
                                                        } catch (error) {
                                                            alert(error.message);
                                                        }
                                                    }
                                                }}
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
                                <button
                                    onClick={() => handleViewDetails(road)}
                                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rating Modal */}
            <RatingModal
                isOpen={ratingModalOpen}
                onClose={handleCloseRatingModal}
                onSubmit={handleSubmitReview}
                road={selectedRoadForReview}
                auth={auth}
                initialRating={localRating}
                initialComment={localComment}
            />

            {/* Navigation App Selector Modal */}
            {showNavigationSelector && selectedRoad && (
                <NavigationAppSelector
                    isOpen={showNavigationSelector}
                    onClose={() => setShowNavigationSelector(false)}
                    coordinates={selectedRoad.road_coordinates}
                />
            )}
        </div>
    );
}