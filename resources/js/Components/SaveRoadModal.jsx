import React, { useState, useEffect } from 'react';
import axios from 'axios';
const SaveRoadModal = ({
    isOpen,
    onClose,
    roadData,
    onSave,
    auth,
    userSettings
}) => {
    const [roadName, setRoadName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [tags, setTags] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    const formatDistance = (meters) => {
        if (userSettings?.measurement_units === 'imperial') {
            return ((meters / 1000) * 0.621371).toFixed(2) + ' miles';
        }
        return (meters / 1000).toFixed(2) + ' km';
    };
    
    const formatElevation = (meters) => {
        if (userSettings?.measurement_units === 'imperial') {
            return Math.round(meters * 3.28084) + ' ft';
        }
        return Math.round(meters) + ' m';
    };
    
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await axios.get('/api/tags');
                if (response.data) {
                    setAvailableTags(response.data);
                }
            } catch (error) {
            }
        };
        if (isOpen) {
            fetchTags();
        }
    }, [isOpen]);
    
    const handleTagToggle = (tagId) => {
        if (selectedTags.includes(tagId)) {
            setSelectedTags(selectedTags.filter(id => id !== tagId));
        } else {
            setSelectedTags([...selectedTags, tagId]);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!roadName.trim()) {
            setError('Road name is required');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            
            const payload = {
                road_name: roadName,
                description: description,
                coordinates: roadData.coordinates,
                twistiness: roadData.twistiness,
                corner_count: roadData.corner_count,
                length: roadData.length,
                elevation_gain: roadData.elevation_gain,
                elevation_loss: roadData.elevation_loss,
                max_elevation: roadData.max_elevation,
                min_elevation: roadData.min_elevation,
                is_public: isPublic,
                tags: selectedTags.join(',')
            };
            
            const response = await axios.post('/api/saved-roads', payload, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            if (response.data) {
                onSave(response.data);
                onClose();
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to save road. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[30000] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Save Custom Road</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <span className="text-xl">✕</span>
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Road Name *
                            </label>
                            <input
                                type="text"
                                value={roadName}
                                onChange={(e) => setRoadName(e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="Enter road name"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="Enter road description"
                                rows="3"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-gray-700">Make this road public</span>
                            </label>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Tags
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => handleTagToggle(tag.id)}
                                        className={`px-3 py-1 rounded text-sm ${
                                            selectedTags.includes(tag.id)
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mb-6 bg-gray-100 p-4 rounded">
                            <h3 className="font-bold mb-2">Road Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Length:</p>
                                    <p className="font-semibold">{formatDistance(roadData.length)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Corners:</p>
                                    <p className="font-semibold">{roadData.corner_count}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Twistiness:</p>
                                    <p className="font-semibold">{roadData.twistiness.toFixed(6)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Elevation Gain:</p>
                                    <p className="font-semibold">{formatElevation(roadData.elevation_gain)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Elevation Loss:</p>
                                    <p className="font-semibold">{formatElevation(roadData.elevation_loss)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Max Elevation:</p>
                                    <p className="font-semibold">{formatElevation(roadData.max_elevation)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Road'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default SaveRoadModal;
