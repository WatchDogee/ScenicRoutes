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
    const [newTagName, setNewTagName] = useState('');
    const [showNewTagForm, setShowNewTagForm] = useState(false);
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

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        try {
            setIsLoading(true);
            const response = await axios.post('/api/tags', {
                name: newTagName,
                type: entityType
            });
            
            // Add the new tag to available tags
            setAvailableTags([...availableTags, response.data.tag]);
            
            // Select the new tag
            handleAddTag(response.data.tag);
            
            // Reset form
            setNewTagName('');
            setShowNewTagForm(false);
            setError(null);
        } catch (error) {
            console.error('Error creating tag:', error);
            setError(error.response?.data?.message || 'Failed to create tag');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter available tags based on search query and already selected tags
    const filteredTags = availableTags
        .filter(tag => !selectedTags.find(t => t.id === tag.id))
        .filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className={`tag-selector ${className}`}>
            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tag => (
                    <div 
                        key={tag.id} 
                        className={`flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm ${
                            tag.type ? `tag-${tag.type}` : ''
                        }`}
                    >
                        <FaTag className="mr-1 text-xs" />
                        <span>{tag.name}</span>
                        {!readOnly && (
                            <button 
                                onClick={() => handleRemoveTag(tag.id)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
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
                    
                    <div className="max-h-48 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-2 text-center text-gray-500">Loading tags...</div>
                        ) : filteredTags.length > 0 ? (
                            <div className="py-1">
                                {filteredTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                                        onClick={() => handleAddTag(tag)}
                                    >
                                        <FaTag className="mr-2 text-blue-500" />
                                        <span>{tag.name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-2 text-center text-gray-500">
                                No matching tags found
                            </div>
                        )}
                    </div>
                    
                    {/* Create New Tag */}
                    <div className="p-2 border-t">
                        {showNewTagForm ? (
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    placeholder="New tag name..."
                                    className="w-full px-2 py-1 border rounded mb-2"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                />
                                <div className="flex justify-between">
                                    <button
                                        onClick={() => setShowNewTagForm(false)}
                                        className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateTag}
                                        disabled={isLoading || !newTagName.trim()}
                                        className={`px-2 py-1 text-sm rounded ${
                                            isLoading || !newTagName.trim()
                                                ? 'bg-blue-300 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                    >
                                        {isLoading ? 'Creating...' : 'Create Tag'}
                                    </button>
                                </div>
                                {error && (
                                    <p className="text-red-500 text-xs mt-1">{error}</p>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowNewTagForm(true)}
                                className="w-full text-left px-2 py-1 text-blue-600 hover:text-blue-800 flex items-center"
                            >
                                <FaPlus className="mr-2" />
                                <span>Create new tag</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
