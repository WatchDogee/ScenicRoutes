import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import ProfilePicture from './ProfilePicture';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import PhotoGallery from './PhotoGallery';
import PhotoUploader from './PhotoUploader';
import TempPhotoUploader from './TempPhotoUploader';
import TagSelector from './TagSelector';
import WeatherDisplay from './WeatherDisplay';
import UserMention from './UserMention';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
import Portal from './Portal';
export default function RatingModal({ isOpen, onClose, onSubmit, road, auth, initialRating = 0, initialComment = '' }) {
    const { userSettings } = useContext(UserSettingsContext);
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState(initialComment);
    const [roadPhotos, setRoadPhotos] = useState([]);
    const [reviewPhotos, setReviewPhotos] = useState({});
    const [userReviewId, setUserReviewId] = useState(null);
    const [tempReviewPhotos, setTempReviewPhotos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTags, setSelectedTags] = useState([]);
    const [isTagsUpdating, setIsTagsUpdating] = useState(false);

    
    const handleViewUser = (user) => {
        if (user && user.id) {
            
            const event = new CustomEvent('viewUserProfile', {
                detail: { userId: user.id }
            });
            window.dispatchEvent(event);
        }
    };
    useEffect(() => {
        if (isOpen && road) {
            try {
                
                setRoadPhotos(road.photos || []);
                
                const reviewPhotosMap = {};
                if (road.reviews) {
                    road.reviews.forEach(review => {
                        if (review.photos && review.photos.length > 0) {
                            
                            const validPhotos = review.photos.filter(photo => photo && photo.photo_url);
                            if (validPhotos.length > 0) {
                                reviewPhotosMap[review.id] = validPhotos;
                            }
                        }
                    });
                }
                setReviewPhotos(reviewPhotosMap);
                
                if (road.tags) {
                    setSelectedTags(road.tags);
                } else {
                    setSelectedTags([]);
                }
                
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
                
                setRoadPhotos([]);
                setReviewPhotos({});
                setSelectedTags([]);
                setRating(initialRating);
                setComment(initialComment);
                setUserReviewId(null);
            }
        }
    }, [isOpen, road, auth.user?.id, initialRating, initialComment]);
    if (!isOpen || !road) return null;
    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsSubmitting(true);
        try {
            
            if (tempReviewPhotos.length > 0) {
                const formData = new FormData();
                formData.append('rating', rating);
                if (comment) formData.append('comment', comment);
                
                tempReviewPhotos.forEach((photo, index) => {
                    formData.append(`photos[${index}]`, photo.file);
                    if (photo.caption) formData.append(`captions[${index}]`, photo.caption);
                });
                
                const response = await axios.post(`/api/saved-roads/${road.id}/review`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                if (response.data.road) {
                    
                    
                    setTimeout(() => {
                        onClose();
                    }, 0);
                }
            } else {
                
                
                setTimeout(() => {
                    onSubmit(rating, comment);
                }, 0);
            }
        } catch (error) {
            
            
            setTimeout(() => {
                onSubmit(rating, comment);
            }, 0);
        } finally {
            setIsSubmitting(false);
            setTempReviewPhotos([]);
        }
    };
    const handleRoadPhotoUploaded = (data) => {
        if (data.photo && data.road) {
            
            setRoadPhotos([...roadPhotos, data.photo]);
        }
    };
    const handleReviewPhotoUploaded = (data) => {
        if (data.photo && data.review) {
            
            const updatedReviewPhotos = { ...reviewPhotos };
            if (!updatedReviewPhotos[data.review.id]) {
                updatedReviewPhotos[data.review.id] = [];
            }
            
            if (!data.photo.photo_url && data.photo.photo_path) {
                
                data.photo.photo_url = `/storage/${data.photo.photo_path}`;
            }
            updatedReviewPhotos[data.review.id] = [...updatedReviewPhotos[data.review.id], data.photo];
            setReviewPhotos(updatedReviewPhotos);
        }
    };
    const handlePhotoDeleted = (photoId, photoType) => {
        if (photoType === 'road') {
            
            setRoadPhotos(roadPhotos.filter(photo => photo.id !== photoId));
        } else if (photoType === 'review') {
            
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
        
        const rating = road.average_rating || road.reviews_avg_rating;
        if (rating !== undefined && rating !== null && !isNaN(parseFloat(rating))) {
            return `${parseFloat(rating).toFixed(1)} ★`;
        }
        
        if (road.reviews && Array.isArray(road.reviews) && road.reviews.length > 0) {
            const sum = road.reviews.reduce((total, review) => {
                const reviewRating = parseFloat(review.rating);
                return total + (isNaN(reviewRating) ? 0 : reviewRating);
            }, 0);
            return `${(sum / road.reviews.length).toFixed(1)} ★`;
        }
        return 'No ratings yet';
    };
    const handleTagsChange = async (tags) => {
        if (!auth?.user || auth.user.id !== road.user?.id) {
            return; 
        }
        try {
            setIsTagsUpdating(true);
            
            const response = await axios.post(`/api/saved-roads/${road.id}/tags`, {
                tags: tags.map(tag => tag.id)
            });
            
            setSelectedTags(response.data.road.tags || []);
            
            if (response.data.road) {
                
                const event = new CustomEvent('roadUpdated', {
                    detail: { road: response.data.road }
                });
                window.dispatchEvent(event);
            }
        } catch (error) {
        } finally {
            setIsTagsUpdating(false);
        }
    };
    return (
        <Portal rootId="rating-modal-root">
            <div
                className="rating-modal-overlay"
                style={{
                    zIndex: 999999,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto'
                }}
                onClick={(e) => {
                    
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }}
            >
                <div
                    className="rating-modal-container"
                    style={{
                        maxWidth: '800px',
                        width: '90%',
                        position: 'relative',
                        zIndex: 1000000,
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        pointerEvents: 'auto'
                    }}
                    onClick={(e) => {
                        
                        e.preventDefault();
                        e.stopPropagation();
                    }}
            >
                <div className="rating-modal-header">
                    <div>
                        <h2 className="rating-modal-title">{road.road_name}</h2>
                        <p className="rating-modal-subtitle">
                            Added by {road.user ? (
                                <UserMention
                                    user={road.user}
                                    onViewUser={handleViewUser}
                                />
                            ) : 'Unknown User'}
                        </p>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const event = new CustomEvent('viewRoadOnMap', {
                                    detail: { road }
                                });
                                window.dispatchEvent(event);
                                onClose();
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold shadow-md mr-2"
                        >
                            View on Map
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const event = new CustomEvent('navigateToRoad', {
                                    detail: { road }
                                });
                                window.dispatchEvent(event);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold shadow-md mr-2"
                        >
                            Navigate
                        </button>
                        {$1}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const event = new CustomEvent('saveRoadToCollection', {
                                    detail: { road }
                                });
                                window.dispatchEvent(event);
                            }}
                            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-bold shadow-md mr-2"
                        >
                            Save to Collection
                        </button>
                        {auth?.user?.id === road.user?.id && (
                            <button
                                onClick={() => {
                                    
                                    const event = new CustomEvent('editRoad', {
                                        detail: { road }
                                    });
                                    window.dispatchEvent(event);
                                    onClose();
                                }}
                                className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-bold shadow-md mr-4"
                            >
                                Edit Road
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                            }}
                            className="rating-modal-close-button"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div className="rating-modal-stats">
                    <div className="rating-modal-stats-grid">
                        <div>
                            <h3 className="rating-modal-stats-title">Road Statistics</h3>
                            <div className="rating-modal-stats-content space-y-2">
                                <p>Length: {(road.length / 1000).toFixed(2)} km</p>
                                <p>Corners: {road.corner_count}</p>
                                <p>Average Rating: {getAverageRating()}</p>
                                {$1}
                                <div className="mt-2">
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Current Weather</h4>
                                    <WeatherDisplay
                                        roadId={road.id}
                                        units={userSettings?.measurement_units === 'imperial' ? 'imperial' : 'metric'}
                                        className="bg-gray-50 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="rating-modal-stats-title">Description</h3>
                            <p className="rating-modal-stats-content">{road.description || 'No description provided.'}</p>
                        </div>
                    </div>
                    {$1}
                    <div className="mt-4">
                        <h3 className="rating-modal-stats-title">Tags</h3>
                        <div className="mt-2">
                            <TagSelector
                                selectedTags={selectedTags}
                                onTagsChange={auth?.user?.id === road.user?.id ? handleTagsChange : undefined}
                                entityType="road"
                                readOnly={auth?.user?.id !== road.user?.id}
                            />
                        </div>
                    </div>
                </div>
                {$1}
                <div className="mb-6">
                    <h3 className="rating-modal-section-title">Road Photos</h3>
                    <PhotoGallery
                        photos={roadPhotos}
                        onPhotoDeleted={handlePhotoDeleted}
                        canDelete={auth.user?.id === road.user?.id}
                    />
                    {$1}
                    <PhotoUploader
                        endpoint={`/api/saved-roads/${road.id}/photos`}
                        onPhotoUploaded={handleRoadPhotoUploaded}
                        existingPhotos={roadPhotos}
                        className="mt-4"
                    />
                </div>
                <div className="rating-modal-review-section">
                    <h3 className="rating-modal-section-title">Add Your Review</h3>
                    {auth?.user ? (
                        <>
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
                            {$1}
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Add Photos to Your Review</h4>
                                {$1}
                                {userReviewId && reviewPhotos[userReviewId] && reviewPhotos[userReviewId].length > 0 && (
                                    <PhotoGallery
                                        photos={reviewPhotos[userReviewId]}
                                        onPhotoDeleted={handlePhotoDeleted}
                                        canDelete={true}
                                        className="mb-3"
                                    />
                                )}
                                {$1}
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
                        </>
                    ) : (
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <p className="text-blue-800 mb-2">You need to be logged in to leave reviews.</p>
                            <p className="text-sm text-gray-600">You can still view all road details and reviews.</p>
                        </div>
                    )}
                </div>
                <div className="rating-modal-reviews-section">
                    <h3 className="rating-modal-section-title">Community Reviews</h3>
                    <div className="rating-modal-reviews-list">
                        {road.reviews && road.reviews.length > 0 ? (
                            road.reviews.map((review) => {
                                
                                const reviewWithPhotos = {
                                    ...review,
                                    photos: reviewPhotos[review.id] || review.photos || []
                                };
                                return <ReviewCard
                                    key={review.id}
                                    review={reviewWithPhotos}
                                    onViewUser={handleViewUser}
                                />;
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
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        className="rating-modal-cancel-button"
                    >
                        {auth?.user ? 'Cancel' : 'Close'}
                    </button>
                    {auth?.user && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSubmit(e);
                            }}
                            disabled={rating === 0 || isSubmitting}
                            className={`rating-modal-submit-button ${
                                rating === 0 || isSubmitting ? 'rating-modal-submit-button-disabled' : 'rating-modal-submit-button-enabled'
                            }`}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                    )}
                </div>
                </div>
            </div>
        </Portal>
    );
}