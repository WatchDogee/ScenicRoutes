import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTimes, FaFolder, FaRoad, FaUser, FaPlus, FaCamera, FaImage, FaTag, FaStar } from 'react-icons/fa';
import Portal from './Portal';
import RoadCard from './RoadCard';
import TagSelector from './TagSelector';
import StarRating from './StarRating';
import CollectionRatingModal from './CollectionRatingModal';

export default function CollectionDetailsModal({ isOpen, onClose, collectionId, onCollectionUpdated }) {
    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        description: '',
        is_public: false
    });
    const [showAddRoadModal, setShowAddRoadModal] = useState(false);
    const [availableRoads, setAvailableRoads] = useState([]);
    const [selectedRoadIds, setSelectedRoadIds] = useState([]);
    const [addingRoads, setAddingRoads] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
    const [showCoverImageModal, setShowCoverImageModal] = useState(false);
    const [collectionTags, setCollectionTags] = useState([]);
    const [isTagsUpdating, setIsTagsUpdating] = useState(false);
    const fileInputRef = useRef(null);

    // Get current user ID from window object
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        // Get the current user ID from the window object
        if (window.userId) {
            setCurrentUserId(window.userId);
        }
    }, []);

    useEffect(() => {
        if (isOpen && collectionId) {
            fetchCollectionDetails();
        }
    }, [isOpen, collectionId]);

    // Update editData when collection changes
    useEffect(() => {
        if (collection) {
            setEditData({
                name: collection.name || '',
                description: collection.description || '',
                is_public: collection.is_public || false
            });

            // Set collection tags
            if (collection.tags) {
                setCollectionTags(collection.tags);
            } else {
                setCollectionTags([]);
            }
        }
    }, [collection]);

    const fetchCollectionDetails = async () => {
        try {
            setLoading(true);

            // Use the public endpoint to fetch collection details
            const response = await axios.get(`/api/public/collections/${collectionId}`);
            console.log('Collection details:', response.data);
            console.log('Collection user_id:', response.data.user_id);
            console.log('Collection user:', response.data.user);
            console.log('Current user ID:', currentUserId);
            setCollection(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching collection details:', error);
            setError('Failed to load collection details');
        } finally {
            setLoading(false);
        }
    };

    const handleEditCollection = async () => {
        try {
            setLoading(true);

            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Update the collection
            const response = await axios.put(
                `/api/collections/${collectionId}`,
                editData,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            // Update the local collection state
            console.log('Edit collection response:', response.data);
            setCollection(response.data.collection);
            setIsEditing(false);
            setError(null);

            // Notify parent component that collection was updated
            if (onCollectionUpdated) {
                onCollectionUpdated();
            }
        } catch (error) {
            console.error('Error updating collection:', error);
            setError('Failed to update collection');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableRoads = async () => {
        try {
            setLoading(true);

            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Fetch user's saved roads
            const response = await axios.get('/api/saved-roads', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filter out roads that are already in the collection
            const collectionRoadIds = collection.roads?.map(road => road.id) || [];
            const filteredRoads = response.data.filter(road => !collectionRoadIds.includes(road.id));

            setAvailableRoads(filteredRoads);
            setError(null);
        } catch (error) {
            console.error('Error fetching available roads:', error);
            setError('Failed to fetch available roads');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRoadsToCollection = async () => {
        if (selectedRoadIds.length === 0) return;

        try {
            setAddingRoads(true);

            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Add roads to collection
            const response = await axios.post(
                `/api/collections/${collectionId}/roads`,
                { road_ids: selectedRoadIds },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            console.log('Add roads response:', response.data);

            // Update the local collection state
            setCollection(response.data.collection);
            setShowAddRoadModal(false);
            setSelectedRoadIds([]);
            setError(null);

            // Notify parent component that collection was updated
            if (onCollectionUpdated) {
                onCollectionUpdated();
            }
        } catch (error) {
            console.error('Error adding roads to collection:', error);
            setError('Failed to add roads to collection');
        } finally {
            setAddingRoads(false);
        }
    };

    const handleViewRoad = (road) => {
        // Dispatch event to view road on map
        const event = new CustomEvent('viewRoadOnMap', {
            detail: { road }
        });
        window.dispatchEvent(event);
        onClose();
    };

    const handleNavigateRoad = (road) => {
        // Dispatch event to navigate to road
        const event = new CustomEvent('navigateToRoad', {
            detail: { road }
        });
        window.dispatchEvent(event);
    };

    const handleRateCollection = () => {
        setShowRatingModal(true);
    };

    const handleSubmitReview = (rating, comment, updatedCollection) => {
        console.log('Review submitted:', { rating, comment });
        setShowRatingModal(false);

        // Update the collection with the new rating data
        if (updatedCollection) {
            setCollection(updatedCollection);

            // Call the parent's onCollectionUpdated if provided
            if (onCollectionUpdated) {
                onCollectionUpdated(updatedCollection);
            }
        }
    };

    const handleCoverImageChange = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name, file.type, file.size);
            setCoverImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCoverImageUpload = async () => {
        if (!coverImage || !collection) {
            console.log('No cover image or collection found', { coverImage, collection });
            setError('No image selected or collection not found');
            return;
        }

        try {
            setUploadingCoverImage(true);
            setError(null);

            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Authentication token not found');
                setError('Authentication token not found. Please log in again.');
                return;
            }

            console.log('Uploading cover image for collection:', collectionId);
            console.log('Image file:', coverImage);

            // Create form data
            const formData = new FormData();
            formData.append('cover_image', coverImage);

            // Log FormData contents for debugging
            for (let pair of formData.entries()) {
                console.log('FormData entry:', pair[0], pair[1]);
            }

            // Set explicit content type boundary to ensure proper multipart/form-data handling
            const boundary = Math.random().toString().substr(2);

            // Upload the cover image with explicit content type
            const response = await fetch(`/api/collections/${collectionId}/cover-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Let the browser set the content type with boundary
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Cover image upload response:', data);

            // Update the local collection state
            setCollection(data.collection);
            setShowCoverImageModal(false);
            setCoverImage(null);
            setCoverImagePreview(null);

            // Notify parent component that collection was updated
            if (onCollectionUpdated) {
                onCollectionUpdated();
            }

            // Show success message
            alert('Cover image uploaded successfully!');
        } catch (error) {
            console.error('Error uploading cover image:', error);

            let errorMessage = 'Failed to upload cover image';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
            alert('Error uploading cover image: ' + errorMessage);
        } finally {
            setUploadingCoverImage(false);
        }
    };

    const handleViewRoadDetails = (roadId) => {
        // Dispatch event to view road details
        const event = new CustomEvent('viewRoadDetails', {
            detail: { roadId }
        });
        window.dispatchEvent(event);
    };

    const handleTagsChange = async (tags) => {
        if (!collection || !currentUserId || collection.user_id != currentUserId) {
            return; // Only the collection owner can update tags
        }

        try {
            setIsTagsUpdating(true);
            setError(null);

            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Update tags on the server
            const response = await axios.post(`/api/collections/${collectionId}/tags`, {
                tags: tags.map(tag => tag.id)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state
            setCollectionTags(response.data.collection.tags || []);
            setCollection(response.data.collection);

            // Notify parent component that collection was updated
            if (onCollectionUpdated) {
                onCollectionUpdated();
            }
        } catch (error) {
            console.error('Error updating collection tags:', error);
            setError('Failed to update tags');
        } finally {
            setIsTagsUpdating(false);
        }
    };

    // Stop propagation of events to prevent closing the parent modal
    const handleModalClick = (e) => {
        console.log('Collection details modal clicked');
        e.preventDefault(); // Prevent default to avoid navigation
        e.stopPropagation(); // Stop propagation to prevent closing parent modal
    };

    if (!isOpen) return null;

    return (
        <Portal rootId="collection-details-modal-root">
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[20000] p-4"
                onClick={handleModalClick}
                style={{ pointerEvents: 'auto' }}
            >
                <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={handleModalClick}
                    style={{ pointerEvents: 'auto' }}
                >
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-semibold">
                            {isEditing ? 'Edit Collection' : 'Collection Details'}
                        </h2>
                        <div className="flex items-center gap-2">
                            {!isEditing && collection && currentUserId &&
                              // Check if the current user is the owner of the collection
                              ((collection.user_id && collection.user_id == currentUserId) ||
                               (collection.user && collection.user.id == currentUserId)) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold shadow-md"
                                >
                                    Edit
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isEditing) {
                                        setIsEditing(false);
                                        // Reset edit data
                                        if (collection) {
                                            setEditData({
                                                name: collection.name || '',
                                                description: collection.description || '',
                                                is_public: collection.is_public || false
                                            });
                                        }
                                    } else {
                                        onClose();
                                    }
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    <div className="p-4">
                        {loading ? (
                            <div className="text-center py-8">Loading collection details...</div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-500">
                                {error}
                                <button
                                    onClick={fetchCollectionDetails}
                                    className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : collection ? (
                            <>
                                {isEditing ? (
                                    <div className="mb-6">
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            handleEditCollection();
                                        }}>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Collection Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editData.name}
                                                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                                                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={editData.description}
                                                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                                                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                                    rows="4"
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={editData.is_public}
                                                        onChange={(e) => setEditData({...editData, is_public: e.target.checked})}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Make this collection public</span>
                                                </label>
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Tags
                                                </label>
                                                <TagSelector
                                                    selectedTags={collectionTags}
                                                    onTagsChange={undefined}
                                                    entityType="collection"
                                                    readOnly={true}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Tags help others find your collection
                                                </p>
                                            </div>

                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        // Reset edit data
                                                        if (collection) {
                                                            setEditData({
                                                                name: collection.name || '',
                                                                description: collection.description || '',
                                                                is_public: collection.is_public || false
                                                            });
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center mb-6">
                                            <div className="relative">
                                                {collection.cover_image ? (
                                                    <img
                                                        src={`/storage/${collection.cover_image}`}
                                                        alt={collection.name}
                                                        className="w-24 h-24 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                                                        <FaFolder className="text-gray-400 text-3xl" />
                                                    </div>
                                                )}

                                                {collection.user_id == currentUserId && (
                                                    <button
                                                        onClick={() => setShowCoverImageModal(true)}
                                                        className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700"
                                                        title="Change cover image"
                                                    >
                                                        <FaCamera size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="ml-4 flex-1">
                                                <h3 className="text-xl font-semibold">{collection.name}</h3>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <FaUser className="mr-1" />
                                                    <span>Created by {collection.user?.name || 'Unknown'}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600 mt-1">
                                                    <FaRoad className="mr-1" />
                                                    <span>{collection.roads?.length || 0} roads</span>
                                                </div>
                                                {collection.average_rating ? (
                                                    <div className="flex items-center mt-1">
                                                        <StarRating rating={typeof collection.average_rating === 'number' ? collection.average_rating : 0} readOnly size="sm" />
                                                        <span className="ml-1 text-sm text-gray-600">
                                                            ({collection.reviews_count || 0} reviews)
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="ml-auto">
                                                <button
                                                    onClick={handleRateCollection}
                                                    className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center"
                                                >
                                                    <FaStar className="mr-1" /> Rate
                                                </button>
                                            </div>
                                        </div>

                                        {collection.description && (
                                            <div className="mb-6">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                                                <p className="text-gray-600">{collection.description}</p>
                                            </div>
                                        )}

                                        {/* Tags Section */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                                            <TagSelector
                                                selectedTags={collectionTags}
                                                onTagsChange={undefined}
                                                entityType="collection"
                                                readOnly={true}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-medium text-gray-700">Roads in this Collection</h4>
                                        {collection.user_id == currentUserId && (
                                            <button
                                                onClick={() => {
                                                    fetchAvailableRoads();
                                                    setShowAddRoadModal(true);
                                                }}
                                                className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md"
                                            >
                                                <FaPlus className="mr-1" /> Add Roads
                                            </button>
                                        )}
                                    </div>
                                    {collection.roads && collection.roads.length > 0 ? (
                                        <div className="space-y-4">
                                            {collection.roads.map(road => {
                                                // Add error boundary for each road card
                                                try {
                                                    return (
                                                        <RoadCard
                                                            key={road.id}
                                                            road={road}
                                                            showUser={false}
                                                            onViewMap={handleViewRoad}
                                                            onNavigate={handleNavigateRoad}
                                                            onViewDetails={() => handleViewRoadDetails(road.id)}
                                                        />
                                                    );
                                                } catch (error) {
                                                    console.error("Error rendering road card:", error, road);
                                                    return (
                                                        <div key={road.id} className="border rounded-lg p-4 bg-white">
                                                            <h3 className="font-semibold text-lg">{road.road_name || 'Unnamed Road'}</h3>
                                                            <p className="text-sm text-red-500">Error displaying road details</p>
                                                        </div>
                                                    );
                                                }
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-500 py-4">
                                            This collection doesn't have any roads yet.
                                        </p>
                                    )}
                                </div>

                                {/* Cover Image Modal */}
                                {showCoverImageModal && (
                                    <div
                                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[40000] p-4"
                                        style={{ pointerEvents: 'auto' }}
                                        onClick={(e) => {
                                            // Prevent clicks on the overlay from closing the modal
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <div
                                            className="bg-white rounded-lg shadow-xl w-full max-w-md"
                                            style={{ pointerEvents: 'auto' }}
                                            onClick={(e) => {
                                                // Prevent clicks on the container from propagating to the overlay
                                                e.stopPropagation();
                                            }}
                                        >
                                            <div className="p-4 border-b">
                                                <div className="flex justify-between items-center">
                                                    <h2 className="text-xl font-semibold">Change Cover Image</h2>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setShowCoverImageModal(false);
                                                            setCoverImage(null);
                                                            setCoverImagePreview(null);
                                                        }}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4">
                                                <div className="mb-4">
                                                    {coverImagePreview ? (
                                                        <div className="relative w-full h-48 bg-gray-100 rounded overflow-hidden mb-2">
                                                            <img
                                                                src={coverImagePreview}
                                                                alt="Cover preview"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    setCoverImage(null);
                                                                    setCoverImagePreview(null);
                                                                }}
                                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                                                title="Remove image"
                                                            >
                                                                <FaTimes size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="w-full h-48 bg-gray-100 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200"
                                                            onClick={() => fileInputRef.current?.click()}
                                                        >
                                                            <FaImage className="text-gray-400 text-4xl mb-2" />
                                                            <p className="text-gray-500">Click to select an image</p>
                                                        </div>
                                                    )}

                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleCoverImageChange}
                                                        accept="image/*"
                                                        className="hidden"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            // Explicitly trigger the file input click
                                                            if (fileInputRef.current) {
                                                                fileInputRef.current.click();
                                                            } else {
                                                                console.error("File input reference is null");
                                                            }
                                                        }}
                                                        className="mt-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center justify-center"
                                                    >
                                                        <FaCamera className="mr-2" /> {coverImagePreview ? 'Change Photo' : 'Upload Photo'}
                                                    </button>
                                                </div>

                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setShowCoverImageModal(false);
                                                            setCoverImage(null);
                                                            setCoverImagePreview(null);
                                                        }}
                                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleCoverImageUpload();
                                                        }}
                                                        disabled={!coverImage || uploadingCoverImage}
                                                        className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                                                            !coverImage || uploadingCoverImage
                                                                ? 'bg-blue-400 cursor-not-allowed'
                                                                : 'bg-blue-600 hover:bg-blue-700'
                                                        }`}
                                                    >
                                                        {uploadingCoverImage ? 'Uploading...' : 'Save Cover Image'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Add Roads Modal */}
                                {showAddRoadModal && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[20000] p-4">
                                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                            <div className="p-4 border-b">
                                                <div className="flex justify-between items-center">
                                                    <h2 className="text-xl font-semibold">Add Roads to Collection</h2>
                                                    <button
                                                        onClick={() => setShowAddRoadModal(false)}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4">
                                                {loading ? (
                                                    <div className="text-center py-8">Loading available roads...</div>
                                                ) : error ? (
                                                    <div className="text-center py-8 text-red-500">
                                                        {error}
                                                        <button
                                                            onClick={fetchAvailableRoads}
                                                            className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                                                        >
                                                            Try Again
                                                        </button>
                                                    </div>
                                                ) : availableRoads.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-500">
                                                        You don't have any additional roads to add to this collection.
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="mb-4 text-sm text-gray-600">
                                                            Select roads to add to this collection:
                                                        </p>

                                                        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                                                            {availableRoads.map(road => (
                                                                <div key={road.id} className="flex items-center p-2 border rounded hover:bg-gray-50">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`road-${road.id}`}
                                                                        checked={selectedRoadIds.includes(road.id)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedRoadIds([...selectedRoadIds, road.id]);
                                                                            } else {
                                                                                setSelectedRoadIds(selectedRoadIds.filter(id => id !== road.id));
                                                                            }
                                                                        }}
                                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                    />
                                                                    <label htmlFor={`road-${road.id}`} className="ml-2 flex-1 cursor-pointer">
                                                                        <div className="font-medium">{road.road_name || 'Unnamed Road'}</div>
                                                                        <div className="text-xs text-gray-500">
                                                                            Length: {(road.length / 1000).toFixed(2)} km •
                                                                            {road.is_public ? ' Public' : ' Private'}
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                onClick={() => setShowAddRoadModal(false)}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleAddRoadsToCollection}
                                                                disabled={selectedRoadIds.length === 0 || addingRoads}
                                                                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                                                                    selectedRoadIds.length === 0 || addingRoads
                                                                        ? 'bg-blue-400 cursor-not-allowed'
                                                                        : 'bg-blue-600 hover:bg-blue-700'
                                                                }`}
                                                            >
                                                                {addingRoads ? 'Adding...' : `Add ${selectedRoadIds.length} Road${selectedRoadIds.length !== 1 ? 's' : ''}`}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                Collection not found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Collection Rating Modal */}
            {showRatingModal && collection && (
                <CollectionRatingModal
                    isOpen={showRatingModal}
                    onClose={() => setShowRatingModal(false)}
                    onSubmit={handleSubmitReview}
                    collection={collection}
                    auth={{ user: { id: currentUserId } }}
                />
            )}
        </Portal>
    );
}
