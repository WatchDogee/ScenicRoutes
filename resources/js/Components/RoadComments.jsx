import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';
import { showToast } from './ToastContainer';
import ProfilePicture from './ProfilePicture';

export default function RoadComments({ roadId, auth }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (roadId) {
            fetchComments();
        }
    }, [roadId]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/roads/${roadId}/comments`);
            setComments(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load comments');
            console.error('Error fetching comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        console.log('handleSubmitComment called', { 
            newComment, 
            auth: auth?.user, 
            roadId,
            submitting 
        });
        
        if (!newComment.trim()) {
            showToast('Please enter a comment', 'warning', 3000);
            return;
        }

        if (!auth?.user) {
            showToast('Please log in to comment', 'warning', 3000);
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            const config = { withCredentials: true, headers: {} };

            // Support both bearer-token and cookie-based Sanctum auth
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            } else {
                // Ensure CSRF cookie exists for session-based auth
                await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
            }

            const response = await axios.post(
                `/api/roads/${roadId}/comments`,
                { comment: newComment },
                config
            );

            if (response.data.comment) {
                setComments([...comments, response.data.comment]);
                setNewComment('');
                showToast('Comment added successfully!', 'success', 3000);
            } else {
                showToast('Comment saved but response was missing data. Please refresh.', 'warning', 4000);
            }
        } catch (err) {
            const status = err.response?.status;
            const errorMessage = err.response?.data?.error || err.message || 'Failed to add comment';
            setError(errorMessage);
            showToast(errorMessage, 'error', 4000);
            console.error('Error submitting comment:', { status, err });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/roads/${roadId}/comments/${commentId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            setComments(comments.filter(c => c.id !== commentId));
            showToast('Comment deleted successfully!', 'success', 3000);
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to delete comment';
            showToast(errorMessage, 'error', 4000);
            console.error('Error deleting comment:', err);
        }
    };

    return (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Comments</h3>

            {/* Comment Form */}
            {auth?.user ? (
                <form onSubmit={handleSubmitComment} className="mb-6 p-4 bg-white rounded-lg border">
                    <div className="mb-3">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your thoughts about this road..."
                            className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows="3"
                            disabled={submitting}
                        />
                    </div>
                    <div className="text-right">
                        <button
                            type="submit"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSubmitComment(e);
                            }}
                            disabled={submitting || !newComment.trim()}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                submitting || !newComment.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700">
                        <a href="/login" className="font-semibold underline hover:no-underline">
                            Log in
                        </a>
                        {' '}to comment on this road
                    </p>
                </div>
            )}

            {/* Comments List */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">
                    Loading comments...
                </div>
            ) : error ? (
                <div className="text-center py-8 text-red-500">
                    {error}
                </div>
            ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No comments yet. Be the first to comment!
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="p-4 bg-white rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center">
                                    <ProfilePicture user={comment.user} size="sm" />
                                    <div className="ml-3">
                                        <p className="font-medium text-gray-900">
                                            {comment.user?.name || 'Unknown User'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                {auth?.user?.id === comment.user_id && (
                                    <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Delete comment"
                                    >
                                        <FaTimes size={16} />
                                    </button>
                                )}
                            </div>
                            <p className="text-gray-700 mt-2">{comment.comment}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
