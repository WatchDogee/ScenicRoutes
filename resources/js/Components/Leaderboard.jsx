import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaStar, FaComment, FaEye, FaRoad, FaUsers } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';

export default function Leaderboard({ onViewRoad, onViewUser }) {
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('top-rated');

    useEffect(() => {
        fetchLeaderboardData();
    }, []);

    const fetchLeaderboardData = async () => {
        try {
            setLoading(true);
            try {
                const response = await axios.get('/api/leaderboard');
                setLeaderboardData(response.data);
                setError(null);
            } catch (apiError) {
                console.error('Error fetching leaderboard data:', apiError);
                // For development purposes, use mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using mock leaderboard data for development');
                    setLeaderboardData({
                        top_rated_roads: [
                            { id: 1, road_name: 'Alpine Pass', length: 18000, average_rating: 4.8, reviews_count: 12 },
                            { id: 2, road_name: 'Coastal Highway', length: 25000, average_rating: 4.5, reviews_count: 8 }
                        ],
                        most_reviewed_roads: [
                            { id: 1, road_name: 'Alpine Pass', length: 18000, reviews_count: 12 },
                            { id: 3, road_name: 'Mountain Road', length: 15000, reviews_count: 10 }
                        ],
                        most_popular_roads: [
                            { id: 1, road_name: 'Alpine Pass', length: 18000, reviews_count: 120 },
                            { id: 4, road_name: 'Valley Drive', length: 22000, reviews_count: 95 }
                        ],
                        most_active_users: [
                            { id: 1, name: 'John Doe', username: 'johndoe', saved_roads_count: 25 },
                            { id: 2, name: 'Jane Smith', username: 'janesmith', saved_roads_count: 18 }
                        ],
                        most_followed_users: [
                            { id: 1, name: 'John Doe', username: 'johndoe', followers_count: 42 },
                            { id: 2, name: 'Jane Smith', username: 'janesmith', followers_count: 36 }
                        ]
                    });
                } else {
                    setError('Failed to load leaderboard data. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            console.error('Error in leaderboard handling:', error);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const formatLength = (meters) => {
        if (!meters) return 'N/A';
        return (meters / 1000).toFixed(2) + ' km';
    };

    const renderTopRatedRoads = () => {
        if (!leaderboardData?.top_rated_roads?.length) {
            return <p className="text-center text-gray-500 py-4">No rated roads found</p>;
        }

        return (
            <div className="space-y-2">
                {leaderboardData.top_rated_roads.map((road, index) => (
                    <div
                        key={road.id}
                        className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => onViewRoad && onViewRoad(road)}
                    >
                        <div className="w-8 text-center font-bold text-gray-500">#{index + 1}</div>
                        <div className="flex-1 ml-2">
                            <div className="font-medium">{road.road_name}</div>
                            <div className="text-sm text-gray-600">
                                Length: {formatLength(road.length)}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <StarRating value={road.average_rating} readOnly size="sm" />
                            <span className="ml-1 text-sm text-gray-600">({road.reviews_count || 0})</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderMostReviewedRoads = () => {
        if (!leaderboardData?.most_reviewed_roads?.length) {
            return <p className="text-center text-gray-500 py-4">No reviewed roads found</p>;
        }

        return (
            <div className="space-y-2">
                {leaderboardData.most_reviewed_roads.map((road, index) => (
                    <div
                        key={road.id}
                        className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => onViewRoad && onViewRoad(road)}
                    >
                        <div className="w-8 text-center font-bold text-gray-500">#{index + 1}</div>
                        <div className="flex-1 ml-2">
                            <div className="font-medium">{road.road_name}</div>
                            <div className="text-sm text-gray-600">
                                Length: {formatLength(road.length)}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <FaComment className="text-blue-500" />
                            <span className="ml-1 text-sm">{road.reviews_count || 0} reviews</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderMostPopularRoads = () => {
        if (!leaderboardData?.most_popular_roads?.length) {
            return <p className="text-center text-gray-500 py-4">No popular roads found</p>;
        }

        return (
            <div className="space-y-2">
                {leaderboardData.most_popular_roads.map((road, index) => (
                    <div
                        key={road.id}
                        className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => onViewRoad && onViewRoad(road)}
                    >
                        <div className="w-8 text-center font-bold text-gray-500">#{index + 1}</div>
                        <div className="flex-1 ml-2">
                            <div className="font-medium">{road.road_name}</div>
                            <div className="text-sm text-gray-600">
                                Length: {formatLength(road.length)}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <FaEye className="text-green-500" />
                            <span className="ml-1 text-sm">{road.reviews_count || 0} views</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderMostActiveUsers = () => {
        if (!leaderboardData?.most_active_users?.length) {
            return <p className="text-center text-gray-500 py-4">No active users found</p>;
        }

        return (
            <div className="space-y-2">
                {leaderboardData.most_active_users.map((user, index) => (
                    <div
                        key={user.id}
                        className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => onViewUser && onViewUser(user)}
                    >
                        <div className="w-8 text-center font-bold text-gray-500">#{index + 1}</div>
                        <ProfilePicture user={user} size="sm" className="ml-2" />
                        <div className="flex-1 ml-2">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-600">
                                @{user.username || 'user'}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <FaRoad className="text-blue-500" />
                            <span className="ml-1 text-sm">{user.saved_roads_count || 0} roads</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderMostFollowedUsers = () => {
        if (!leaderboardData?.most_followed_users?.length) {
            return <p className="text-center text-gray-500 py-4">No followed users found</p>;
        }

        return (
            <div className="space-y-2">
                {leaderboardData.most_followed_users.map((user, index) => (
                    <div
                        key={user.id}
                        className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => onViewUser && onViewUser(user)}
                    >
                        <div className="w-8 text-center font-bold text-gray-500">#{index + 1}</div>
                        <ProfilePicture user={user} size="sm" className="ml-2" />
                        <div className="flex-1 ml-2">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-600">
                                @{user.username || 'user'}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <FaUsers className="text-purple-500" />
                            <span className="ml-1 text-sm">{user.followers_count || 0} followers</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-8">Loading leaderboard data...</div>;
        }

        if (error) {
            return (
                <div className="text-center py-8 text-red-500">
                    {error}
                    <button
                        onClick={fetchLeaderboardData}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        switch (activeTab) {
            case 'top-rated':
                return renderTopRatedRoads();
            case 'most-reviewed':
                return renderMostReviewedRoads();
            case 'most-popular':
                return renderMostPopularRoads();
            case 'most-active':
                return renderMostActiveUsers();
            case 'most-followed':
                return renderMostFollowedUsers();
            default:
                return renderTopRatedRoads();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>

            <div className="flex overflow-x-auto mb-4 pb-1">
                <button
                    className={`px-3 py-1 whitespace-nowrap ${activeTab === 'top-rated' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-full mr-2`}
                    onClick={() => setActiveTab('top-rated')}
                >
                    <FaStar className="inline mr-1" /> Top Rated
                </button>
                <button
                    className={`px-3 py-1 whitespace-nowrap ${activeTab === 'most-reviewed' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-full mr-2`}
                    onClick={() => setActiveTab('most-reviewed')}
                >
                    <FaComment className="inline mr-1" /> Most Reviewed
                </button>
                <button
                    className={`px-3 py-1 whitespace-nowrap ${activeTab === 'most-popular' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-full mr-2`}
                    onClick={() => setActiveTab('most-popular')}
                >
                    <FaEye className="inline mr-1" /> Most Popular
                </button>
                <button
                    className={`px-3 py-1 whitespace-nowrap ${activeTab === 'most-active' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-full mr-2`}
                    onClick={() => setActiveTab('most-active')}
                >
                    <FaRoad className="inline mr-1" /> Most Active Users
                </button>
                <button
                    className={`px-3 py-1 whitespace-nowrap ${activeTab === 'most-followed' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-full mr-2`}
                    onClick={() => setActiveTab('most-followed')}
                >
                    <FaUsers className="inline mr-1" /> Most Followed
                </button>
            </div>

            {renderContent()}
        </div>
    );
}
