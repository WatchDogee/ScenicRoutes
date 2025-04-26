import React, { useState, useEffect } from 'react';
import axios from 'axios';
import L from 'leaflet';
import NavigationAppSelector from './NavigationAppSelector';

export default function Community({ auth }) {
    const [publicRoads, setPublicRoads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchLocation, setSearchLocation] = useState('');
    const [searchRadius, setSearchRadius] = useState(50); // Default 50km radius
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [comment, setComment] = useState('');
    const [rating, setRating] = useState(0);
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);

    useEffect(() => {
        fetchPublicRoads();
    }, []);

    const fetchPublicRoads = async (location = '') => {
        setLoading(true);
        try {
            let url = '/api/public-roads';
            if (location) {
                url += `?location=${encodeURIComponent(location)}&radius=${searchRadius}`;
            }
            const response = await axios.get(url);
            setPublicRoads(response.data);
        } catch (error) {
            console.error('Error fetching public roads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchPublicRoads(searchLocation);
    };

    const handleRateRoad = async (roadId) => {
        if (!auth.user) {
            alert('Please log in to rate roads');
            return;
        }

        try {
            await axios.post(`/api/saved-roads/${roadId}/review`, { rating }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            fetchPublicRoads(searchLocation); // Refresh the list
            setRating(0);
        } catch (error) {
            console.error('Error rating road:', error);
            alert('Failed to submit rating');
        }
    };

    const handleComment = async (roadId) => {
        if (!auth.user) {
            alert('Please log in to comment');
            return;
        }

        if (!comment.trim()) {
            alert('Please enter a comment');
            return;
        }

        try {
            await axios.post(`/api/saved-roads/${roadId}/comment`, { comment }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setComment('');
            fetchPublicRoads(searchLocation); // Refresh the list
        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment');
        }
    };

    const handleNavigateClick = (e, road) => {
        e.stopPropagation(); // Prevent event bubbling
        if (!road.road_coordinates) {
            alert('No coordinates available for this road');
            return;
        }
        setSelectedRoad(road);
        setShowNavigationSelector(true);
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Community Roads</h2>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search by location (e.g., Balvi)"
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        className="flex-1 p-2 border rounded"
                    />
                    <input
                        type="number"
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(e.target.value)}
                        min="1"
                        max="200"
                        className="w-24 p-2 border rounded"
                    />
                    <span className="self-center">km</span>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Search
                    </button>
                </div>
            </form>

            {/* Roads List */}
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-4">
                    {publicRoads.map(road => (
                        <div key={road.id} className="border rounded-lg p-4 bg-white shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold">{road.road_name}</h3>
                                    <div className="text-sm text-gray-600 mt-1">
                                        <p>Length: {(road.length / 1000).toFixed(2)} km</p>
                                        <p>Corners: {road.corner_count}</p>
                                        <p>Curve Score: {road.twistiness?.toFixed(4)}</p>
                                        <p>Average Rating: {road.average_rating ? road.average_rating.toFixed(1) : 'No ratings'} ⭐</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleNavigateClick(e, road)}
                                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        Navigate
                                    </button>
                                </div>
                            </div>

                            {auth.user && (
                                <div className="flex items-center gap-2 mb-3">
                                    <select
                                        value={rating}
                                        onChange={(e) => setRating(Number(e.target.value))}
                                        className="p-1 text-sm border rounded"
                                    >
                                        <option value="0">Rate this road</option>
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <option key={num} value={num}>{num} ⭐</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleRateRoad(road.id)}
                                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Rate
                                    </button>
                                </div>
                            )}

                            {/* Comments Section */}
                            <div className="mt-3">
                                <h4 className="font-medium text-sm mb-2">Comments</h4>
                                <div className="space-y-2 mb-3">
                                    {road.comments?.map(comment => (
                                        <div key={comment.id} className="bg-gray-50 p-2 rounded text-sm">
                                            <p className="text-gray-600">{comment.user?.name}:</p>
                                            <p>{comment.comment}</p>
                                        </div>
                                    ))}
                                </div>
                                {auth.user && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add a comment..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            className="flex-1 p-2 text-sm border rounded"
                                        />
                                        <button
                                            onClick={() => handleComment(road.id)}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Comment
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
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
        </div>
    );
} 