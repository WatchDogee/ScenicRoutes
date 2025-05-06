import React, { useState, useRef } from 'react';
import { FaPlus, FaTimes, FaImage } from 'react-icons/fa';

export default function TempPhotoUploader({
    onPhotoSelected,
    onPhotoRemoved,
    maxPhotos = 5,
    existingPhotos = [],
    className = ''
}) {
    const [error, setError] = useState(null);
    const [caption, setCaption] = useState('');
    const [tempPhotos, setTempPhotos] = useState([]);
    const fileInputRef = useRef(null);

    // Ensure existingPhotos is an array
    const photoArray = Array.isArray(existingPhotos) ? existingPhotos : [];
    
    // Total photos count (existing + temporary)
    const totalPhotosCount = photoArray.length + tempPhotos.length;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check if we've reached the maximum number of photos
        if (totalPhotosCount >= maxPhotos) {
            setError(`Maximum of ${maxPhotos} photos allowed. Please delete some photos before adding more.`);
            return;
        }

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size exceeds 5MB limit.');
            return;
        }

        // Check file type
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/jpg'].includes(file.type)) {
            setError('Only JPEG, PNG, and GIF images are allowed.');
            return;
        }

        // Create a temporary URL for preview
        const photoObject = {
            id: Date.now(), // Temporary ID
            file: file,
            caption: caption,
            previewUrl: URL.createObjectURL(file)
        };

        // Add to temporary photos
        setTempPhotos([...tempPhotos, photoObject]);
        
        // Call the parent component's callback
        if (onPhotoSelected) {
            onPhotoSelected(photoObject);
        }

        // Reset the caption
        setCaption('');
        
        // Reset the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        
        setError(null);
    };

    const handleRemovePhoto = (photoId) => {
        // Find the photo to remove
        const photoToRemove = tempPhotos.find(photo => photo.id === photoId);
        
        // Remove from temporary photos
        setTempPhotos(tempPhotos.filter(photo => photo.id !== photoId));
        
        // Call the parent component's callback
        if (onPhotoRemoved && photoToRemove) {
            onPhotoRemoved(photoToRemove);
        }
    };

    return (
        <div className={`temp-photo-uploader ${className}`}>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add Photo
                </label>
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Caption (optional)"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                        />
                    </div>
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={totalPhotosCount >= maxPhotos}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={totalPhotosCount >= maxPhotos}
                            className={`px-4 py-2 rounded-md ${
                                totalPhotosCount >= maxPhotos
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                            } text-white`}
                        >
                            Select Photo
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                <p className="text-gray-500 text-xs mt-1">
                    {totalPhotosCount} of {maxPhotos} photos used. Max file size: 5MB. Formats: JPEG, PNG, GIF
                </p>
            </div>

            {/* Display temporary photos */}
            {tempPhotos.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Photos</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {tempPhotos.map(photo => (
                            <div key={photo.id} className="relative group">
                                <div className="aspect-square overflow-hidden rounded border border-gray-200">
                                    <img 
                                        src={photo.previewUrl} 
                                        alt={photo.caption || "Photo preview"} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(photo.id)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <FaTimes size={12} />
                                </button>
                                {photo.caption && (
                                    <p className="text-xs text-gray-600 truncate mt-1">{photo.caption}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
