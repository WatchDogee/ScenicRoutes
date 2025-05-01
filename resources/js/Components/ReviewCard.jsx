import React from 'react';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';

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
        </div>
    );
}
