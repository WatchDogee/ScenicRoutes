import React, { useState, useEffect } from 'react';

export default function RatingModal({ isOpen, onClose, onSubmit, road, auth, initialRating = 0, initialComment = '' }) {
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState(initialComment);

    useEffect(() => {
        if (isOpen && road) {
            const existingReview = road.reviews?.find(review => review.user?.id === auth.user?.id);
            setRating(existingReview?.rating || initialRating);
            setComment(existingReview?.comment || initialComment);
        }
    }, [isOpen, road, auth.user?.id, initialRating, initialComment]);

    if (!isOpen || !road) return null;

    const handleSubmit = () => {
        onSubmit(rating, comment);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">{road.road_name}</h2>
                        <p className="text-gray-600 mt-1">Added by {road.user?.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Road Statistics</h3>
                            <div className="mt-2 space-y-2">
                                <p className="text-gray-800">Length: {(road.length / 1000).toFixed(2)} km</p>
                                <p className="text-gray-800">Corners: {road.corner_count}</p>
                                <p className="text-gray-800">
                                    Average Rating: {typeof road.average_rating === 'number' ? 
                                        `${road.average_rating.toFixed(1)} ★` : 
                                        'No ratings yet'
                                    }
                                </p>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Description</h3>
                            <p className="mt-2 text-gray-800">{road.description || 'No description provided.'}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Add Your Review</h3>
                    <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`text-3xl ${
                                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                                } hover:text-yellow-400 transition-colors`}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Comment</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-4 py-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows="4"
                            placeholder="Share your experience with this road..."
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Community Reviews</h3>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                        {road.reviews && road.reviews.length > 0 ? (
                            road.reviews.map((review) => (
                                <div key={review.id} className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-lg font-medium">
                                                {review.user?.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium">{review.user?.name}</p>
                                            <div className="flex text-yellow-400">
                                                {[...Array(review.rating)].map((_, i) => (
                                                    <span key={i}>★</span>
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-sm text-gray-500 ml-auto">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {review.comment && (
                                        <p className="text-gray-700 mt-2">{review.comment}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">
                                No reviews yet. Be the first to review this road!
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0}
                        className={`px-4 py-2 text-sm ${
                            rating === 0 ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                        } text-white rounded transition-colors`}
                    >
                        Submit Review
                    </button>
                </div>
            </div>
        </div>
    );
} 