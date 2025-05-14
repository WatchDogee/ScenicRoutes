import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { FaTimes, FaStar, FaFolder } from 'react-icons/fa';
import Portal from './Portal';
import StarRating from './StarRating';
import ProfilePicture from './ProfilePicture';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
export default function CollectionRatingModal({ isOpen, onClose, onSubmit, collection, auth, initialRating = 0, initialComment = '' }) {
    const { userSettings } = useContext(UserSettingsContext);
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState(initialComment);
    const [reviews, setReviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isOpen && collection) {
            fetchReviews();
        }
    }, [isOpen, collection]);
    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/collections/${collection.id}/reviews`);
            setReviews(response.data);
            setError(null);
        } catch (error) {
            setError('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (rating === 0) {
            return;
        }
        setIsSubmitting(true);
        try {
            
            const response = await axios.post(`/api/collections/${collection.id}/review`, {
                rating,
                comment
            });
            
            if (response.data.collection) {
                
                
                setTimeout(() => {
                    onSubmit(rating, comment, response.data.collection);
                }, 0);
            }
        } catch (error) {
            setError('Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen) return null;
    return (
        <Portal rootId="collection-rating-modal-root">
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
                <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-semibold">Collection Details</h2>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <FaTimes />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center mb-4">
                            {collection.cover_image ? (
                                <img
                                    src={`/storage/${collection.cover_image}`}
                                    alt={collection.name}
                                    className="w-16 h-16 object-cover rounded"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                    <FaFolder className="text-blue-400 text-2xl" />
                                </div>
                            )}
                            <div className="ml-4">
                                <h3 className="text-xl font-semibold">{collection.name}</h3>
                                <div className="flex items-center text-sm text-gray-600">
                                    <span>Created by {collection.user?.name || 'Unknown'}</span>
                                </div>
                                {collection.average_rating && (
                                    <div className="flex items-center mt-1">
                                        <StarRating rating={typeof collection.average_rating === 'number' ? collection.average_rating : 0} readOnly size="sm" />
                                        <span className="ml-1 text-sm text-gray-600">
                                            ({collection.reviews_count || 0} reviews)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {collection.description && (
                            <div className="mb-6 p-4 bg-gray-50 rounded">
                                <p className="text-gray-700">{collection.description}</p>
                            </div>
                        )}
                        {auth?.user ? (
                            <div className="mb-6 p-4 bg-blue-50 rounded">
                                <h3 className="text-lg font-semibold mb-2">Rate this Collection</h3>
                                <div className="flex justify-center mb-4">
                                    <StarRating
                                        rating={rating}
                                        onRatingChange={setRating}
                                        interactive={true}
                                        size="lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Comment</label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        rows="3"
                                        placeholder="Share your thoughts about this collection..."
                                    />
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={rating === 0 || isSubmitting}
                                        className={`px-4 py-2 rounded ${
                                            rating === 0 || isSubmitting
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 p-4 bg-yellow-50 rounded">
                                <p className="text-yellow-700">
                                    Please log in to rate this collection.
                                </p>
                            </div>
                        )}
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-2">Reviews</h3>
                            {loading ? (
                                <p className="text-center text-gray-500 py-4">Loading reviews...</p>
                            ) : error ? (
                                <p className="text-center text-red-500 py-4">{error}</p>
                            ) : reviews.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">
                                    No reviews yet. Be the first to review this collection!
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <div key={review.id} className="p-4 border rounded">
                                            <div className="flex items-center mb-2">
                                                <ProfilePicture user={review.user} size="sm" />
                                                <div className="ml-2">
                                                    <p className="font-medium">{review.user?.name}</p>
                                                    <div className="flex items-center">
                                                        <StarRating rating={review.rating} readOnly size="sm" />
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            {new Date(review.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="text-gray-700 mt-2">{review.comment}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
