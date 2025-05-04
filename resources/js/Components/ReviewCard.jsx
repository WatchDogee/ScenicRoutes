import React from 'react';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
import PhotoGallery from './PhotoGallery';

export default function ReviewCard({ review }) {
    return (
        <div className="rating-modal-review-card">
            <div className="rating-modal-review-header">
                <ProfilePicture user={review.user} />
                <div className="rating-modal-review-user-info">
                    <p className="rating-modal-review-username">{review.user?.name}</p>
                    <div className="rating-modal-review-rating">
                        <StarRating rating={review.rating} interactive={false} size="sm" />
                    </div>
                </div>
                <span className="rating-modal-review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                </span>
            </div>
            {review.comment && (
                <p className="rating-modal-review-comment">{review.comment}</p>
            )}

            {/* Display review photos if available */}
            {review.photos && Array.isArray(review.photos) && review.photos.length > 0 && (
                <div className="mt-3">
                    <PhotoGallery photos={review.photos} />
                </div>
            )}
        </div>
    );
}
