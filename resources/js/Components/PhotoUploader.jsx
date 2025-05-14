import React, { useState, useRef, useEffect } from 'react';
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
    const [uniqueId] = useState(`photo-upload-${Math.random().toString(36).substring(2, 11)}`);
    
    const photoArray = Array.isArray(existingPhotos) ? existingPhotos : [];
    const handleSelectPhoto = () => {
        
        const tempFileInput = document.createElement('input');
        tempFileInput.type = 'file';
        tempFileInput.accept = 'image/jpeg,image/png,image/gif,image/jpg';
        tempFileInput.style.display = 'none';
        
        document.body.appendChild(tempFileInput);
        
        tempFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) {
                document.body.removeChild(tempFileInput);
                return;
            }
            
            if (photoArray.length >= maxPhotos) {
                setError(`Maximum of ${maxPhotos} photos allowed. Please delete some photos before adding more.`);
                document.body.removeChild(tempFileInput);
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                setError('File size exceeds 5MB limit.');
                document.body.removeChild(tempFileInput);
                return;
            }
            
            if (!['image/jpeg', 'image/png', 'image/gif', 'image/jpg'].includes(file.type)) {
                setError('Only JPEG, PNG, and GIF images are allowed.');
                document.body.removeChild(tempFileInput);
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
                
                setCaption('');
            } catch (error) {
                setError(error.response?.data?.message || 'Failed to upload photo. Please try again.');
            } finally {
                setUploading(false);
                
                document.body.removeChild(tempFileInput);
            }
        });
        
        tempFileInput.click();
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
                        <button
                            type="button"
                            onClick={handleSelectPhoto}
                            disabled={uploading || photoArray.length >= maxPhotos}
                            className={`px-4 py-2 rounded-md cursor-pointer inline-block text-center min-w-[120px] ${
                                uploading || photoArray.length >= maxPhotos
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 hover:shadow-md active:bg-blue-700'
                            } text-white transition-all duration-200`}
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
