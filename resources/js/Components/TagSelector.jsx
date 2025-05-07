import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaPlus, FaTag } from 'react-icons/fa';

/**
 * TagSelector component for selecting and managing tags
 *
 * @param {Object} props
 * @param {Array} props.selectedTags - Array of currently selected tag objects
 * @param {Function} props.onTagsChange - Callback when tags are added/removed
 * @param {string} props.entityType - Type of entity ('road' or 'collection')
 * @param {boolean} props.readOnly - Whether the component is read-only (just for display)
 * @param {string} props.className - Additional CSS classes
 */
export default function TagSelector({
    selectedTags = [],
    onTagsChange,
    entityType = 'road',
    readOnly = false,
    className = ''
}) {
    const [availableTags, setAvailableTags] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showTagSelector, setShowTagSelector] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    // Fetch available tags on mount
    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get('/api/tags');
            setAvailableTags(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching tags:', error);
            setError('Failed to load tags');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTag = (tag) => {
        // Check if tag is already selected
        if (!selectedTags.find(t => t.id === tag.id)) {
            const updatedTags = [...selectedTags, tag];
            onTagsChange(updatedTags);
        }
        setShowTagSelector(false);
    };

    const handleRemoveTag = (tagId) => {
        const updatedTags = selectedTags.filter(tag => tag.id !== tagId);
        onTagsChange(updatedTags);
    };

    // Custom tag creation is disabled - this function is no longer used
    const handleCreateTag = async () => {
        setError('Creating custom tags is not allowed. Please use one of the predefined tags.');
        setTimeout(() => {
            setError(null);
        }, 3000);
    };

    // Filter available tags based on search query and already selected tags
    const filteredTags = availableTags
        .filter(tag => !selectedTags.find(t => t.id === tag.id))
        .filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Group tags by category for better organization
    const groupedTags = filteredTags.reduce((acc, tag) => {
        const category = tag.type || 'other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(tag);
        return acc;
    }, {});

    // Define category display names and order
    const categoryOrder = [
        'road_characteristic',
        'surface_type',
        'scenery',
        'experience',
        'vehicle',
        'other'
    ];

    const categoryNames = {
        'road_characteristic': 'Road Characteristics',
        'surface_type': 'Surface Types',
        'scenery': 'Scenery Types',
        'experience': 'Experience Types',
        'vehicle': 'Vehicle Suitability',
        'other': 'Other Tags'
    };

    return (
        <div className={`tag-selector ${className}`}>
            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tag => (
                    <div
                        key={tag.id}
                        className={`flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            tag.type ? `tag-${tag.type}` : 'bg-blue-100 text-blue-800'
                        }`}
                        style={{ boxShadow: '0 0 0 2px currentColor' }}
                        title={tag.description || ''}
                    >
                        <FaTag className="mr-1 text-xs" />
                        <span>{tag.name}</span>
                        {!readOnly && (
                            <button
                                onClick={() => handleRemoveTag(tag.id)}
                                className="ml-1 hover:text-red-600"
                                aria-label={`Remove ${tag.name} tag`}
                            >
                                <FaTimes size={12} />
                            </button>
                        )}
                    </div>
                ))}

                {!readOnly && (
                    <button
                        onClick={() => setShowTagSelector(true)}
                        className="flex items-center bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-sm text-gray-700"
                    >
                        <FaPlus className="mr-1 text-xs" />
                        <span>Add Tag</span>
                    </button>
                )}
            </div>

            {/* Tag Selector Dropdown */}
            {showTagSelector && !readOnly && (
                <div className="absolute z-10 mt-1 w-64 bg-white border rounded-md shadow-lg">
                    <div className="p-2 border-b">
                        <input
                            type="text"
                            placeholder="Search tags..."
                            className="w-full px-2 py-1 border rounded"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-2 text-center text-gray-500">Loading tags...</div>
                        ) : Object.keys(groupedTags).length > 0 ? (
                            <div className="py-1">
                                {categoryOrder.map(category => {
                                    const tags = groupedTags[category];
                                    if (!tags || tags.length === 0) return null;

                                    return (
                                        <div key={category} className="mb-2">
                                            <div className={`px-4 py-1 text-xs font-semibold bg-gray-100 text-gray-700 uppercase tracking-wider tag-${category}`}>
                                                {categoryNames[category]}
                                            </div>
                                            {tags.map(tag => (
                                                <button
                                                    key={tag.id}
                                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center tag-${tag.type}`}
                                                    onClick={() => handleAddTag(tag)}
                                                >
                                                    <FaTag className="mr-2" />
                                                    <span>{tag.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-2 text-center text-gray-500">
                                No matching tags found
                            </div>
                        )}
                    </div>

                    {/* Error message section */}
                    <div className="p-2 border-t">
                        {error && (
                            <p className="text-red-500 text-xs mt-1">{error}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Please select from the predefined tags above.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
