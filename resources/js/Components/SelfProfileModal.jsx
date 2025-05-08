import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTimes, FaRoad, FaUsers, FaUserFriends, FaStar, FaComment, FaImage, FaCheck, FaGlobe, FaLock, FaTag } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import RoadCard from './RoadCard';
import ErrorBoundary from './ErrorBoundary';
import Portal from './Portal';
import TagSelectorModal from './TagSelectorModal';
import CollapsibleTagSelector from './CollapsibleTagSelector';

export default function SelfProfileModal({ isOpen, onClose, auth }) {
    const [user, setUser] = useState(auth?.user || null);
    const [userRoads, setUserRoads] = useState([]);
    const [userReviews, setUserReviews] = useState([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [collections, setCollections] = useState([]);
    const [activeTab, setActiveTab] = useState('roads');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingRoad, setEditingRoad] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTagSelectorModal, setShowTagSelectorModal] = useState(false);

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

            // Fetch follow counts and lists
            try {
                const followResponse = await axios.get(`/api/users/${auth.user.id}/follow-status`, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                setFollowersCount(followResponse.data.followers_count || 0);
                setFollowingCount(followResponse.data.following_count || 0);

                // Fetch followers list
                try {
                    const followersResponse = await axios.get(`/api/users/${auth.user.id}/followers`, {
                        headers: { Authorization: `Bearer ${auth.token}` }
                    });
                    setFollowers(followersResponse.data || []);
                } catch (followersError) {
                    console.error('Error fetching followers:', followersError);
                    setFollowers([]);
                }

                // Fetch following list
                try {
                    const followingResponse = await axios.get(`/api/users/${auth.user.id}/following`, {
                        headers: { Authorization: `Bearer ${auth.token}` }
                    });
                    setFollowing(followingResponse.data || []);
                } catch (followingError) {
                    console.error('Error fetching following:', followingError);
                    console.log('Using mock following data');
                    // Mock data for development
                    setFollowing([
                        {
                            id: 101,
                            name: 'John Doe',
                            username: 'johndoe',
                            profile_picture_url: null
                        },
                        {
                            id: 102,
                            name: 'Jane Smith',
                            username: 'janesmith',
                            profile_picture_url: null
                        },
                        {
                            id: 103,
                            name: 'Alex Johnson',
                            username: 'alexj',
                            profile_picture_url: null
                        }
                    ]);
                    // Update the following count
                    setFollowingCount(3);
                }
            } catch (followError) {
                console.log('Could not fetch follow status');
                setFollowersCount(0);
                setFollowingCount(0);
                setFollowers([]);
                setFollowing([]);
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
                                <ProfilePicture user={user} size="2xl" className="border-4 border-white shadow-lg" />
                            </div>
                            <div className="text-center sm:text-left flex-1">
                                <h1 className="text-2xl font-bold">{user?.name}</h1>
                                <p className="text-blue-100">@{user?.username || user?.name?.toLowerCase().replace(/\s+/g, '')}</p>

                                <div className="flex justify-center sm:justify-start mt-4 space-x-6">
                                    <div className="text-center bg-blue-600 bg-opacity-30 px-3 py-2 rounded">
                                        <div className="text-xl font-bold">{userRoads.length}</div>
                                        <div className="text-sm text-blue-100">Roads</div>
                                    </div>
                                    <div className="text-center bg-blue-600 bg-opacity-30 px-3 py-2 rounded">
                                        <div className="text-xl font-bold">{collections.length}</div>
                                        <div className="text-sm text-blue-100">Collections</div>
                                    </div>
                                    <div className="text-center bg-blue-600 bg-opacity-30 px-3 py-2 rounded">
                                        <div className="text-xl font-bold">{userReviews.length}</div>
                                        <div className="text-sm text-blue-100">Reviews</div>
                                    </div>
                                    <div
                                        className="text-center bg-blue-600 bg-opacity-30 px-3 py-2 rounded cursor-pointer hover:bg-opacity-40"
                                        onClick={() => setActiveTab('followers')}
                                    >
                                        <div className="text-xl font-bold">{followersCount}</div>
                                        <div className="text-sm text-blue-100">Followers</div>
                                    </div>
                                    <div
                                        className="text-center bg-blue-600 bg-opacity-30 px-3 py-2 rounded cursor-pointer hover:bg-opacity-40"
                                        onClick={() => setActiveTab('following')}
                                    >
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
                                                        showPrivacyStatus={true}
                                                        onViewMap={() => handleViewRoad(road)}
                                                        onViewDetails={() => {
                                                            // Dispatch event to view road details
                                                            const event = new CustomEvent('viewRoadDetails', {
                                                                detail: { roadId: road.id }
                                                            });
                                                            window.dispatchEvent(event);
                                                            onClose(); // Close the profile modal
                                                        }}
                                                        onEdit={() => {
                                                            setEditingRoad(road);
                                                            setShowEditModal(true);
                                                        }}
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
                                                        <div className="mt-3 flex gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Use Inertia.js or a custom event to handle this without page navigation
                                                                    const event = new CustomEvent('viewCollectionDetails', {
                                                                        detail: { collection }
                                                                    });
                                                                    window.dispatchEvent(event);
                                                                    onClose(); // Close the profile modal
                                                                }}
                                                                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                                            >
                                                                View Details
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Use Inertia.js or a custom event to handle this without page navigation
                                                                    const event = new CustomEvent('editCollection', {
                                                                        detail: { collection }
                                                                    });
                                                                    window.dispatchEvent(event);
                                                                    onClose(); // Close the profile modal
                                                                }}
                                                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
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

                                {activeTab === 'following' && (
                                    <div className="space-y-4">
                                        {followingCount === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded border">
                                                <FaUserFriends className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You aren't following anyone yet</p>
                                                <button
                                                    onClick={() => setActiveTab('leaderboard')}
                                                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Discover Users to Follow
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-medium text-gray-700">People You Follow</h3>
                                                    <span className="text-sm text-gray-500">{followingCount} following</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {following.length > 0 ? (
                                                        following.map((followedUser) => (
                                                            <div key={followedUser.id} className="flex items-center p-3 border rounded-lg">
                                                                <ProfilePicture user={followedUser} size="md" />
                                                                <div className="ml-3">
                                                                    <div className="font-medium">{followedUser.name}</div>
                                                                    <div className="text-sm text-gray-500">
                                                                        @{followedUser.username || followedUser.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    className="ml-auto text-sm text-blue-500 hover:text-blue-700"
                                                                    onClick={() => {
                                                                        // Handle unfollow action
                                                                        // TODO: Implement unfollow API call
                                                                        console.log(`Unfollowing ${followedUser.name}`);
                                                                        // Implement API call here
                                                                    }}
                                                                >
                                                                    Unfollow
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-2 text-center text-gray-500 py-4">
                                                            No following data available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'followers' && (
                                    <div className="space-y-4">
                                        {followersCount === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded border">
                                                <FaUsers className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You don't have any followers yet</p>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    As you share more roads and collections, people will start following you
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-medium text-gray-700">People Following You</h3>
                                                    <span className="text-sm text-gray-500">{followersCount} followers</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {followers.length > 0 ? (
                                                        followers.map((follower) => (
                                                            <div key={follower.id} className="flex items-center p-3 border rounded-lg">
                                                                <ProfilePicture user={follower} size="md" />
                                                                <div className="ml-3">
                                                                    <div className="font-medium">{follower.name}</div>
                                                                    <div className="text-sm text-gray-500">
                                                                        @{follower.username || follower.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                                                                    </div>
                                                                </div>
                                                                {!following.some(f => f.id === follower.id) && (
                                                                    <button
                                                                        className="ml-auto text-sm text-blue-500 hover:text-blue-700"
                                                                        onClick={() => {
                                                                            // Handle follow back action
                                                                            // TODO: Implement follow API call
                                                                            console.log(`Following ${follower.name}`);
                                                                        }}
                                                                    >
                                                                        Follow Back
                                                                    </button>
                                                                )}
                                                                {following.some(f => f.id === follower.id) && (
                                                                    <span className="ml-auto text-sm text-green-500">Following</span>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-2 text-center text-gray-500 py-4">
                                                            No followers data available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Road Edit Modal */}
            {showEditModal && editingRoad && (
                <Portal rootId="road-edit-modal-root">
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[30000] p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold">Edit Road</h2>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <FaTimes className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        setLoading(true);

                                        // Create form data for file upload
                                        const formData = new FormData();
                                        formData.append('road_name', editingRoad.road_name);
                                        formData.append('description', editingRoad.description || '');
                                        formData.append('is_public', editingRoad.is_public ? '1' : '0');

                                        // Add photo if selected
                                        const fileInput = document.getElementById('road-photo');
                                        if (fileInput && fileInput.files.length > 0) {
                                            formData.append('photo', fileInput.files[0]);
                                        }

                                        // First update the basic road information
                                        console.log('Sending request to update road with ID:', editingRoad.id);
                                        const response = await axios.post(`/api/saved-roads/${editingRoad.id}`, formData, {
                                            headers: {
                                                'Content-Type': 'multipart/form-data',
                                                'Authorization': `Bearer ${auth.token}`,
                                                'X-HTTP-Method-Override': 'PUT'
                                            }
                                        });

                                        console.log('Response from server:', response.data);

                                        // Now handle tags separately using the dedicated endpoint
                                        if (editingRoad.tags && editingRoad.tags.length > 0) {
                                            // Convert tags to tag IDs array
                                            const tagIds = editingRoad.tags.map(tag => tag.id);
                                            console.log('Adding tags to road:', tagIds);

                                            // Use the dedicated endpoint for adding tags
                                            const tagsResponse = await axios.post(`/api/saved-roads/${editingRoad.id}/tags`, {
                                                tags: tagIds
                                            }, {
                                                headers: {
                                                    'Authorization': `Bearer ${auth.token}`
                                                }
                                            });

                                            console.log('Tags update response:', tagsResponse.data);
                                            console.log('Updated road with tags:', tagsResponse.data.road);

                                            // Update the road in the state with the tags response
                                            setUserRoads(userRoads.map(road =>
                                                road.id === editingRoad.id ? tagsResponse.data.road : road
                                            ));
                                        } else {
                                            console.log('No tags to add to road');
                                            // If no tags, use the original response
                                            setUserRoads(userRoads.map(road =>
                                                road.id === editingRoad.id ? response.data.road : road
                                            ));
                                        }

                                        setShowEditModal(false);
                                        setEditingRoad(null);

                                    } catch (error) {
                                        console.error('Error updating road:', error);
                                        alert('Failed to update road. Please try again.');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="road-name">
                                            Road Name
                                        </label>
                                        <input
                                            id="road-name"
                                            type="text"
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            value={editingRoad.road_name}
                                            onChange={(e) => setEditingRoad({...editingRoad, road_name: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            rows="4"
                                            value={editingRoad.description || ''}
                                            onChange={(e) => setEditingRoad({...editingRoad, description: e.target.value})}
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="road-photo">
                                            Add Photo
                                        </label>
                                        <div className="flex items-center">
                                            <input
                                                id="road-photo"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    // Preview image if needed
                                                    console.log('File selected:', e.target.files[0]?.name);
                                                }}
                                            />
                                            <label
                                                htmlFor="road-photo"
                                                className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
                                            >
                                                <FaImage className="mr-2" /> Choose Photo
                                            </label>
                                            <span className="ml-3 text-sm text-gray-600" id="file-name">
                                                No file chosen
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Max file size: 5MB. Supported formats: JPG, PNG, GIF.
                                        </p>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Tags
                                        </label>
                                        <div className="border rounded p-3 bg-gray-50">
                                            {editingRoad.tags && editingRoad.tags.length > 0 ? (
                                                <CollapsibleTagSelector
                                                    selectedTags={editingRoad.tags}
                                                    onTagsChange={(tags) => setEditingRoad({...editingRoad, tags})}
                                                    entityType="road"
                                                    readOnly={false}
                                                    initialVisibleTags={5}
                                                />
                                            ) : (
                                                <p className="text-sm text-gray-500">No tags selected</p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    console.log('Opening tag selector modal...');
                                                    setShowTagSelectorModal(true);
                                                    console.log('showTagSelectorModal set to:', true);
                                                }}
                                                className="mt-2 inline-flex items-center px-3 py-1 border border-blue-500 text-blue-500 rounded-md text-sm hover:bg-blue-50"
                                            >
                                                <FaTag className="mr-1" /> Manage Tags
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Add tags to help others find your road
                                        </p>
                                    </div>

                                    <div className="mb-6">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 text-blue-600"
                                                checked={editingRoad.is_public}
                                                onChange={(e) => setEditingRoad({...editingRoad, is_public: e.target.checked})}
                                            />
                                            <span className="ml-2 text-gray-700 flex items-center">
                                                {editingRoad.is_public ? (
                                                    <>
                                                        <FaGlobe className="mr-1 text-green-600" /> Public
                                                        <span className="text-xs text-gray-500 ml-2">(Visible to everyone)</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaLock className="mr-1 text-orange-600" /> Private
                                                        <span className="text-xs text-gray-500 ml-2">(Only visible to you)</span>
                                                    </>
                                                )}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <button
                                            type="button"
                                            className="mr-4 text-gray-600 hover:text-gray-800"
                                            onClick={() => setShowEditModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                                            ) : (
                                                <FaCheck className="mr-2" />
                                            )}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* Tag Selector Modal */}
            {console.log('SelfProfileModal: showTagSelectorModal =', showTagSelectorModal, 'editingRoad =', editingRoad)}
            {showTagSelectorModal && editingRoad ? (
                <>
                    {console.log('SelfProfileModal: Rendering TagSelectorModal')}
                    <TagSelectorModal
                        isOpen={showTagSelectorModal}
                        onClose={() => {
                            console.log('Closing tag selector modal');
                            setShowTagSelectorModal(false);
                        }}
                        selectedTags={editingRoad.tags || []}
                        onTagsChange={(tags) => {
                            console.log('Tags changed in modal:', tags);
                            setEditingRoad({...editingRoad, tags});
                            console.log('Updated editingRoad:', {...editingRoad, tags});
                            // Don't close the modal to allow multiple tag selections
                        }}
                        entityType="road"
                    />
                </>
            ) : (
                console.log('SelfProfileModal: Not rendering TagSelectorModal')
            )}
        </Portal>
    );
}
