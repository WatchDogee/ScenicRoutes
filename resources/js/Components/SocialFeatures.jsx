import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaTrophy, FaUsers, FaUserFriends, FaRoad, FaFolder } from 'react-icons/fa';
import CollectionModal from './CollectionModal';
import Leaderboard from './Leaderboard';
import UserProfileModal from './UserProfileModal';
import RoadCard from './RoadCard';
import ProfilePicture from './ProfilePicture';
import EnhancedCollections from './EnhancedCollections';
export default function SocialFeatures({ onViewRoad }) {
    
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        user: null
    });
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => {
                setAuthState({
                    isAuthenticated: true,
                    user: response.data
                });
            })
            .catch(() => {
                setAuthState({
                    isAuthenticated: false,
                    user: null
                });
            });
        }
    }, []);
    const { isAuthenticated, user } = authState;
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [showUserProfileModal, setShowUserProfileModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [collections, setCollections] = useState([]);
    const [following, setFollowing] = useState([]);
    const [feedContent, setFeedContent] = useState({ roads: [], collections: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (activeTab === 'collections' && isAuthenticated && user) {
            fetchCollections();
        } else if (activeTab === 'following' && isAuthenticated && user) {
            fetchFollowing();
        } else if (activeTab === 'feed' && isAuthenticated && user) {
            fetchFeed();
        }
    }, [activeTab, isAuthenticated, user]);
    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/collections');
            setCollections(response.data);
            setError(null);
        } catch (error) {
            setError('Failed to load collections');
        } finally {
            setLoading(false);
        }
    };
    const fetchFollowing = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/following');
            setFollowing(response.data.data || []);
            setError(null);
        } catch (error) {
            setError('Failed to load following users');
        } finally {
            setLoading(false);
        }
    };
    const fetchFeed = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/feed');
            setFeedContent(response.data);
            setError(null);
        } catch (error) {
            setError('Failed to load feed');
        } finally {
            setLoading(false);
        }
    };
    const handleCollectionCreated = (collection) => {
        setCollections(prev => [collection, ...prev]);
    };
    const handleViewUser = (user) => {
        setSelectedUserId(user.id);
        setShowUserProfileModal(true);
    };
    
    const handleViewCollection = (collection) => {
        
    };
    const renderFollowing = () => {
        if (!isAuthenticated || !user) {
            return (
                <div className="text-center py-8 text-gray-500">
                    <p>You can view users, but you need to log in to follow them.</p>
                    <p className="mt-2">Popular users will be displayed here.</p>
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
                                <div className="mt-2 text-sm text-gray-600">
                                    <FaRoad className="inline mr-1" />
                                    {user.saved_roads_count || 0} public roads
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    const renderFeed = () => {
        if (!isAuthenticated || !user) {
            return (
                <div className="text-center py-8 text-gray-500">
                    <p>You can view popular content, but you need to log in to see a personalized feed.</p>
                    <p className="mt-2">Recent popular roads and collections will be displayed here.</p>
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
        const hasContent = feedContent.roads.length > 0 || feedContent.collections.length > 0;
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
                {feedContent.roads.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Recent Roads</h3>
                        <div className="space-y-4">
                            {feedContent.roads.map(road => (
                                <RoadCard
                                    key={road.id}
                                    road={road}
                                    onViewMap={() => onViewRoad(road)}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {feedContent.collections.length > 0 && (
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
                                    <div className="text-sm text-gray-500">
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
        <div className="bg-white rounded-lg shadow">
            <div className="flex overflow-x-auto border-b">
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
            <div className="p-4">
                {activeTab === 'leaderboard' && (
                    <Leaderboard
                        onViewRoad={onViewRoad}
                        onViewUser={handleViewUser}
                    />
                )}
                {activeTab === 'collections' && (
                    <EnhancedCollections
                        onViewCollection={handleViewCollection}
                        onViewUser={handleViewUser}
                        authState={authState}
                    />
                )}
                {activeTab === 'following' && renderFollowing()}
                {activeTab === 'feed' && renderFeed()}
            </div>
            {$1}
            <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                onSuccess={handleCollectionCreated}
            />
            <UserProfileModal
                isOpen={showUserProfileModal}
                onClose={() => setShowUserProfileModal(false)}
                userId={selectedUserId}
                currentUserId={user?.id}
            />
        </div>
    );
}
