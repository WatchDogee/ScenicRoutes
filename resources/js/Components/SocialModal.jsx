import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaTrophy, FaUsers, FaUserFriends, FaRoad, FaFolder, FaTimes } from 'react-icons/fa';
import Modal from './Modal';
import CollectionModal from './CollectionModal';
import CollectionDetailsModal from './CollectionDetailsModal';
import Leaderboard from './Leaderboard';
import UserProfileModal from './UserProfileModal';
import RoadCard from './RoadCard';
import ProfilePicture from './ProfilePicture';

export default function SocialModal({ isOpen, onClose, onViewRoad, onViewRoadDetails, selectedCollectionId: initialCollectionId }) {
    // Temporary auth state until we fix the context
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        user: null
    });

    // Check auth state on mount
    useEffect(() => {
        console.log('SocialModal mounted, isOpen:', isOpen);

        // Force the modal to be visible
        if (isOpen) {
            // Add a class to the body to ensure the modal is visible
            document.body.classList.add('social-modal-open');

            // Add a style tag to ensure the modal is visible
            const styleTag = document.createElement('style');
            styleTag.id = 'social-modal-styles';
            styleTag.innerHTML = `
                .social-modal {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 10000 !important;
                    position: fixed !important;
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(styleTag);
        }

        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => {
                console.log('User data loaded for SocialModal');
                setAuthState({
                    isAuthenticated: true,
                    user: response.data
                });
            })
            .catch((error) => {
                console.error('Error loading user data for SocialModal:', error);
                setAuthState({
                    isAuthenticated: false,
                    user: null
                });
            });
        } else {
            console.log('No token found for SocialModal');
        }

        // Cleanup function
        return () => {
            document.body.classList.remove('social-modal-open');
            const styleTag = document.getElementById('social-modal-styles');
            if (styleTag) {
                styleTag.remove();
            }
        };
    }, [isOpen]);

    const { isAuthenticated, user } = authState;
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [showUserProfileModal, setShowUserProfileModal] = useState(false);
    const [showCollectionDetailsModal, setShowCollectionDetailsModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);
    const [collections, setCollections] = useState([]);
    const [following, setFollowing] = useState([]);
    const [feedContent, setFeedContent] = useState({ roads: [], collections: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'collections' && isAuthenticated && user) {
                fetchCollections();
            } else if (activeTab === 'following' && isAuthenticated && user) {
                fetchFollowing();
            } else if (activeTab === 'feed' && isAuthenticated && user) {
                fetchFeed();
            }
        }
    }, [activeTab, isAuthenticated, user, isOpen]);

    // Handle selected collection ID from props
    useEffect(() => {
        if (isOpen && initialCollectionId) {
            console.log('Selected collection ID received:', initialCollectionId);
            setSelectedCollectionId(initialCollectionId);
            setShowCollectionDetailsModal(true);
            // Switch to collections tab
            setActiveTab('collections');
        }
    }, [isOpen, initialCollectionId]);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            // Check if the API endpoint is available
            try {
                const response = await axios.get('/api/collections');
                setCollections(response.data);
                setError(null);
            } catch (apiError) {
                console.error('Error fetching collections:', apiError);
                // For development purposes, use mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using mock collections data for development');
                    setCollections([
                        {
                            id: 1,
                            name: 'My Favorite Roads',
                            description: 'A collection of my favorite scenic routes',
                            is_public: true,
                            roads: [{ id: 1, road_name: 'Mountain Pass', length: 15000 }],
                            user: { name: 'Demo User' }
                        },
                        {
                            id: 2,
                            name: 'Weekend Trips',
                            description: 'Great roads for weekend getaways',
                            is_public: false,
                            roads: [{ id: 2, road_name: 'Coastal Highway', length: 25000 }],
                            user: { name: 'Demo User' }
                        }
                    ]);
                } else {
                    setError('Failed to load collections. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            console.error('Error in collections handling:', error);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowing = async () => {
        try {
            setLoading(true);
            // Check if the API endpoint is available
            try {
                const response = await axios.get('/api/following');
                setFollowing(response.data.data || []);
                setError(null);
            } catch (apiError) {
                console.error('Error fetching following:', apiError);
                // For development purposes, use mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using mock following data for development');
                    setFollowing([
                        { id: 1, name: 'John Doe', username: 'johndoe', profile_picture_url: null },
                        { id: 2, name: 'Jane Smith', username: 'janesmith', profile_picture_url: null }
                    ]);
                } else {
                    setError('Failed to load following users. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            console.error('Error in following handling:', error);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchFeed = async () => {
        try {
            setLoading(true);
            // Check if the API endpoint is available
            try {
                const response = await axios.get('/api/feed');
                setFeedContent(response.data);
                setError(null);
            } catch (apiError) {
                console.error('Error fetching feed:', apiError);
                // For development purposes, use mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using mock feed data for development');
                    setFeedContent({
                        roads: [
                            {
                                id: 1,
                                road_name: 'Alpine Pass',
                                length: 18000,
                                user: { name: 'John Doe', profile_picture_url: null },
                                road_coordinates: [
                                    { lat: 47.1, lon: 9.5 },
                                    { lat: 47.2, lon: 9.6 }
                                ]
                            }
                        ],
                        collections: [
                            {
                                id: 1,
                                name: 'Mountain Roads',
                                description: 'Best mountain roads in Europe',
                                user: { name: 'Jane Smith', profile_picture_url: null },
                                roads: [{ id: 1, road_name: 'Alpine Pass' }]
                            }
                        ]
                    });
                } else {
                    setError('Failed to load feed. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            console.error('Error in feed handling:', error);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleCollectionCreated = (collection) => {
        console.log('Collection created:', collection);
        setCollections(prev => [collection, ...prev]);
        setShowCollectionModal(false);
    };

    // Function to refresh collections data
    const refreshCollections = () => {
        console.log('Refreshing collections data');
        fetchCollections();
    };

    const handleViewUser = (user) => {
        setSelectedUserId(user.id);
        setShowUserProfileModal(true);
    };

    const handleFollowChange = () => {
        // Refresh following list if we're on the following tab
        if (activeTab === 'following') {
            fetchFollowing();
        }
        // Refresh feed if we're on the feed tab
        if (activeTab === 'feed') {
            fetchFeed();
        }
    };

    const renderCollections = () => {
        if (!isAuthenticated) {
            return (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <p className="text-gray-600">You can view collections, but you need to log in to create your own collections.</p>
                    <p className="mt-2 text-sm text-gray-500">Public collections will be displayed here.</p>
                </div>
            );
        }

        if (loading) {
            return <div className="text-center py-8">Loading collections...</div>;
        }

        if (error) {
            return (
                <div className="text-center py-8 text-red-500">
                    {error}
                    <button
                        onClick={fetchCollections}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Your Collections</h3>
                    <button
                        onClick={() => {
                            console.log('Opening collection modal');
                            setShowCollectionModal(true);
                        }}
                        className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        <FaPlus className="mr-1" /> New Collection
                    </button>
                </div>

                {collections.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded border">
                        <FaFolder className="mx-auto text-4xl text-gray-400 mb-2" />
                        <p className="text-gray-600">You don't have any collections yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Create a collection to organize your favorite roads
                        </p>
                        <button
                            onClick={() => {
                                console.log('Opening collection modal from empty state');
                                setShowCollectionModal(true);
                            }}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Create Collection
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {collections.map(collection => (
                            <div key={collection.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                <div className="flex items-center">
                                    {collection.cover_image ? (
                                        <img
                                            src={`/storage/${collection.cover_image}`}
                                            alt={collection.name}
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                            <FaFolder className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="ml-3">
                                        <h4 className="font-medium">{collection.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            {collection.roads?.length || 0} roads
                                        </p>
                                    </div>
                                </div>

                                {collection.description && (
                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                        {collection.description}
                                    </p>
                                )}

                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-500">
                                        {collection.is_public ? 'Public' : 'Private'}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setSelectedCollectionId(collection.id);
                                            setShowCollectionDetailsModal(true);
                                        }}
                                        className="text-sm text-blue-500 hover:text-blue-700"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderFollowing = () => {
        if (!isAuthenticated) {
            return (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <p className="text-gray-600">You can view users, but you need to log in to follow them.</p>
                    <p className="mt-2 text-sm text-gray-500">Popular users will be displayed here.</p>
                </div>
            );
        }

        if (loading) {
            return <div className="text-center py-8">Loading following...</div>;
        }

        if (error) {
            return (
                <div className="text-center py-8 text-red-500">
                    {error}
                    <button
                        onClick={fetchFollowing}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return (
            <div>
                <h3 className="text-lg font-semibold mb-4">People You Follow</h3>

                {following.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded border">
                        <FaUserFriends className="mx-auto text-4xl text-gray-400 mb-2" />
                        <p className="text-gray-600">You aren't following anyone yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Follow other users to see their content in your feed
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {following.map(user => (
                            <div
                                key={user.id}
                                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleViewUser(user)}
                            >
                                <div className="flex items-center">
                                    <ProfilePicture user={user} size="md" />
                                    <div className="ml-3">
                                        <h4 className="font-medium">{user.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            @{user.username || 'user'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderFeed = () => {
        if (!isAuthenticated) {
            return (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <p className="text-gray-600">You can view popular content, but you need to log in to see a personalized feed.</p>
                    <p className="mt-2 text-sm text-gray-500">Recent popular roads and collections will be displayed here.</p>
                </div>
            );
        }

        if (loading) {
            return <div className="text-center py-8">Loading feed...</div>;
        }

        if (error) {
            return (
                <div className="text-center py-8 text-red-500">
                    {error}
                    <button
                        onClick={fetchFeed}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        const hasContent = feedContent.roads?.length > 0 || feedContent.collections?.length > 0;

        if (!hasContent) {
            return (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <FaUsers className="mx-auto text-4xl text-gray-400 mb-2" />
                    <p className="text-gray-600">Your feed is empty</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Follow other users to see their content here
                    </p>
                    <button
                        onClick={() => setActiveTab('following')}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Find People to Follow
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {feedContent.roads?.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Recent Roads</h3>
                        <div className="space-y-4">
                            {feedContent.roads.map(road => {
                                // Add error boundary for each road card
                                try {
                                    return (
                                        <RoadCard
                                            key={road.id}
                                            road={road}
                                            onViewMap={() => onViewRoad(road)}
                                            onViewDetails={(roadId, e) => {
                                                if (onViewRoadDetails) {
                                                    onViewRoadDetails(roadId, e);
                                                }
                                            }}
                                        />
                                    );
                                } catch (error) {
                                    console.error("Error rendering road card:", error, road);
                                    return (
                                        <div key={road.id} className="border rounded-lg p-4 bg-white">
                                            <h3 className="font-semibold text-lg">{road.road_name || 'Unnamed Road'}</h3>
                                            <p className="text-sm text-red-500">Error displaying road details</p>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                )}

                {feedContent.collections?.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Recent Collections</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedContent.collections.map(collection => (
                                <div key={collection.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                    <div className="flex items-center mb-2">
                                        <ProfilePicture user={collection.user} size="sm" />
                                        <div className="ml-2">
                                            <span className="font-medium">{collection.name}</span>
                                            <span className="text-sm text-gray-600 ml-1">
                                                by {collection.user.name}
                                            </span>
                                        </div>
                                    </div>
                                    {collection.description && (
                                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                            {collection.description}
                                        </p>
                                    )}
                                    <div className="text-xs text-gray-500">
                                        {collection.roads?.length || 0} roads
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Modal
                show={isOpen}
                onClose={showCollectionModal ? () => {} : onClose}
                maxWidth="4xl"
                staticBackdrop={true}>
                <div className="p-6" style={{ zIndex: 2000 }}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-blue-600">Social Hub</h2>
                        <div className="flex items-center">
                            {!isAuthenticated && (
                                <a
                                    href="/login"
                                    className="mr-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                >
                                    Login to Participate
                                </a>
                            )}
                            <button
                                onClick={() => {
                                    console.log('Close button clicked in SocialModal');
                                    if (!showCollectionModal) {
                                        onClose();
                                    }
                                }}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                            >
                                <FaTimes className="text-xl" />
                            </button>
                        </div>
                    </div>

                    <div className="flex overflow-x-auto border-b mb-4">
                        <button
                            className={`px-4 py-3 ${activeTab === 'leaderboard' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                            onClick={() => setActiveTab('leaderboard')}
                        >
                            <FaTrophy className="inline mr-1" /> Leaderboard
                        </button>
                        <button
                            className={`px-4 py-3 ${activeTab === 'collections' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                            onClick={() => setActiveTab('collections')}
                        >
                            <FaFolder className="inline mr-1" /> Collections
                        </button>
                        <button
                            className={`px-4 py-3 ${activeTab === 'following' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                            onClick={() => setActiveTab('following')}
                        >
                            <FaUserFriends className="inline mr-1" /> Following
                        </button>
                        <button
                            className={`px-4 py-3 ${activeTab === 'feed' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                            onClick={() => setActiveTab('feed')}
                        >
                            <FaUsers className="inline mr-1" /> Feed
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {activeTab === 'leaderboard' && (
                            <Leaderboard
                                onViewRoad={onViewRoad}
                                onViewUser={handleViewUser}
                                onViewRoadDetails={onViewRoadDetails}
                            />
                        )}

                        {activeTab === 'collections' && renderCollections()}

                        {activeTab === 'following' && renderFollowing()}

                        {activeTab === 'feed' && renderFeed()}
                    </div>
                </div>
            </Modal>

            {/* User Profile Modal - moved outside to prevent being cropped */}
            <UserProfileModal
                isOpen={showUserProfileModal}
                onClose={() => setShowUserProfileModal(false)}
                userId={selectedUserId}
                currentUserId={user?.id}
            />

            {/* Collection Modal - moved outside to prevent being cropped */}
            <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => {
                    console.log('Closing collection modal');
                    setShowCollectionModal(false);
                }}
                onSuccess={handleCollectionCreated}
            />

            {/* Collection Details Modal */}
            <CollectionDetailsModal
                isOpen={showCollectionDetailsModal}
                onClose={() => {
                    setShowCollectionDetailsModal(false);
                    // Refresh collections when modal is closed
                    refreshCollections();
                }}
                collectionId={selectedCollectionId}
                onCollectionUpdated={refreshCollections}
            />
        </>
    );
}
