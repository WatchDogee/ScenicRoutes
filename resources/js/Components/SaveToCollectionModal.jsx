import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaTimes, FaFolder } from 'react-icons/fa';
import Portal from './Portal';
export default function SaveToCollectionModal({
    isOpen,
    onClose,
    roadToAdd,
    onSuccess,
    onCreateNew
}) {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);
    const [addingToCollection, setAddingToCollection] = useState(false);
    useEffect(() => {
        if (isOpen) {
            fetchCollections();
        }
    }, [isOpen]);
    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/collections');
            setCollections(response.data);
            setError(null);
        } catch (error) {
            setError('Failed to load your collections');
        } finally {
            setLoading(false);
        }
    };
    const handleAddToCollection = async () => {
        if (!selectedCollectionId) {
            alert('Please select a collection');
            return;
        }
        try {
            setAddingToCollection(true);
            
            const response = await axios.post(`/api/collections/${selectedCollectionId}/roads`, {
                road_ids: [roadToAdd.id]
            });
            if (onSuccess) {
                onSuccess(response.data.collection);
            }
            onClose();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to add road to collection');
        } finally {
            setAddingToCollection(false);
        }
    };
    const handleCreateNew = () => {
        
        const roadData = { ...roadToAdd };
        
        onClose();
        
        setTimeout(() => {
            
            if (onCreateNew) {
                onCreateNew(roadData);
            }
        }, 300); 
    };
    
    const filteredCollections = collections.filter(collection =>
        collection.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!isOpen) return null;
    return (
        <Portal rootId="save-to-collection-modal-root">
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000000]"
                onClick={onClose}
                style={{ pointerEvents: 'auto' }}
            >
                <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                    style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10000001 }}
                >
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-semibold">Save to Collection</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <FaTimes />
                        </button>
                    </div>
                    <div className="p-4">
                        {error && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                                {error}
                            </div>
                        )}
                        {$1}
                        <div className="mb-6 border-b pb-4">
                            <button
                                onClick={handleCreateNew}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                <FaPlus />
                                <span className="font-medium">Create New Collection</span>
                            </button>
                        </div>
                        {$1}
                        <div className="mb-4">
                            <div className="text-lg font-medium mb-2">Or add to existing collection:</div>
                            <input
                                type="text"
                                placeholder="Search your collections..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 border rounded mb-3"
                            />
                            {loading ? (
                                <div className="text-center py-4">Loading collections...</div>
                            ) : filteredCollections.length === 0 ? (
                                <div className="text-center py-4 bg-gray-50 rounded">
                                    <p className="text-gray-600">No collections found</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {filteredCollections.map(collection => (
                                        <div
                                            key={collection.id}
                                            className={`p-3 border rounded cursor-pointer ${
                                                selectedCollectionId === collection.id
                                                    ? 'bg-blue-50 border-blue-300'
                                                    : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => setSelectedCollectionId(collection.id)}
                                        >
                                            <div className="flex items-center">
                                                {collection.cover_image ? (
                                                    <img
                                                        src={`/storage/${collection.cover_image}`}
                                                        alt={collection.name}
                                                        className="w-10 h-10 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                        <FaFolder className="text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="ml-3">
                                                    <h4 className="font-medium">{collection.name}</h4>
                                                    <p className="text-xs text-gray-600">
                                                        {collection.roads?.length || 0} roads • {collection.is_public ? 'Public' : 'Private'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddToCollection}
                                disabled={!selectedCollectionId || addingToCollection}
                                className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed`}
                            >
                                {addingToCollection ? 'Adding...' : 'Add to Collection'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
