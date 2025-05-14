import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaStar, FaComment, FaEye, FaRoad, FaUsers, FaUserFriends, FaFolder, FaGlobe, FaAward } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
export default function Leaderboard({ onViewRoad, onViewUser, onViewRoadDetails }) {
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('top-rated');
    const [categoryType, setCategoryType] = useState('roads');
    
    const [topRatedCollections, setTopRatedCollections] = useState([]);
    const [loadingTopRatedCollections, setLoadingTopRatedCollections] = useState(true);
    const [errorTopRatedCollections, setErrorTopRatedCollections] = useState(null);
    
    const [popularRoadsByCountry, setPopularRoadsByCountry] = useState([]);
    const [loadingCountryRoads, setLoadingCountryRoads] = useState(true);
    const [errorCountryRoads, setErrorCountryRoads] = useState(null);
    useEffect(() => {
        fetchLeaderboardData();
        fetchTopRatedCollections();
    }, []);
    const fetchTopRatedCollections = async () => {
        try {
            setLoadingTopRatedCollections(true);
            const response = await axios.get('/api/leaderboard/top-rated-collections');
            setTopRatedCollections(response.data);
            setErrorTopRatedCollections(null);
        } catch (error) {
            setErrorTopRatedCollections('Failed to load top rated collections');
        } finally {
            setLoadingTopRatedCollections(false);
        }
    };
    
    useEffect(() => {
        const fetchPopularRoadsByCountry = async () => {
            try {
                setLoadingCountryRoads(true);
                const response = await axios.get('/api/leaderboard/popular-roads-by-country');
                setPopularRoadsByCountry(response.data);
                setErrorCountryRoads(null);
            } catch (error) {
                setErrorCountryRoads('Failed to load popular roads by country');
            } finally {
                setLoadingCountryRoads(false);
            }
        };
        if (activeTab === 'popular-roads-by-country') {
            fetchPopularRoadsByCountry();
        }
    }, [activeTab]);
    const fetchLeaderboardData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/leaderboard');
            setLeaderboardData(response.data);
            setError(null);
        } catch (error) {
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
                                if (onViewRoad) onViewRoad(road);
                            } catch (error) {
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
                                <div className="flex space-x-2 mt-1">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            try {
                                                
                                                const event = new CustomEvent('navigateToRoad', {
                                                    detail: { road }
                                                });
                                                window.dispatchEvent(event);
                                            } catch (error) {
                                            }
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Navigate
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            try {
                                                if (onViewRoadDetails) {
                                                    
                                                    onViewRoadDetails(road.id, e);
                                                }
                                            } catch (error) {
                                            }
                                        }}
                                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        View Details
                                    </button>
                                </div>
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
                                if (onViewRoad) onViewRoad(road);
                            } catch (error) {
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
                                <div className="flex space-x-2 mt-1">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            try {
                                                
                                                const event = new CustomEvent('navigateToRoad', {
                                                    detail: { road }
                                                });
                                                window.dispatchEvent(event);
                                            } catch (error) {
                                            }
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Navigate
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            try {
                                                if (onViewRoadDetails) {
                                                    
                                                    onViewRoadDetails(road.id, e);
                                                }
                                            } catch (error) {
                                            }
                                        }}
                                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        View Details
                                    </button>
                                </div>
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
                                if (onViewRoad) onViewRoad(road);
                            } catch (error) {
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
                                <div className="flex space-x-2 mt-1">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            try {
                                                
                                                const event = new CustomEvent('navigateToRoad', {
                                                    detail: { road }
                                                });
                                                window.dispatchEvent(event);
                                            } catch (error) {
                                            }
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Navigate
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            try {
                                                if (onViewRoadDetails) {
                                                    
                                                    
                                                    onViewRoadDetails(road.id, e);
                                                }
                                            } catch (error) {
                                            }
                                        }}
                                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        View Details
                                    </button>
                                </div>
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
    const renderFeaturedCollections = () => {
        if (!leaderboardData?.featured_collections?.length) {
            return <p className="text-center text-gray-500 py-4">No popular collections found</p>;
        }
        return (
            <div className="space-y-3">
                {leaderboardData.featured_collections.map((collection, index) => (
                    <div
                        key={collection.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => {
                            try {
                                
                                const event = new CustomEvent('viewCollection', {
                                    detail: { collection }
                                });
                                window.dispatchEvent(event);
                            } catch (error) {
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-10 h-10 flex items-center justify-center bg-amber-100 text-amber-800 rounded-full font-bold mr-3">
                                    <FaFolder />
                                </div>
                                <div>
                                    <div className="font-medium text-lg">{collection.name}</div>
                                    {collection.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{collection.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center bg-amber-50 px-3 py-1 rounded-full">
                                    <FaRoad className="text-amber-500" />
                                    <span className="ml-1 text-sm font-medium">{collection.roads?.length || 0} roads</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            {collection.tags && collection.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {collection.tags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className={`px-2 py-0.5 rounded-full text-xs ${
                                                tag.type ? `tag-${tag.type}` : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                    {collection.tags.length > 3 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                                            +{collection.tags.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                            {collection.user && (
                                <div
                                    className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewUser && onViewUser(collection.user);
                                    }}
                                >
                                    <ProfilePicture user={collection.user} size="xs" />
                                    <span className="ml-2 text-sm text-blue-600 font-medium">
                                        {collection.user.name || 'Unknown User'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    const renderTopRatedCollections = () => {
        if (loadingTopRatedCollections) {
            return <p className="text-center text-gray-500 py-4">Loading top rated collections...</p>;
        }
        if (errorTopRatedCollections) {
            return <p className="text-center text-red-500 py-4">{errorTopRatedCollections}</p>;
        }
        if (!topRatedCollections?.length) {
            return <p className="text-center text-gray-500 py-4">No top rated collections found</p>;
        }
        return (
            <div className="space-y-3">
                {topRatedCollections.map((collection, index) => (
                    <div
                        key={collection.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => {
                            try {
                                
                                const event = new CustomEvent('viewCollection', {
                                    detail: { collection }
                                });
                                window.dispatchEvent(event);
                            } catch (error) {
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-10 h-10 flex items-center justify-center bg-yellow-100 text-yellow-800 rounded-full font-bold mr-3">
                                    <FaStar />
                                </div>
                                <div>
                                    <div className="font-medium text-lg">{collection.name}</div>
                                    {collection.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{collection.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                                <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
                                    <FaStar className="text-yellow-500" />
                                    <span className="ml-1 text-sm font-medium">
                                        {typeof collection.average_rating === 'number'
                                            ? collection.average_rating.toFixed(1)
                                            : '0.0'} ({collection.reviews_count || 0} reviews)
                                    </span>
                                </div>
                                <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                                    <FaRoad className="text-blue-500" />
                                    <span className="ml-1 text-sm font-medium">{collection.roads_count || collection.roads?.length || 0} roads</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            {collection.tags && collection.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {collection.tags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className={`px-2 py-0.5 rounded-full text-xs ${
                                                tag.type ? `tag-${tag.type}` : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                    {collection.tags.length > 3 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                                            +{collection.tags.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                            {collection.user && (
                                <div
                                    className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewUser && onViewUser(collection.user);
                                    }}
                                >
                                    <ProfilePicture user={collection.user} size="xs" />
                                    <span className="ml-2 text-sm text-blue-600 font-medium">
                                        {collection.user.name || 'Unknown User'}
                                    </span>
                                </div>
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
    const renderPopularCollections = () => {
        if (!leaderboardData?.popular_collections?.length) {
            return <p className="text-center text-gray-500 py-4">No popular collections found</p>;
        }
        return (
            <div className="space-y-3">
                {leaderboardData.popular_collections.map((collection, index) => (
                    <div
                        key={collection.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => {
                            try {
                                
                                const event = new CustomEvent('viewCollection', {
                                    detail: { collection }
                                });
                                window.dispatchEvent(event);
                            } catch (error) {
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold mr-3">
                                    #{index + 1}
                                </div>
                                <div>
                                    <div className="font-medium text-lg">{collection.name}</div>
                                    {collection.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{collection.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                                <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                                    <FaRoad className="text-blue-500" />
                                    <span className="ml-1 text-sm font-medium">{collection.roads_count || collection.roads?.length || 0} roads</span>
                                </div>
                                <div className="flex items-center bg-green-50 px-3 py-1 rounded-full">
                                    <FaUsers className="text-green-500" />
                                    <span className="ml-1 text-sm font-medium">{collection.saved_count || 0} saves</span>
                                </div>
                                {collection.likes_count > 0 && (
                                    <div className="flex items-center bg-red-50 px-3 py-1 rounded-full">
                                        <FaStar className="text-red-500" />
                                        <span className="ml-1 text-sm font-medium">{collection.likes_count} likes</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            {collection.tags && collection.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {collection.tags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className={`px-2 py-0.5 rounded-full text-xs ${
                                                tag.type ? `tag-${tag.type}` : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                    {collection.tags.length > 3 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                                            +{collection.tags.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                            {collection.user && (
                                <div
                                    className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewUser && onViewUser(collection.user);
                                    }}
                                >
                                    <ProfilePicture user={collection.user} size="xs" />
                                    <span className="ml-2 text-sm text-blue-600 font-medium">
                                        {collection.user.name || 'Unknown User'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    const renderDiverseCollections = () => {
        if (!leaderboardData?.diverse_collections?.length) {
            return <p className="text-center text-gray-500 py-4">No diverse collections found</p>;
        }
        return (
            <div className="space-y-3">
                {leaderboardData.diverse_collections.map((collection, index) => (
                    <div
                        key={collection.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => {
                            try {
                                
                                const event = new CustomEvent('viewCollection', {
                                    detail: { collection }
                                });
                                window.dispatchEvent(event);
                            } catch (error) {
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                                <div className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-800 rounded-full font-bold mr-3">
                                    #{index + 1}
                                </div>
                                <div>
                                    <div className="font-medium text-lg">{collection.name}</div>
                                    {collection.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{collection.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center bg-green-50 px-3 py-1 rounded-full">
                                    <FaGlobe className="text-green-500" />
                                    <span className="ml-1 text-sm font-medium">{collection.countries_count || 0} countries</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            {collection.tags && collection.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {collection.tags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className={`px-2 py-0.5 rounded-full text-xs ${
                                                tag.type ? `tag-${tag.type}` : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                    {collection.tags.length > 3 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                                            +{collection.tags.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                            {collection.user && (
                                <div
                                    className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewUser && onViewUser(collection.user);
                                    }}
                                >
                                    <ProfilePicture user={collection.user} size="xs" />
                                    <span className="ml-2 text-sm text-blue-600 font-medium">
                                        {collection.user.name || 'Unknown User'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    const renderTopCurators = () => {
        if (!leaderboardData?.top_curators?.length) {
            return <p className="text-center text-gray-500 py-4">No curators found</p>;
        }
        return (
            <div className="space-y-3">
                {leaderboardData.top_curators.map((user, index) => (
                    <div
                        key={user.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm"
                        onClick={() => onViewUser && onViewUser(user)}
                    >
                        <div className="flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center bg-amber-100 text-amber-800 rounded-full font-bold mr-3">
                                #{index + 1}
                            </div>
                            <ProfilePicture user={user} size="md" className="mr-3" />
                            <div>
                                <div className="font-medium text-lg">{user.name}</div>
                                <div className="text-sm text-gray-600">
                                    @{user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                                </div>
                            </div>
                            <div className="ml-auto flex items-center bg-amber-50 px-3 py-1 rounded-full">
                                <FaAward className="text-amber-500" />
                                <span className="ml-1 text-sm font-medium">{user.collections_count || 0} featured collections</span>
                            </div>
                        </div>
                        <div className="mt-2 pl-16">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                {user.public_collections_count > 0 && (
                                    <div className="flex items-center">
                                        <FaFolder className="text-gray-400 mr-1" />
                                        <span>{user.public_collections_count} public collections</span>
                                    </div>
                                )}
                                {user.followers_count > 0 && (
                                    <div className="flex items-center">
                                        <FaUsers className="text-gray-400 mr-1" />
                                        <span>{user.followers_count} followers</span>
                                    </div>
                                )}
                                {user.saved_roads_count > 0 && (
                                    <div className="flex items-center">
                                        <FaRoad className="text-gray-400 mr-1" />
                                        <span>{user.saved_roads_count} roads</span>
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
        if (loading && activeTab !== 'popular-roads-by-country') {
            return <div className="text-center py-8">Loading leaderboard data...</div>;
        }
        if (error && activeTab !== 'popular-roads-by-country') {
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
                if (categoryType === 'roads') {
                    return renderTopRatedRoads();
                } else if (categoryType === 'collections') {
                    return renderTopRatedCollections();
                }
                return renderTopRatedRoads();
            case 'most-reviewed':
                return renderMostReviewedRoads();
            case 'most-popular':
                return renderMostPopularRoads();
            case 'popular-roads-by-country':
                return renderPopularRoadsByCountry();
            case 'featured-collections':
                return renderFeaturedCollections();
            case 'most-active':
                return renderMostActiveUsers();
            case 'most-followed':
                return renderMostFollowedUsers();
            default:
                return renderTopRatedRoads();
        }
    };
    
    const renderPopularRoadsByCountry = () => {
        
        if (loadingCountryRoads) {
            return <div className="text-center py-8">Loading popular roads by country...</div>;
        }
        if (errorCountryRoads) {
            return (
                <div className="text-center py-8 text-red-500">
                    {errorCountryRoads}
                    <button
                        onClick={() => {
                            
                            setActiveTab('temp');
                            setTimeout(() => setActiveTab('popular-roads-by-country'), 10);
                        }}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        if (!popularRoadsByCountry || popularRoadsByCountry.length === 0) {
            return <p className="text-center text-gray-500 py-4">No popular roads by country found</p>;
        }
        return (
            <div className="space-y-6">
                {popularRoadsByCountry.map((countryData, index) => (
                    <div key={countryData.country || index} className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <FaGlobe className="mr-2 text-blue-500" />
                            {countryData.country || 'Unknown Country'}
                        </h3>
                        <div className="space-y-3">
                            {countryData.roads.map(road => (
                                <div
                                    key={road.id}
                                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                    onClick={() => onViewRoad && onViewRoad(road)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{road.road_name || 'Unnamed Road'}</div>
                                            <div className="text-sm text-gray-600">
                                                {road.region && <span className="mr-2">{road.region}</span>}
                                                <span>{(road.length / 1000).toFixed(1)} km</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <StarRating rating={road.average_rating} size="sm" />
                                            <span className="ml-1 text-sm">({road.reviews_count || 0})</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <ProfilePicture user={road.user} size="xs" className="mr-1" />
                                            <span>{road.user?.name || 'Unknown User'}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewRoadDetails && onViewRoadDetails(road.id, e);
                                            }}
                                            className="text-xs text-blue-500 hover:text-blue-700"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    
    const categories = {
        roads: [
            { id: 'top-rated', icon: <FaStar className="inline mr-1" />, label: 'Top Rated' },
            { id: 'most-reviewed', icon: <FaComment className="inline mr-1" />, label: 'Most Reviewed' },
            { id: 'most-popular', icon: <FaEye className="inline mr-1" />, label: 'Most Popular' },
            { id: 'popular-roads-by-country', icon: <FaGlobe className="inline mr-1" />, label: 'By Country' }
        ],
        collections: [
            { id: 'top-rated', icon: <FaStar className="inline mr-1" />, label: 'Top Rated' },
            { id: 'featured-collections', icon: <FaFolder className="inline mr-1" />, label: 'Featured Collections' }
        ],
        users: [
            { id: 'most-active', icon: <FaRoad className="inline mr-1" />, label: 'Most Active' },
            { id: 'most-followed', icon: <FaUsers className="inline mr-1" />, label: 'Most Followed' }
        ]
    };
    
    useEffect(() => {
        if (categoryType === 'roads') setActiveTab('top-rated');
        else if (categoryType === 'collections') setActiveTab('featured-collections');
        else if (categoryType === 'users') setActiveTab('most-active'); 
    }, [categoryType]);
    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
            {$1}
            <div className="flex justify-start mb-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                            categoryType === 'roads'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                        onClick={() => setCategoryType('roads')}
                    >
                        <FaRoad className="inline mr-1" /> Roads
                    </button>
                    <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium ${
                            categoryType === 'collections'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border-t border-b border-gray-300 hover:bg-gray-100'
                        }`}
                        onClick={() => setCategoryType('collections')}
                    >
                        <FaFolder className="inline mr-1" /> Collections
                    </button>
                    <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                            categoryType === 'users'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                        onClick={() => setCategoryType('users')}
                    >
                        <FaUsers className="inline mr-1" /> Users
                    </button>
                </div>
            </div>
            {$1}
            <div className="flex overflow-x-auto mb-4 pb-1 justify-start">
                {categories[categoryType].map(category => (
                    <button
                        key={category.id}
                        className={`px-3 py-1 whitespace-nowrap ${
                            activeTab === category.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 hover:bg-gray-300'
                        } rounded-full mr-2`}
                        onClick={() => setActiveTab(category.id)}
                    >
                        {category.icon} {category.label}
                    </button>
                ))}
            </div>
            {renderContent()}
        </div>
    );
}
