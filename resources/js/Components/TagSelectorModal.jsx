import React, { useState, useEffect } from 'react';
import { FaTag, FaTimes, FaChevronDown } from 'react-icons/fa';
import axios from 'axios';
import Portal from './Portal';
$1
export default function TagSelectorModal({
    isOpen,
    onClose,
    selectedTags = [],
    onTagsChange,
    entityType = 'road'
}) {
    const [availableTags, setAvailableTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState({});
    
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
    
    useEffect(() => {
        const fetchTags = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/api/tags');
                setAvailableTags(response.data);
                
                const initialExpandedState = {};
                response.data.forEach(tag => {
                    if (tag.type) {
                        initialExpandedState[tag.type] = true;
                    }
                });
                setExpandedCategories(initialExpandedState);
                setError(null);
            } catch (error) {
                setError('Failed to load tags. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        if (isOpen) {
            fetchTags();
        }
    }, [isOpen]);
    
    const tagsByCategory = availableTags.reduce((acc, tag) => {
        const category = tag.type || 'other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(tag);
        return acc;
    }, {});
    
    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };
    
    const isTagSelected = (tagId) => {
        return selectedTags.some(tag => tag.id === tagId);
    };
    
    const handleTagSelect = (tag) => {
        if (isTagSelected(tag.id)) {
            
            const updatedTags = selectedTags.filter(t => t.id !== tag.id);
            onTagsChange(updatedTags);
        } else {
            
            const updatedTags = [...selectedTags, tag];
            onTagsChange(updatedTags);
        }
    };
    if (!isOpen) {
        return null;
    }
    return (
        <Portal rootId="tag-selector-modal-root">
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[40000] p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Select Tags</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Close"
                        >
                            <FaTimes />
                        </button>
                    </div>
                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-4">Loading tags...</div>
                    ) : error ? (
                        <div className="text-center py-4 text-red-500">{error}</div>
                    ) : (
                        <>
                            {$1}
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTags.length > 0 ? (
                                        selectedTags.map(tag => (
                                            <div
                                                key={tag.id}
                                                className={`flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                                    tag.type ? `tag-${tag.type}` : 'bg-blue-100 text-blue-800'
                                                }`}
                                                title={tag.description || ''}
                                            >
                                                <FaTag className="mr-1 text-xs" />
                                                <span>{tag.name}</span>
                                                <button
                                                    onClick={() => handleTagSelect(tag)}
                                                    className="ml-1 hover:text-red-600"
                                                    aria-label={`Remove ${tag.name} tag`}
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500">No tags selected</p>
                                    )}
                                </div>
                            </div>
                            {$1}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Available Tags</h3>
                                {$1}
                                {categoryOrder.map(category => {
                                    const tags = tagsByCategory[category] || [];
                                    if (tags.length === 0) return null;
                                    const isExpanded = expandedCategories[category];
                                    return (
                                        <div key={category} className="mb-3">
                                            <div
                                                className="flex justify-between items-center p-2 bg-gray-100 rounded cursor-pointer"
                                                onClick={() => toggleCategory(category)}
                                            >
                                                <h4 className="text-sm font-medium">{categoryNames[category] || category}</h4>
                                                <FaChevronDown className={`transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                                            </div>
                                            {isExpanded && (
                                                <div className="p-2 border border-gray-200 rounded-b mt-1">
                                                    <div className="flex flex-wrap gap-2">
                                                        {tags.map(tag => (
                                                            <button
                                                                key={tag.id}
                                                                type="button"
                                                                className={`flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                                                    isTagSelected(tag.id)
                                                                        ? 'bg-blue-500 text-white'
                                                                        : tag.type
                                                                            ? `tag-${tag.type}`
                                                                            : 'bg-gray-100 hover:bg-gray-200'
                                                                }`}
                                                                onClick={() => handleTagSelect(tag)}
                                                                title={tag.description || ''}
                                                            >
                                                                <FaTag className="mr-1 text-xs" />
                                                                <span>{tag.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
        </Portal>
    );
}
