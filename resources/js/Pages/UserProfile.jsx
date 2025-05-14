import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { FaRoad, FaUsers, FaUserFriends, FaEdit, FaCog, FaExternalLinkAlt } from 'react-icons/fa';
import axios from 'axios';
import ProfilePicture from '@/Components/ProfilePicture';
import RoadCard from '@/Components/RoadCard';
import FollowButton from '@/Components/FollowButton';
import ErrorBoundary from '@/Components/ErrorBoundary';
import { Link } from '@inertiajs/react';
export default function UserProfile({ auth }) {
    const [user, setUser] = useState(auth.user);
    const [userRoads, setUserRoads] = useState([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [collections, setCollections] = useState([]);
    const [activeTab, setActiveTab] = useState('roads');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (auth.user) {
            fetchUserData();
        }
    }, [auth.user]);
    const fetchUserData = async () => {
        try {
            setLoading(true);
            
            const roadsResponse = await axios.get(`/api/public/users/${auth.user.id}/roads`);
            setUserRoads(roadsResponse.data || []);
            
            try {
                const collectionsResponse = await axios.get('/api/collections');
                setCollections(collectionsResponse.data || []);
            } catch (collectionsError) {
                setCollections([]);
            }
            
            try {
                const followResponse = await axios.get(`/api/users/${auth.user.id}/follow-status`);
                setFollowersCount(followResponse.data.followers_count || 0);
                setFollowingCount(followResponse.data.following_count || 0);
                
                try {
                    const followersResponse = await axios.get(`/api/users/${auth.user.id}/followers`);
                    setFollowers(followersResponse.data || []);
                } catch (followersError) {
                    setFollowers([]);
                }
                
                try {
                    const followingResponse = await axios.get(`/api/users/${auth.user.id}/following`);
                    setFollowing(followingResponse.data || []);
                } catch (followingError) {
                    setFollowing([]);
                }
            } catch (followError) {
                setFollowersCount(0);
                setFollowingCount(0);
                setFollowers([]);
                setFollowing([]);
            }
            setError(null);
        } catch (error) {
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };
    const handleViewRoad = (road) => {
        
        window.location.href = `/map?road=${road.id}`;
    };
    return (
        <>
            <Head title="My Profile" />
            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {$1}
                    <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start">
                            <div className="mb-4 sm:mb-0 sm:mr-6">
                                <ProfilePicture user={user} size="xl" className="border-4 border-white" />
                            </div>
                            <div className="text-center sm:text-left flex-1">
                                <h1 className="text-2xl font-bold">{user.name}</h1>
                                <p className="text-blue-100">@{user.username || user.name.toLowerCase().replace(/\s+/g, '')}</p>
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
                                        <div className="text-xl font-bold">{followersCount}</div>
                                        <div className="text-sm text-blue-100">Followers</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold">{followingCount}</div>
                                        <div className="text-sm text-blue-100">Following</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 sm:mt-0 flex space-x-2">
                                <Link href="/settings" className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-md shadow-sm hover:bg-blue-50">
                                    <FaEdit className="mr-2" /> Edit Profile
                                </Link>
                                <Link href="/settings" className="inline-flex items-center p-2 bg-white text-blue-600 rounded-md shadow-sm hover:bg-blue-50">
                                    <FaCog />
                                </Link>
                            </div>
                        </div>
                    </div>
                    {$1}
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
                    {$1}
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
                                                <Link
                                                    href="/map"
                                                    className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Explore Map
                                                </Link>
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
                                {$1}
                                {activeTab === 'following' && (
                                    <div className="space-y-4">
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
                                                {following.map(followedUser => (
                                                    <div
                                                        key={followedUser.id}
                                                        className="border rounded-lg p-4 hover:bg-gray-50"
                                                    >
                                                        <div className="flex items-center">
                                                            <ProfilePicture user={followedUser} size="md" />
                                                            <div className="ml-3">
                                                                <h4 className="font-medium">{followedUser.name}</h4>
                                                                <p className="text-sm text-gray-600">
                                                                    @{followedUser.username || followedUser.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                                                                </p>
                                                                {followedUser.saved_roads_count > 0 && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {followedUser.saved_roads_count} public roads
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => window.location.href = `/map?user=${followedUser.id}`}
                                                                className="ml-auto text-sm text-blue-500 hover:text-blue-700"
                                                                title="View user's roads on map"
                                                            >
                                                                <FaExternalLinkAlt />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {$1}
                                {activeTab === 'followers' && (
                                    <div className="space-y-4">
                                        {followers.length === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded border">
                                                <FaUsers className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You don't have any followers yet</p>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    When other users follow you, they'll appear here
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                {followers.map(follower => (
                                                    <div
                                                        key={follower.id}
                                                        className="border rounded-lg p-4 hover:bg-gray-50"
                                                    >
                                                        <div className="flex items-center">
                                                            <ProfilePicture user={follower} size="md" />
                                                            <div className="ml-3">
                                                                <h4 className="font-medium">{follower.name}</h4>
                                                                <p className="text-sm text-gray-600">
                                                                    @{follower.username || follower.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                                                                </p>
                                                                {follower.saved_roads_count > 0 && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {follower.saved_roads_count} public roads
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => window.location.href = `/map?user=${follower.id}`}
                                                                className="ml-auto text-sm text-blue-500 hover:text-blue-700"
                                                                title="View user's roads on map"
                                                            >
                                                                <FaExternalLinkAlt />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
