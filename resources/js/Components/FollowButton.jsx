import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUserPlus, FaUserMinus, FaSpinner } from 'react-icons/fa';
export default function FollowButton({ userId, initialFollowing = false, onFollowChange }) {
    const [isFollowing, setIsFollowing] = useState(initialFollowing);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (userId) {
            fetchFollowStatus();
        }
    }, [userId]);
    const fetchFollowStatus = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/users/${userId}/follow-status`);
            setIsFollowing(response.data.following);
        } catch (error) {
            setError('Failed to load follow status');
        } finally {
            setLoading(false);
        }
    };
    const handleFollowToggle = async () => {
        if (loading) return;
        try {
            setLoading(true);
            setError(null);
            if (isFollowing) {
                
                await axios.post(`/api/users/${userId}/unfollow`);
                setIsFollowing(false);
            } else {
                
                await axios.post(`/api/users/${userId}/follow`);
                setIsFollowing(true);
            }
            if (onFollowChange) {
                onFollowChange(!isFollowing);
            }
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update follow status');
        } finally {
            setLoading(false);
        }
    };
    if (error) {
        return (
            <button 
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm"
                onClick={fetchFollowStatus}
            >
                Error: Retry
            </button>
        );
    }
    return (
        <button
            onClick={handleFollowToggle}
            disabled={loading}
            className={`flex items-center px-3 py-1 rounded text-sm ${
                isFollowing 
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
        >
            {loading ? (
                <FaSpinner className="animate-spin mr-1" />
            ) : isFollowing ? (
                <FaUserMinus className="mr-1" />
            ) : (
                <FaUserPlus className="mr-1" />
            )}
            {isFollowing ? 'Following' : 'Follow'}
        </button>
    );
}
