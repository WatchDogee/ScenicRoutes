import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import L from 'leaflet';
import NavigationAppSelector from './NavigationAppSelector';
import RatingModal from './RatingModal';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';

export default function Community({ auth }) {
    const { userSettings } = useContext(UserSettingsContext);
    const [publicRoads, setPublicRoads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchLocation, setSearchLocation] = useState('');
    const [searchRadius, setSearchRadius] = useState(50); // Default 50km radius
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedRoadForReview, setSelectedRoadForReview] = useState(null);
    const [localRating, setLocalRating] = useState(0);
    const [localComment, setLocalComment] = useState('');

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

    const handleViewDetails = async (road) => {
        try {
            const response = await axios.get(`/api/saved-roads/${road.id}`);
            setSelectedRoadForReview(response.data);
            setRatingModalOpen(true);

            // If user is logged in and has already reviewed, pre-fill the form
            if (auth.user) {
                const existingReview = response.data.reviews?.find(review => review.user?.id === auth.user.id);
                if (existingReview) {
                    setLocalRating(existingReview.rating);
                    setLocalComment(existingReview.comment || '');
                } else {
                    setLocalRating(0);
                    setLocalComment('');
                }
            }
        } catch (error) {
            console.error('Error fetching road details:', error);
            alert('Failed to load road details');
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
            await axios.post(`/api/saved-roads/${selectedRoadForReview.id}/review`, {
                rating,
                comment
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            handleCloseRatingModal();
            fetchPublicRoads(searchLocation); // Refresh the list
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review');
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

    // Add handleViewOnMap function to display roads on the map
    const handleViewOnMap = (road) => {
        if (!road.road_coordinates) {
            alert('No coordinates available for this road');
            return;
        }

        // Use window.dispatchEvent to communicate with the Map component
        const event = new CustomEvent('viewRoadOnMap', {
            detail: {
                road: road
            }
        });
        window.dispatchEvent(event);
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
                                    <p>Length: {userSettings?.measurement_units === 'imperial' ?
                                        ((road.length / 1000) * 0.621371).toFixed(2) + ' miles' :
                                        (road.length / 1000).toFixed(2) + ' km'}</p>
                                    <p>Corners: {road.corner_count}</p>
                                    <p>Curve Score: {road.twistiness?.toFixed(4)}</p>
                                    {road.elevation_gain && road.elevation_loss && (
                                        <p>Elevation: {userSettings?.measurement_units === 'imperial' ?
                                            Math.round(road.elevation_gain * 3.28084) + ' ft ↑ ' + Math.round(road.elevation_loss * 3.28084) + ' ft ↓' :
                                            Math.round(road.elevation_gain) + ' m ↑ ' + Math.round(road.elevation_loss) + ' m ↓'}</p>
                                    )}
                                    <p>Average Rating: {road.average_rating ? road.average_rating.toFixed(1) : 'No ratings'} ⭐</p>
                                </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleViewOnMap(road)}
                                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        View on Map
                                    </button>
                                    <button
                                        onClick={(e) => handleNavigateClick(e, road)}
                                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        Navigate
                                    </button>
                                    <button
                                        onClick={() => handleViewDetails(road)}
                                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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