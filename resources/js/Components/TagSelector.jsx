import React from 'react';
import { FaTimes, FaTag } from 'react-icons/fa';

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
    // Only keep the handleRemoveTag function for removing tags
    const handleRemoveTag = (tagId) => {
        const updatedTags = selectedTags.filter(tag => tag.id !== tagId);
        onTagsChange(updatedTags);
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


            </div>


        </div>
    );
}
