import React, { useState, useEffect } from 'react';
import { FaTimes, FaTag, FaPlus } from 'react-icons/fa';
import axios from 'axios';
$1
export default function TagSelector({
    selectedTags = [],
    onTagsChange,
    entityType = 'road',
    readOnly = false,
    className = ''
}) {
    const [availableTags, setAvailableTags] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        if (!readOnly) {
            fetchAvailableTags();
        }
    }, [readOnly]);
    const fetchAvailableTags = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await axios.get('/api/tags');
            setAvailableTags(response.data);
        } catch (err) {
            setError('Failed to load tags');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRemoveTag = (tagId) => {
        if (onTagsChange) {
            const updatedTags = selectedTags.filter(tag => tag.id !== tagId);
            onTagsChange(updatedTags);
        }
    };
    
    const handleAddTag = (tag) => {
        if (onTagsChange) {
            
            if (!selectedTags.some(t => t.id === tag.id)) {
                const updatedTags = [...selectedTags, tag];
                onTagsChange(updatedTags);
            }
        }
    };
    
    const unselectedTags = availableTags.filter(
        tag => !selectedTags.some(selectedTag => selectedTag.id === tag.id)
    );
    return (
        <div className={`tag-selector ${className}`}>
            {$1}
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
                        {!readOnly && onTagsChange && (
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
            </div>
            {$1}
            {!readOnly && onTagsChange && unselectedTags.length > 0 && (
                <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Add tags:</p>
                    <div className="flex flex-wrap gap-2">
                        {unselectedTags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => handleAddTag(tag)}
                                className={`flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800 transition-colors`}
                                title={tag.description || ''}
                            >
                                <FaPlus className="mr-1 text-xs" />
                                <span>{tag.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {$1}
            {isLoading && <p className="text-sm text-gray-500 mt-2">Loading tags...</p>}
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
    );
}
