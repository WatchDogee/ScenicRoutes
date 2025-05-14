import React, { useState, useEffect } from 'react';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
import PhotoGallery from './PhotoGallery';
import UserMention from './UserMention';
export default function ReviewCard({ review, onViewUser }) {
    const [hasValidPhotos, setHasValidPhotos] = useState(false);
    
    
    useEffect(() => {
        if (review.photos && Array.isArray(review.photos)) {
            
            review.photos.forEach((photo, index) => {
                if (photo) {
                }
            });
            const validPhotos = review.photos.filter(photo => photo && photo.photo_url);
            setHasValidPhotos(validPhotos.length > 0);
            if (validPhotos.length === 0 && review.photos.length > 0) {
            }
        } else {
            setHasValidPhotos(false);
        }
    }, [review.photos, review.id]);
    return (
        <div className="rating-modal-review-card">
            <div className="rating-modal-review-header">
                <ProfilePicture user={review.user} />
                <div className="rating-modal-review-user-info">
                    <p className="rating-modal-review-username">
                        {review.user ? (
                            <UserMention
                                user={review.user}
                                onViewUser={onViewUser}
                            />
                        ) : (
                            'Unknown User'
                        )}
                    </p>
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
            {$1}
            {hasValidPhotos && (
                <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Review Photos</h4>
                    <PhotoGallery photos={review.photos} />
                </div>
            )}
        </div>
    );
}
