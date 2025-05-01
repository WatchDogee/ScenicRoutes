import React, { useState, useEffect } from 'react';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';

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

    const getAverageRating = () => {
        if (road.average_rating || road.reviews_avg_rating) {
            return `${(road.average_rating || road.reviews_avg_rating).toFixed(1)} ★`;
        }

        if (road.reviews && road.reviews.length > 0) {
            const sum = road.reviews.reduce((total, review) => total + review.rating, 0);
            return `${(sum / road.reviews.length).toFixed(1)} ★`;
        }

        return 'No ratings yet';
    };

    return (
        <div className="rating-modal-overlay">
            <div className="rating-modal-container">
                <div className="rating-modal-header">
                    <div>
                        <h2 className="rating-modal-title">{road.road_name}</h2>
                        <p className="rating-modal-subtitle">Added by {road.user?.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rating-modal-close-button"
                    >
                        ✕
                    </button>
                </div>

                <div className="rating-modal-stats">
                    <div className="rating-modal-stats-grid">
                        <div>
                            <h3 className="rating-modal-stats-title">Road Statistics</h3>
                            <div className="rating-modal-stats-content space-y-2">
                                <p>Length: {(road.length / 1000).toFixed(2)} km</p>
                                <p>Corners: {road.corner_count}</p>
                                <p>Average Rating: {getAverageRating()}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="rating-modal-stats-title">Description</h3>
                            <p className="rating-modal-stats-content">{road.description || 'No description provided.'}</p>
                        </div>
                    </div>
                </div>

                <div className="rating-modal-review-section">
                    <h3 className="rating-modal-section-title">Add Your Review</h3>
                    <div className="rating-modal-stars">
                        <StarRating
                            rating={rating}
                            onRatingChange={setRating}
                            interactive={true}
                            size="lg"
                        />
                    </div>
                    <div>
                        <label className="rating-modal-comment-label">Your Comment</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="rating-modal-comment-textarea"
                            rows="4"
                            placeholder="Share your experience with this road..."
                        />
                    </div>
                </div>

                <div className="rating-modal-reviews-section">
                    <h3 className="rating-modal-section-title">Community Reviews</h3>
                    <div className="rating-modal-reviews-list">
                        {road.reviews && road.reviews.length > 0 ? (
                            road.reviews.map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))
                        ) : (
                            <p className="rating-modal-no-reviews">
                                No reviews yet. Be the first to review this road!
                            </p>
                        )}
                    </div>
                </div>

                <div className="rating-modal-footer">
                    <button
                        onClick={onClose}
                        className="rating-modal-cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0}
                        className={`rating-modal-submit-button ${
                            rating === 0 ? 'rating-modal-submit-button-disabled' : 'rating-modal-submit-button-enabled'
                        }`}
                    >
                        Submit Review
                    </button>
                </div>
            </div>
        </div>
    );
}