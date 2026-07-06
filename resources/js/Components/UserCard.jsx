import React from 'react';
import { FaRoad, FaUsers, FaFolder, FaMapMarkerAlt } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import FollowButton from './FollowButton';

export default function UserCard({ user, onViewUser, onFollowChange, showLocation = false }) {
    const handleClick = (e) => {
        // Don't trigger view if clicking follow button
        if (e.target.closest('button')) {
            return;
        }
        if (onViewUser) {
            onViewUser(user);
        }
    };

    return (
        <div 
            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={handleClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center flex-1">
                    <ProfilePicture user={user} size="lg" className="mr-3" />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{user.name || 'Unknown User'}</h4>
                        <p className="text-sm text-gray-600 truncate">
                            @{user.username || 'user'}
                        </p>
                        {showLocation && user.location && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                <FaMapMarkerAlt className="mr-1" />
                                <span>{user.location}</span>
                            </div>
                        )}
                    </div>
                </div>
                {user.id && (
                    <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton 
                            userId={user.id} 
                            initialFollowing={user.is_following || false}
                            onFollowChange={onFollowChange}
                        />
                    </div>
                )}
            </div>
            
            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                    <FaRoad className="mr-1 text-gray-400" />
                    <span>{user.public_roads_count || user.saved_roads_count || 0}</span>
                    <span className="ml-1 text-gray-500">roads</span>
                </div>
                <div className="flex items-center">
                    <FaFolder className="mr-1 text-gray-400" />
                    <span>{user.collections_count || 0}</span>
                    <span className="ml-1 text-gray-500">collections</span>
                </div>
                <div className="flex items-center">
                    <FaUsers className="mr-1 text-gray-400" />
                    <span>{user.followers_count || 0}</span>
                    <span className="ml-1 text-gray-500">followers</span>
                </div>
            </div>
        </div>
    );
}






















