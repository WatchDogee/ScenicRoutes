import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function PhotoUploader({
    onPhotoUploaded,
    endpoint,
    maxPhotos = 5,
    existingPhotos = [],
    className = ''
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [caption, setCaption] = useState('');
    const fileInputRef = useRef(null);

    // Ensure existingPhotos is an array
    const photoArray = Array.isArray(existingPhotos) ? existingPhotos : [];

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check if we've reached the maximum number of photos
        if (photoArray.length >= maxPhotos) {
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

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('photo', file);
        if (caption) formData.append('caption', caption);

        try {
            const response = await axios.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (onPhotoUploaded) {
                onPhotoUploaded(response.data);
            }

            // Reset the form
            setCaption('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            setError(error.response?.data?.message || 'Failed to upload photo. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`photo-uploader ${className}`}>
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
                            disabled={uploading}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || photoArray.length >= maxPhotos}
                            className={`px-4 py-2 rounded-md ${
                                uploading || photoArray.length >= maxPhotos
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                            } text-white`}
                        >
                            {uploading ? 'Uploading...' : 'Select Photo'}
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                <p className="text-gray-500 text-xs mt-1">
                    {photoArray.length} of {maxPhotos} photos used. Max file size: 5MB. Formats: JPEG, PNG, GIF
                </p>
            </div>
        </div>
    );
}
