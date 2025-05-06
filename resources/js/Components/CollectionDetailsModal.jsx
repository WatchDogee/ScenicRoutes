import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaFolder, FaRoad, FaUser } from 'react-icons/fa';
import Portal from './Portal';
import RoadCard from './RoadCard';

export default function CollectionDetailsModal({ isOpen, onClose, collectionId }) {
    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && collectionId) {
            fetchCollectionDetails();
        }
    }, [isOpen, collectionId]);

    const fetchCollectionDetails = async () => {
        try {
            setLoading(true);

            // Use the public endpoint to fetch collection details
            const response = await axios.get(`/api/public/collections/${collectionId}`);
            setCollection(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching collection details:', error);
            setError('Failed to load collection details');
        } finally {
            setLoading(false);
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
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4"
                onClick={handleModalClick}
            >
                <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={handleModalClick}
                >
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-semibold">Collection Details</h2>
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
                                <div className="flex items-center mb-6">
                                    {collection.cover_image ? (
                                        <img
                                            src={`/storage/${collection.cover_image}`}
                                            alt={collection.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                            <FaFolder className="text-gray-400 text-2xl" />
                                        </div>
                                    )}

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
                                    </div>
                                </div>

                                {collection.description && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                                        <p className="text-gray-600">{collection.description}</p>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Roads in this Collection</h4>
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
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                Collection not found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    );
}
