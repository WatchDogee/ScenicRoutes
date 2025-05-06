import React, { useState, useEffect } from 'react';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
import PhotoGallery from './PhotoGallery';

export default function ReviewCard({ review }) {
    const [hasValidPhotos, setHasValidPhotos] = useState(false);

    // Enhanced debugging for review photos
    console.log('Review photos in ReviewCard:', review.photos);

    // Check if the review has valid photos
    useEffect(() => {
        if (review.photos && Array.isArray(review.photos)) {
            // Log each photo to inspect its properties
            review.photos.forEach((photo, index) => {
                console.log(`Review ${review.id} - Photo ${index}:`, photo);
                if (photo) {
                    console.log(`  - photo_path: ${photo.photo_path}`);
                    console.log(`  - photo_url: ${photo.photo_url}`);
                }
            });

            const validPhotos = review.photos.filter(photo => photo && photo.photo_url);
            setHasValidPhotos(validPhotos.length > 0);
            console.log(`Review ${review.id} has ${validPhotos.length} valid photos`);

            if (validPhotos.length === 0 && review.photos.length > 0) {
                console.warn(`Review ${review.id} has photos but none have valid URLs`);
            }
        } else {
            console.log(`Review ${review.id} has no photos array`);
            setHasValidPhotos(false);
        }
    }, [review.photos, review.id]);

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
            {hasValidPhotos && (
                <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Review Photos</h4>
                    <PhotoGallery photos={review.photos} />
                </div>
            )}
        </div>
    );
}
