import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaStar, FaComment, FaEye, FaRoad, FaUsers, FaUserFriends, FaFolder } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';

export default function Leaderboard({ onViewRoad, onViewUser, onViewRoadDetails }) {
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
            const response = await axios.get('/api/leaderboard');
            setLeaderboardData(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
            setError('Failed to load leaderboard data. Please try again later.');
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
            <div className="space-y-3">
                {leaderboardData.top_rated_roads.map((road, index) => (
                    <div
                        key={road.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => {
                            try {
                                console.log("Viewing road:", road);
                                if (onViewRoad) onViewRoad(road);
                            } catch (error) {
                                console.error("Error viewing road:", error);
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold">
                                    #{index + 1}
                                </div>
                                <div className="ml-3">
                                    <div className="font-medium text-lg">{road.road_name}</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center">
                                    <StarRating value={road.average_rating} readOnly size="sm" />
                                    <span className="ml-1 text-sm text-gray-600">({road.reviews_count || 0})</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        try {
                                            console.log("View road details:", road);
                                            if (onViewRoadDetails) onViewRoadDetails(road.id);
                                        } catch (error) {
                                            console.error("Error viewing road details:", error);
                                        }
                                    }}
                                    className="mt-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                <p>Length: {formatLength(road.length)}</p>
                                {road.corner_count && <p>Corners: {road.corner_count}</p>}
                                {road.twistiness && <p>Curve Rating: {(road.twistiness * 1000).toFixed(2)}</p>}
                            </div>

                            {road.user && (
                                <div
                                    className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewUser && onViewUser(road.user);
                                    }}
                                >
                                    <ProfilePicture user={road.user} size="xs" />
                                    <span className="ml-2 text-sm text-blue-600 font-medium">
                                        {road.user.name || 'Unknown User'}
                                    </span>
                                </div>
                            )}
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
            <div className="space-y-3">
                {leaderboardData.most_reviewed_roads.map((road, index) => (
                    <div
                        key={road.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => {
                            try {
                                console.log("Viewing road:", road);
                                if (onViewRoad) onViewRoad(road);
                            } catch (error) {
                                console.error("Error viewing road:", error);
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold">
                                    #{index + 1}
                                </div>
                                <div className="ml-3">
                                    <div className="font-medium text-lg">{road.road_name}</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                                    <FaComment className="text-blue-500" />
                                    <span className="ml-1 text-sm font-medium">{road.reviews_count || 0} reviews</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        try {
                                            console.log("View road details:", road);
                                            if (onViewRoadDetails) onViewRoadDetails(road.id);
                                        } catch (error) {
                                            console.error("Error viewing road details:", error);
                                        }
                                    }}
                                    className="mt-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                <p>Length: {formatLength(road.length)}</p>
                                {road.average_rating && (
                                    <div className="flex items-center mt-1">
                                        <span className="mr-1">Rating:</span>
                                        <StarRating value={road.average_rating} readOnly size="xs" />
                                        <span className="ml-1">({typeof road.average_rating === 'number' ? road.average_rating.toFixed(1) : road.average_rating})</span>
                                    </div>
                                )}
                            </div>

                            {road.user && (
                                <div
                                    className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewUser && onViewUser(road.user);
                                    }}
                                >
                                    <ProfilePicture user={road.user} size="xs" />
                                    <span className="ml-2 text-sm text-blue-600 font-medium">
                                        {road.user.name || 'Unknown User'}
                                    </span>
                                </div>
                            )}
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
            <div className="space-y-3">
                {leaderboardData.most_popular_roads.map((road, index) => (
                    <div
                        key={road.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => {
                            try {
                                console.log("Viewing road:", road);
                                if (onViewRoad) onViewRoad(road);
                            } catch (error) {
                                console.error("Error viewing road:", error);
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-800 rounded-full font-bold">
                                    #{index + 1}
                                </div>
                                <div className="ml-3">
                                    <div className="font-medium text-lg">{road.road_name}</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center bg-green-50 px-3 py-1 rounded-full">
                                    <FaEye className="text-green-500" />
                                    <span className="ml-1 text-sm font-medium">{road.view_count || road.reviews_count || 0} views</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        try {
                                            console.log("View road details:", road);
                                            if (onViewRoadDetails) onViewRoadDetails(road.id);
                                        } catch (error) {
                                            console.error("Error viewing road details:", error);
                                        }
                                    }}
                                    className="mt-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                <p>Length: {formatLength(road.length)}</p>
                                {road.average_rating && (
                                    <div className="flex items-center mt-1">
                                        <span className="mr-1">Rating:</span>
                                        <StarRating value={typeof road.average_rating === 'number' ? road.average_rating : parseFloat(road.average_rating) || 0} readOnly size="xs" />
                                    </div>
                                )}
                                {road.reviews_count > 0 && <p>Reviews: {road.reviews_count}</p>}
                            </div>

                            {road.user && (
                                <div
                                    className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewUser && onViewUser(road.user);
                                    }}
                                >
                                    <ProfilePicture user={road.user} size="xs" />
                                    <span className="ml-2 text-sm text-blue-600 font-medium">
                                        {road.user.name || 'Unknown User'}
                                    </span>
                                </div>
                            )}
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
            <div className="space-y-3">
                {leaderboardData.most_active_users.map((user, index) => (
                    <div
                        key={user.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => onViewUser && onViewUser(user)}
                    >
                        <div className="flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold mr-3">
                                #{index + 1}
                            </div>
                            <ProfilePicture user={user} size="md" className="mr-3" />
                            <div>
                                <div className="font-medium text-lg">{user.name}</div>
                                <div className="text-sm text-gray-600">
                                    @{user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                                </div>
                            </div>
                            <div className="ml-auto flex items-center bg-blue-50 px-3 py-1 rounded-full">
                                <FaRoad className="text-blue-500" />
                                <span className="ml-1 text-sm font-medium">{user.saved_roads_count || 0} roads</span>
                            </div>
                        </div>

                        <div className="mt-2 pl-16">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                {user.reviews_count > 0 && (
                                    <div className="flex items-center">
                                        <FaComment className="text-gray-400 mr-1" />
                                        <span>{user.reviews_count} reviews</span>
                                    </div>
                                )}
                                {user.followers_count > 0 && (
                                    <div className="flex items-center">
                                        <FaUsers className="text-gray-400 mr-1" />
                                        <span>{user.followers_count} followers</span>
                                    </div>
                                )}
                                {user.collections_count > 0 && (
                                    <div className="flex items-center">
                                        <FaFolder className="text-gray-400 mr-1" />
                                        <span>{user.collections_count} collections</span>
                                    </div>
                                )}
                            </div>

                            {user.bio && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{user.bio}</p>
                            )}
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
            <div className="space-y-3">
                {leaderboardData.most_followed_users.map((user, index) => (
                    <div
                        key={user.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => onViewUser && onViewUser(user)}
                    >
                        <div className="flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-800 rounded-full font-bold mr-3">
                                #{index + 1}
                            </div>
                            <ProfilePicture user={user} size="md" className="mr-3" />
                            <div>
                                <div className="font-medium text-lg">{user.name}</div>
                                <div className="text-sm text-gray-600">
                                    @{user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                                </div>
                            </div>
                            <div className="ml-auto flex items-center bg-purple-50 px-3 py-1 rounded-full">
                                <FaUsers className="text-purple-500" />
                                <span className="ml-1 text-sm font-medium">{user.followers_count || 0} followers</span>
                            </div>
                        </div>

                        <div className="mt-2 pl-16">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                {user.following_count > 0 && (
                                    <div className="flex items-center">
                                        <FaUserFriends className="text-gray-400 mr-1" />
                                        <span>Following {user.following_count}</span>
                                    </div>
                                )}
                                {user.saved_roads_count > 0 && (
                                    <div className="flex items-center">
                                        <FaRoad className="text-gray-400 mr-1" />
                                        <span>{user.saved_roads_count} roads</span>
                                    </div>
                                )}
                                {user.collections_count > 0 && (
                                    <div className="flex items-center">
                                        <FaFolder className="text-gray-400 mr-1" />
                                        <span>{user.collections_count} collections</span>
                                    </div>
                                )}
                            </div>

                            {user.bio && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{user.bio}</p>
                            )}
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
