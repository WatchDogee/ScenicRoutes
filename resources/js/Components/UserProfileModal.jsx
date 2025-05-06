import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaRoad, FaUsers, FaUserFriends } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import FollowButton from './FollowButton';
import RoadCard from './RoadCard';
import Portal from './Portal';

export default function UserProfileModal({ isOpen, onClose, userId, currentUserId }) {
    const [user, setUser] = useState(null);
    const [userRoads, setUserRoads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('roads');
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserData();
        }
    }, [isOpen, userId]);

    const fetchUserData = async () => {
        try {
            setLoading(true);

            // Fetch user profile from public endpoint
            const userResponse = await axios.get(`/api/public/users/${userId}`);
            setUser(userResponse.data);

            // Fetch user's public roads from the new public endpoint
            const roadsResponse = await axios.get(`/api/public/users/${userId}/roads`);
            setUserRoads(roadsResponse.data || []);

            // Try to fetch follow counts if authenticated
            try {
                const followResponse = await axios.get(`/api/users/${userId}/follow-status`);
                setFollowersCount(followResponse.data.followers_count || 0);
                setFollowingCount(followResponse.data.following_count || 0);
            } catch (followError) {
                console.log('Could not fetch follow status, user might not be authenticated');
                setFollowersCount(0);
                setFollowingCount(0);
            }

            setError(null);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setError('Failed to load user profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowChange = (isFollowing) => {
        // Update followers count when follow status changes
        setFollowersCount(prev => isFollowing ? prev + 1 : Math.max(0, prev - 1));
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
        <Portal rootId="user-profile-modal-root">
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[20000] p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold">User Profile</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-8">Loading user profile...</div>
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
                    ) : user ? (
                        <>
                            <div className="flex items-center mb-6">
                                <ProfilePicture user={user} size="lg" />
                                <div className="ml-4 flex-1">
                                    <h3 className="text-xl font-semibold">{user.name}</h3>
                                    <p className="text-gray-600">@{user.username || 'user'}</p>

                                    <div className="flex items-center mt-2 space-x-4">
                                        <div className="text-sm text-gray-600">
                                            <FaRoad className="inline mr-1" />
                                            {userRoads.length} public roads
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <FaUsers className="inline mr-1" />
                                            {followersCount} followers
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <FaUserFriends className="inline mr-1" />
                                            {followingCount} following
                                        </div>
                                    </div>
                                </div>

                                {userId !== currentUserId && (
                                    <FollowButton
                                        userId={userId}
                                        onFollowChange={handleFollowChange}
                                    />
                                )}
                            </div>

                            <div className="border-b mb-4">
                                <button
                                    className={`px-4 py-2 ${activeTab === 'roads' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                                    onClick={() => setActiveTab('roads')}
                                >
                                    Roads
                                </button>
                            </div>

                            {activeTab === 'roads' && (
                                <div className="space-y-4">
                                    {userRoads.length === 0 ? (
                                        <p className="text-center text-gray-500 py-4">
                                            This user hasn't shared any public roads yet.
                                        </p>
                                    ) : (
                                        userRoads.map(road => {
                                            // Add error boundary for each road card
                                            try {
                                                return (
                                                    <RoadCard
                                                        key={road.id}
                                                        road={road}
                                                        showUser={false}
                                                        onViewMap={handleViewRoad}
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
                                        })
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            User not found
                        </div>
                    )}
                </div>
                </div>
            </div>
        </Portal>
    );
}
