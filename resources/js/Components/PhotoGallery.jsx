import React, { useState } from 'react';
import axios from 'axios';
export default function PhotoGallery({
    photos = [],
    onPhotoDeleted,
    canDelete = false,
    className = ''
}) {
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);
    const handlePhotoClick = (photo) => {
        setSelectedPhoto(photo);
    };
    const handleClose = () => {
        setSelectedPhoto(null);
    };
    const handleDelete = async (photoId, photoType) => {
        if (!canDelete) return;
        if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
            return;
        }
        setDeleting(true);
        setError(null);
        try {
            const endpoint = photoType === 'road'
                ? `/api/road-photos/${photoId}`
                : `/api/review-photos/${photoId}`;
            await axios.delete(endpoint);
            if (onPhotoDeleted) {
                onPhotoDeleted(photoId, photoType);
            }
            if (selectedPhoto?.id === photoId) {
                setSelectedPhoto(null);
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to delete photo. Please try again.');
        } finally {
            setDeleting(false);
        }
    };
    
    const photoArray = Array.isArray(photos) ? photos : [];
    
    const processedPhotoArray = photoArray.map(photo => {
        if (!photo) return null;
        
        if (!photo.photo_url && photo.photo_path) {
            
            return {
                ...photo,
                photo_url: `/storage/${photo.photo_path}`
            };
        }
        return photo;
    }).filter(Boolean); 
    
    const validPhotoArray = processedPhotoArray.filter(photo => photo && photo.photo_url);
    
    if (validPhotoArray.length === 0 && photoArray.length > 0) {
        
        
        photoArray.forEach((photo, index) => {
            if (!photo || !photo.photo_url) {
                if (photo) {
                }
            }
        });
    }
    if (validPhotoArray.length === 0) {
        return (
            <div className={`text-center text-gray-500 py-4 ${className}`}>
                No photos available
            </div>
        );
    }
    return (
        <div className={className}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {validPhotoArray.map((photo) => (
                    <div
                        key={photo.id}
                        className="relative aspect-square overflow-hidden rounded-md cursor-pointer group"
                        onClick={() => handlePhotoClick(photo)}
                    >
                        <img
                            src={photo.photo_url}
                            alt={photo.caption || 'Photo'}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs truncate">
                                {photo.caption}
                            </div>
                        )}
                        {canDelete && (
                            <button
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(photo.id, photo.review_id ? 'review' : 'road');
                                }}
                                disabled={deleting}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {$1}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
                        <button
                            className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center"
                            onClick={handleClose}
                        >
                            ✕
                        </button>
                        <div className="h-[80vh] flex items-center justify-center bg-black">
                            <img
                                src={selectedPhoto.photo_url}
                                alt={selectedPhoto.caption || 'Photo'}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                        {selectedPhoto.caption && (
                            <div className="p-4 bg-white">
                                <p className="text-gray-800">{selectedPhoto.caption}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

