import React, { useState, useEffect } from 'react';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import PhotoGallery from './PhotoGallery';
import PhotoUploader from './PhotoUploader';

export default function RatingModal({ isOpen, onClose, onSubmit, road, auth, initialRating = 0, initialComment = '' }) {
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState(initialComment);
    const [roadPhotos, setRoadPhotos] = useState([]);
    const [reviewPhotos, setReviewPhotos] = useState({});
    const [userReviewId, setUserReviewId] = useState(null);

    useEffect(() => {
        if (isOpen && road) {
            try {
                // Set road photos
                setRoadPhotos(road.photos || []);

                // Initialize review photos map
                const reviewPhotosMap = {};
                if (road.reviews) {
                    road.reviews.forEach(review => {
                        if (review.photos && review.photos.length > 0) {
                            reviewPhotosMap[review.id] = review.photos;
                        }
                    });
                }
                setReviewPhotos(reviewPhotosMap);

                // Set user's existing review data
                const existingReview = road.reviews?.find(review => review.user?.id === auth.user?.id);
                if (existingReview) {
                    setRating(existingReview.rating || initialRating);
                    setComment(existingReview.comment || initialComment);
                    setUserReviewId(existingReview.id);
                } else {
                    setRating(initialRating);
                    setComment(initialComment);
                    setUserReviewId(null);
                }
            } catch (error) {
                console.error("Error setting up rating modal:", error);
                // Set defaults
                setRoadPhotos([]);
                setReviewPhotos({});
                setRating(initialRating);
                setComment(initialComment);
                setUserReviewId(null);
            }
        }
    }, [isOpen, road, auth.user?.id, initialRating, initialComment]);

    if (!isOpen || !road) return null;

    const handleSubmit = () => {
        onSubmit(rating, comment);
    };

    const handleRoadPhotoUploaded = (data) => {
        if (data.photo && data.road) {
            // Update the road photos
            setRoadPhotos([...roadPhotos, data.photo]);
        }
    };

    const handleReviewPhotoUploaded = (data) => {
        if (data.photo && data.review) {
            // Update the review photos
            const updatedReviewPhotos = { ...reviewPhotos };
            if (!updatedReviewPhotos[data.review.id]) {
                updatedReviewPhotos[data.review.id] = [];
            }
            updatedReviewPhotos[data.review.id] = [...updatedReviewPhotos[data.review.id], data.photo];
            setReviewPhotos(updatedReviewPhotos);
        }
    };

    const handlePhotoDeleted = (photoId, photoType) => {
        if (photoType === 'road') {
            // Remove the photo from roadPhotos
            setRoadPhotos(roadPhotos.filter(photo => photo.id !== photoId));
        } else if (photoType === 'review') {
            // Remove the photo from reviewPhotos
            const updatedReviewPhotos = { ...reviewPhotos };
            Object.keys(updatedReviewPhotos).forEach(reviewId => {
                updatedReviewPhotos[reviewId] = updatedReviewPhotos[reviewId].filter(photo => photo.id !== photoId);
                if (updatedReviewPhotos[reviewId].length === 0) {
                    delete updatedReviewPhotos[reviewId];
                }
            });
            setReviewPhotos(updatedReviewPhotos);
        }
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

                {/* Road Photos Section */}
                <div className="mb-6">
                    <h3 className="rating-modal-section-title">Road Photos</h3>
                    <PhotoGallery
                        photos={roadPhotos}
                        onPhotoDeleted={handlePhotoDeleted}
                        canDelete={auth.user?.id === road.user?.id}
                    />

                    {/* Only road owner can add photos to the road */}
                    {auth.user?.id === road.user?.id && (
                        <PhotoUploader
                            endpoint={`/api/saved-roads/${road.id}/photos`}
                            onPhotoUploaded={handleRoadPhotoUploaded}
                            existingPhotos={roadPhotos}
                            className="mt-4"
                        />
                    )}
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

                    {/* Only show photo uploader if the user has submitted a review */}
                    {userReviewId && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Photos to Your Review</h4>

                            {/* Display existing photos */}
                            {reviewPhotos[userReviewId] && reviewPhotos[userReviewId].length > 0 && (
                                <PhotoGallery
                                    photos={reviewPhotos[userReviewId]}
                                    onPhotoDeleted={handlePhotoDeleted}
                                    canDelete={true}
                                    className="mb-3"
                                />
                            )}

                            {/* Photo uploader */}
                            <PhotoUploader
                                endpoint={`/api/reviews/${userReviewId}/photos`}
                                onPhotoUploaded={handleReviewPhotoUploaded}
                                existingPhotos={reviewPhotos[userReviewId] || []}
                            />
                        </div>
                    )}
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