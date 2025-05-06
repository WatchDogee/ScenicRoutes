import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaRoad, FaUsers, FaUserFriends, FaStar, FaComment } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import RoadCard from './RoadCard';
import ErrorBoundary from './ErrorBoundary';
import Portal from './Portal';

export default function SelfProfileModal({ isOpen, onClose, auth }) {
    const [user, setUser] = useState(auth?.user || null);
    const [userRoads, setUserRoads] = useState([]);
    const [userReviews, setUserReviews] = useState([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [collections, setCollections] = useState([]);
    const [activeTab, setActiveTab] = useState('roads');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && auth?.user) {
            fetchUserData();
        }
    }, [isOpen, auth?.user]);

    const fetchUserData = async () => {
        try {
            setLoading(true);

            // Fetch user's roads
            const roadsResponse = await axios.get('/api/saved-roads', {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setUserRoads(roadsResponse.data || []);

            // Fetch user's reviews
            try {
                const reviewsResponse = await axios.get('/api/user/reviews', {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                setUserReviews(reviewsResponse.data || []);
            } catch (reviewsError) {
                console.error('Error fetching reviews:', reviewsError);
                setUserReviews([]);
            }

            // Fetch collections
            try {
                const collectionsResponse = await axios.get('/api/collections', {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                setCollections(collectionsResponse.data || []);
            } catch (collectionsError) {
                console.error('Error fetching collections:', collectionsError);
                setCollections([]);
            }

            // Fetch follow counts
            try {
                const followResponse = await axios.get(`/api/users/${auth.user.id}/follow-status`, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                setFollowersCount(followResponse.data.followers_count || 0);
                setFollowingCount(followResponse.data.following_count || 0);
            } catch (followError) {
                console.log('Could not fetch follow status');
                setFollowersCount(0);
                setFollowingCount(0);
            }

            setError(null);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleViewRoad = (road) => {
        // Dispatch event to view road on map
        const event = new CustomEvent('viewRoadOnMap', {
            detail: { road }
        });
        window.dispatchEvent(event);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Portal rootId="self-profile-modal-root">
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[20000] p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    {/* Profile Header */}
                    <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white hover:text-gray-200"
                        >
                            <FaTimes className="h-6 w-6" />
                        </button>
                        
                        <div className="flex flex-col sm:flex-row items-center sm:items-start">
                            <div className="mb-4 sm:mb-0 sm:mr-6">
                                <ProfilePicture user={user} size="xl" className="border-4 border-white" />
                            </div>
                            <div className="text-center sm:text-left flex-1">
                                <h1 className="text-2xl font-bold">{user?.name}</h1>
                                <p className="text-blue-100">@{user?.username || user?.name?.toLowerCase().replace(/\s+/g, '')}</p>
                                
                                <div className="flex justify-center sm:justify-start mt-4 space-x-6">
                                    <div className="text-center">
                                        <div className="text-xl font-bold">{userRoads.length}</div>
                                        <div className="text-sm text-blue-100">Roads</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold">{collections.length}</div>
                                        <div className="text-sm text-blue-100">Collections</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold">{userReviews.length}</div>
                                        <div className="text-sm text-blue-100">Reviews</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold">{followersCount}</div>
                                        <div className="text-sm text-blue-100">Followers</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold">{followingCount}</div>
                                        <div className="text-sm text-blue-100">Following</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 sm:mt-0">
                                <a
                                    href="/settings"
                                    className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-md shadow-sm hover:bg-blue-50"
                                >
                                    Edit Profile
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b">
                        <nav className="flex -mb-px">
                            <button
                                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                    activeTab === 'roads'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('roads')}
                            >
                                <FaRoad className="inline mr-2" /> My Roads
                            </button>
                            <button
                                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                    activeTab === 'collections'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('collections')}
                            >
                                <FaRoad className="inline mr-2" /> Collections
                            </button>
                            <button
                                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                    activeTab === 'reviews'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('reviews')}
                            >
                                <FaStar className="inline mr-2" /> Reviews
                            </button>
                            <button
                                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                    activeTab === 'following'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('following')}
                            >
                                <FaUserFriends className="inline mr-2" /> Following
                            </button>
                            <button
                                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                    activeTab === 'followers'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('followers')}
                            >
                                <FaUsers className="inline mr-2" /> Followers
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                <p className="mt-2 text-gray-500">Loading...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-500">
                                {error}
                                <button
                                    onClick={fetchUserData}
                                    className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'roads' && (
                                    <div className="space-y-4">
                                        {userRoads.length === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded border">
                                                <FaRoad className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You haven't saved any roads yet</p>
                                            </div>
                                        ) : (
                                            userRoads.map(road => (
                                                <ErrorBoundary key={road.id}>
                                                    <RoadCard
                                                        road={road}
                                                        showUser={false}
                                                        onViewMap={() => handleViewRoad(road)}
                                                    />
                                                </ErrorBoundary>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeTab === 'collections' && (
                                    <div className="space-y-4">
                                        {collections.length === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded border">
                                                <FaRoad className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You haven't created any collections yet</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {collections.map(collection => (
                                                    <div key={collection.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                                        <h3 className="font-semibold">{collection.name}</h3>
                                                        {collection.description && (
                                                            <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
                                                        )}
                                                        <p className="text-sm text-gray-500 mt-2">
                                                            {collection.roads?.length || 0} roads • 
                                                            {collection.is_public ? ' Public' : ' Private'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'reviews' && (
                                    <div className="space-y-4">
                                        {userReviews.length === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded border">
                                                <FaComment className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You haven't written any reviews yet</p>
                                            </div>
                                        ) : (
                                            userReviews.map(review => (
                                                <div key={review.id} className="border rounded-lg p-4">
                                                    <div className="flex justify-between">
                                                        <h3 className="font-semibold">{review.road?.road_name || 'Unnamed Road'}</h3>
                                                        <div className="flex items-center">
                                                            {[...Array(5)].map((_, i) => (
                                                                <FaStar 
                                                                    key={i} 
                                                                    className={i < review.rating ? "text-yellow-400" : "text-gray-300"} 
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {review.comment && (
                                                        <p className="text-gray-600 mt-2">{review.comment}</p>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        {new Date(review.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Placeholder for following/followers tabs */}
                                {(activeTab === 'following' || activeTab === 'followers') && (
                                    <div className="text-center py-8 bg-gray-50 rounded border">
                                        <FaUsers className="mx-auto text-4xl text-gray-400 mb-2" />
                                        <p className="text-gray-600">
                                            {activeTab === 'following' 
                                                ? 'Following list will be implemented soon' 
                                                : 'Followers list will be implemented soon'}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    );
}
