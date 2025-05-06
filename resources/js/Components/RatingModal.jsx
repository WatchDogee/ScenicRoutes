import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import PhotoGallery from './PhotoGallery';
import PhotoUploader from './PhotoUploader';
import TempPhotoUploader from './TempPhotoUploader';

export default function RatingModal({ isOpen, onClose, onSubmit, road, auth, initialRating = 0, initialComment = '' }) {
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState(initialComment);
    const [roadPhotos, setRoadPhotos] = useState([]);
    const [reviewPhotos, setReviewPhotos] = useState({});
    const [userReviewId, setUserReviewId] = useState(null);
    const [tempReviewPhotos, setTempReviewPhotos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && road) {
            try {
                // Set road photos
                setRoadPhotos(road.photos || []);

                // Debug road reviews and photos
                console.log('Road reviews in RatingModal:', road.reviews);

                // Initialize review photos map
                const reviewPhotosMap = {};
                if (road.reviews) {
                    road.reviews.forEach(review => {
                        console.log(`Review ${review.id} photos:`, review.photos);
                        if (review.photos && review.photos.length > 0) {
                            // Make sure all photos have photo_url property
                            const validPhotos = review.photos.filter(photo => photo && photo.photo_url);
                            if (validPhotos.length > 0) {
                                reviewPhotosMap[review.id] = validPhotos;
                            }
                        }
                    });
                }
                console.log('Review photos map:', reviewPhotosMap);
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

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            // If there are temporary photos to upload with the review
            if (tempReviewPhotos.length > 0) {
                const formData = new FormData();
                formData.append('rating', rating);
                if (comment) formData.append('comment', comment);

                // Add all temporary photos to the form data
                tempReviewPhotos.forEach((photo, index) => {
                    formData.append(`photos[${index}]`, photo.file);
                    if (photo.caption) formData.append(`captions[${index}]`, photo.caption);
                });

                // Submit directly to the API
                const response = await axios.post(`/api/saved-roads/${road.id}/review`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                // Update the road data
                if (response.data.road) {
                    // Call the parent component's onSubmit to update UI
                    onClose();
                }
            } else {
                // Regular review submission without photo
                onSubmit(rating, comment);
            }
        } catch (error) {
            console.error('Error submitting review with photos:', error);
            // Fall back to regular submission
            onSubmit(rating, comment);
        } finally {
            setIsSubmitting(false);
            setTempReviewPhotos([]);
        }
    };

    const handleRoadPhotoUploaded = (data) => {
        if (data.photo && data.road) {
            // Update the road photos
            setRoadPhotos([...roadPhotos, data.photo]);
        }
    };

    const handleReviewPhotoUploaded = (data) => {
        console.log('Review photo upload response:', data);

        if (data.photo && data.review) {
            console.log('New review photo:', data.photo);
            console.log('Photo URL:', data.photo.photo_url);

            // Update the review photos
            const updatedReviewPhotos = { ...reviewPhotos };
            if (!updatedReviewPhotos[data.review.id]) {
                updatedReviewPhotos[data.review.id] = [];
            }

            // Ensure the photo has a photo_url property
            if (!data.photo.photo_url && data.photo.photo_path) {
                console.warn('Photo missing photo_url but has photo_path:', data.photo.photo_path);
                // Try to construct a URL (this is a fallback and might not work)
                data.photo.photo_url = `/storage/${data.photo.photo_path}`;
                console.log('Constructed fallback URL:', data.photo.photo_url);
            }

            updatedReviewPhotos[data.review.id] = [...updatedReviewPhotos[data.review.id], data.photo];
            console.log('Updated review photos for review', data.review.id, ':', updatedReviewPhotos[data.review.id]);

            setReviewPhotos(updatedReviewPhotos);
        } else {
            console.error('Invalid photo upload response:', data);
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

                    {/* Anyone can add photos to the road */}
                    <PhotoUploader
                        endpoint={`/api/saved-roads/${road.id}/photos`}
                        onPhotoUploaded={handleRoadPhotoUploaded}
                        existingPhotos={roadPhotos}
                        className="mt-4"
                    />
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

                    {/* Show photo uploader for both new and existing reviews */}
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Add Photos to Your Review</h4>

                        {/* For existing reviews, display existing photos */}
                        {userReviewId && reviewPhotos[userReviewId] && reviewPhotos[userReviewId].length > 0 && (
                            <PhotoGallery
                                photos={reviewPhotos[userReviewId]}
                                onPhotoDeleted={handlePhotoDeleted}
                                canDelete={true}
                                className="mb-3"
                            />
                        )}

                        {/* For existing reviews, show photo uploader with existing review ID */}
                        {userReviewId ? (
                            <PhotoUploader
                                endpoint={`/api/reviews/${userReviewId}/photos`}
                                onPhotoUploaded={handleReviewPhotoUploaded}
                                existingPhotos={reviewPhotos[userReviewId] || []}
                            />
                        ) : (
                            <div className="mb-3">
                                <TempPhotoUploader
                                    onPhotoSelected={(photo) => {
                                        setTempReviewPhotos(prev => [...prev, photo]);
                                    }}
                                    onPhotoRemoved={(photo) => {
                                        setTempReviewPhotos(prev => prev.filter(p => p.id !== photo.id));
                                    }}
                                    maxPhotos={5}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    You can also add photos directly to the road above.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rating-modal-reviews-section">
                    <h3 className="rating-modal-section-title">Community Reviews</h3>
                    <div className="rating-modal-reviews-list">
                        {road.reviews && road.reviews.length > 0 ? (
                            road.reviews.map((review) => {
                                // Ensure review photos are properly passed
                                const reviewWithPhotos = {
                                    ...review,
                                    photos: reviewPhotos[review.id] || review.photos || []
                                };
                                console.log(`Rendering review ${review.id} with photos:`, reviewWithPhotos.photos);
                                return <ReviewCard key={review.id} review={reviewWithPhotos} />;
                            })
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
                        disabled={rating === 0 || isSubmitting}
                        className={`rating-modal-submit-button ${
                            rating === 0 || isSubmitting ? 'rating-modal-submit-button-disabled' : 'rating-modal-submit-button-enabled'
                        }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
}