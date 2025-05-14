import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaTimes, FaImage } from 'react-icons/fa';
import Portal from './Portal';
export default function CollectionModal({
    isOpen,
    onClose,
    collection = null,
    roadToAdd = null,
    onSuccess
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRoads, setSelectedRoads] = useState([]);
    const [availableRoads, setAvailableRoads] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        if (collection) {
            setName(collection.name || '');
            setDescription(collection.description || '');
            setIsPublic(collection.is_public || false);
            setCoverImagePreview(collection.cover_image ? `/storage/${collection.cover_image}` : null);
            if (collection.roads) {
                setSelectedRoads(collection.roads.map(road => ({
                    id: road.id,
                    name: road.road_name,
                    order: road.pivot.order
                })));
            }
        } else {
            
            setName('');
            setDescription('');
            setIsPublic(false);
            setCoverImage(null);
            setCoverImagePreview(null);
            setSelectedRoads([]);
        }
        
        if (roadToAdd && roadToAdd.id) {
            
            setTimeout(() => {
                setSelectedRoads(prev => {
                    
                    if (!prev.find(r => r.id === roadToAdd.id)) {
                        return [...prev, {
                            id: roadToAdd.id,
                            name: roadToAdd.road_name,
                            order: prev.length
                        }];
                    }
                    return prev;
                });
            }, 100);
        } else if (roadToAdd) {
        }
        
        fetchUserRoads();
    }, [collection, roadToAdd, isOpen]);
    const fetchUserRoads = async () => {
        try {
            const response = await axios.get('/api/saved-roads');
            setAvailableRoads(response.data);
        } catch (error) {
            setError('Failed to load your saved roads');
        }
    };
    const handleCoverImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverImage(file);
            setCoverImagePreview(URL.createObjectURL(file));
        }
    };
    const handleAddRoad = (road) => {
        if (!selectedRoads.find(r => r.id === road.id)) {
            setSelectedRoads([...selectedRoads, {
                id: road.id,
                name: road.road_name,
                order: selectedRoads.length
            }]);
        }
    };
    const handleRemoveRoad = (roadId) => {
        setSelectedRoads(selectedRoads.filter(road => road.id !== roadId));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('is_public', isPublic ? '1' : '0');
        if (coverImage) {
            formData.append('cover_image', coverImage);
        }
        
        selectedRoads.forEach((road, index) => {
            formData.append(`road_ids[${index}]`, road.id);
        });
        try {
            let response;
            if (collection) {
                
                response = await axios.post(`/api/collections/${collection.id}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-HTTP-Method-Override': 'PUT'
                    }
                });
            } else {
                
                response = await axios.post('/api/collections', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }
            if (onSuccess) {
                onSuccess(response.data.collection);
            }
            onClose();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to save collection');
        } finally {
            setLoading(false);
        }
    };
    
    const filteredRoads = availableRoads.filter(road =>
        road.road_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!isOpen) return null;
    
    const handleModalClick = (e) => {
        e.stopPropagation();
    };
    return (
        <Portal rootId="collection-modal-root">
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4"
                onClick={handleModalClick}
            >
                <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={handleModalClick}
                >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold">
                        {collection ? 'Edit Collection' : 'Create New Collection'}
                    </h2>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <FaTimes />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Collection Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                e.stopPropagation();
                                setName(e.target.value);
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => {
                                e.stopPropagation();
                                setDescription(e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full p-2 border rounded"
                            rows="3"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setIsPublic(e.target.checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mr-2"
                            />
                            <span>Make this collection public</span>
                        </label>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Cover Image</label>
                        <div className="flex items-center space-x-4">
                            {coverImagePreview && (
                                <div className="w-24 h-24 relative">
                                    <img
                                        src={coverImagePreview}
                                        alt="Cover preview"
                                        className="w-full h-full object-cover rounded"
                                    />
                                </div>
                            )}
                            <label className="flex items-center px-4 py-2 bg-gray-200 rounded cursor-pointer hover:bg-gray-300">
                                <FaImage className="mr-2" />
                                <span>{coverImagePreview ? 'Change Image' : 'Select Image'}</span>
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleCoverImageChange(e);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </label>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Roads in Collection</label>
                        <div className="border rounded p-2 mb-2 max-h-40 overflow-y-auto">
                            {selectedRoads.length === 0 ? (
                                <p className="text-gray-500 text-center py-2">No roads added yet</p>
                            ) : (
                                <ul className="space-y-1">
                                    {selectedRoads.map((road) => (
                                        <li key={road.id} className="flex justify-between items-center p-1 hover:bg-gray-100 rounded">
                                            <span>{road.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRoad(road.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <FaTimes />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="mt-2">
                            <label className="block text-gray-700 mb-2">Add Roads</label>
                            <input
                                type="text"
                                placeholder="Search your roads..."
                                value={searchTerm}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setSearchTerm(e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full p-2 border rounded mb-2"
                            />
                            <div className="border rounded p-2 max-h-40 overflow-y-auto">
                                {filteredRoads.length === 0 ? (
                                    <p className="text-gray-500 text-center py-2">No roads found</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {filteredRoads.map((road) => (
                                            <li
                                                key={road.id}
                                                className={`flex justify-between items-center p-1 hover:bg-gray-100 rounded ${
                                                    selectedRoads.some(r => r.id === road.id) ? 'bg-blue-50' : ''
                                                }`}
                                            >
                                                <span>{road.road_name}</span>
                                                {!selectedRoads.some(r => r.id === road.id) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddRoad(road)}
                                                        className="text-blue-500 hover:text-blue-700"
                                                    >
                                                        <FaPlus />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="px-4 py-2 border rounded hover:bg-gray-100"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                            disabled={loading || !name}
                        >
                            {loading ? 'Saving...' : (collection ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </Portal>
    );
}
