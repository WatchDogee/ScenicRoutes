import React, { useState } from 'react';
import { FaTimes, FaMapMarkerAlt, FaGasPump, FaBolt, FaGlobe, FaPhone, FaClock, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import StarRating from './StarRating';

export default function PoiDetails({ poi, onClose }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleSubmitReview = (e) => {
        e.preventDefault();

        if (rating === 0) {
            alert('Please select a rating');
            return;
        }

        // In a real app, this would send the review to the server
        alert('Review functionality is not implemented in this demo version.');

        // Reset form
        setRating(0);
        setComment('');
    };

    const getPoiIcon = () => {
        switch (poi.type) {
            case 'tourism':
                return <FaMapMarkerAlt className="text-blue-500 text-xl" />;
            case 'fuel':
                return <FaGasPump className="text-red-500 text-xl" />;
            case 'charging':
                return <FaBolt className="text-green-500 text-xl" />;
            default:
                return <FaMapMarkerAlt className="text-gray-500 text-xl" />;
        }
    };

    const formatSubtype = (subtype) => {
        return subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (!poi) return null;

    const properties = poi.properties || {};

    return (
        <div className="poi-details bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b z-10">
                <h3 className="text-xl font-semibold flex items-center">
                    {getPoiIcon()}
                    <span className="ml-2">{poi.name}</span>
                </h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-white bg-blue-500 hover:bg-blue-600 p-2 rounded-md transition-colors flex items-center justify-center"
                        aria-label={isCollapsed ? "Expand POI details" : "Collapse POI details"}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? (
                            <div className="flex items-center">
                                <FaChevronDown size={16} />
                                <span className="ml-1 text-sm">Expand</span>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <FaChevronUp size={16} />
                                <span className="ml-1 text-sm">Collapse</span>
                            </div>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="text-white bg-red-500 hover:bg-red-600 p-2 rounded-md transition-colors flex items-center justify-center"
                        aria-label="Close POI details"
                        title="Close"
                    >
                        <div className="flex items-center">
                            <FaTimes size={16} />
                            <span className="ml-1 text-sm">Close</span>
                        </div>
                    </button>
                </div>
            </div>

            <div className={`transition-all duration-300 ${isCollapsed ? 'h-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
                <div className="mb-4">
                    <p className="text-sm text-gray-600">{formatSubtype(poi.subtype)}</p>

                    {poi.description && (
                        <p className="mt-2">{poi.description}</p>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-2">
                        {properties.website && (
                            <p className="flex items-center">
                                <FaGlobe className="mr-2 text-gray-600" />
                                <a href={properties.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    Website
                                </a>
                            </p>
                        )}

                        {properties.phone && (
                            <p className="flex items-center">
                                <FaPhone className="mr-2 text-gray-600" />
                                {properties.phone}
                            </p>
                        )}

                        {properties.opening_hours && (
                            <p className="flex items-center">
                                <FaClock className="mr-2 text-gray-600" />
                                {properties.opening_hours}
                            </p>
                        )}
                    </div>

                    {/* Type-specific details */}
                    {poi.type === 'fuel' && (
                        <div className="mt-3">
                            {properties.brand && <p><strong>Brand:</strong> {properties.brand}</p>}
                            {properties.operator && <p><strong>Operator:</strong> {properties.operator}</p>}

                            {properties.fuel_types && properties.fuel_types.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-semibold">Fuel Types:</p>
                                    <ul className="list-disc list-inside">
                                        {properties.fuel_types.map((type, index) => (
                                            <li key={index}>{formatSubtype(type)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {poi.type === 'charging' && (
                        <div className="mt-3">
                            {properties.operator && <p><strong>Operator:</strong> {properties.operator}</p>}
                            {properties.network && <p><strong>Network:</strong> {properties.network}</p>}
                            {properties.maxpower && <p><strong>Max Power:</strong> {properties.maxpower}</p>}
                            {properties.fee && <p><strong>Fee:</strong> {properties.fee}</p>}

                            <div className="mt-2">
                                <p className="font-semibold">Connectors:</p>
                                <ul className="list-disc list-inside">
                                    {properties['socket:type2'] && <li>Type 2</li>}
                                    {properties['socket:chademo'] && <li>CHAdeMO</li>}
                                    {properties['socket:ccs'] && <li>CCS</li>}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reviews section */}
                <div className="mb-4">
                    <h4 className="font-semibold mb-2">Reviews</h4>
                    <p className="text-sm text-gray-500">No reviews yet</p>
                </div>

                {/* Add review form */}
                <div>
                    <h4 className="font-semibold mb-2">Add Your Review</h4>
                    <form onSubmit={handleSubmitReview}>
                        <div className="mb-3">
                            <label className="block mb-1">Rating</label>
                            <StarRating
                                rating={rating}
                                maxRating={5}
                                interactive={true}
                                onRatingChange={setRating}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="block mb-1">Comment (optional)</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                rows="3"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || rating === 0}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                        >
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
