import React, { useState } from 'react';
import { FaTimes, FaTag, FaChevronDown } from 'react-icons/fa';

/**
 * CollapsibleTagSelector component for displaying tags with collapsible functionality
 *
 * @param {Object} props
 * @param {Array} props.selectedTags - Array of currently selected tag objects
 * @param {Function} props.onTagsChange - Callback when tags are added/removed
 * @param {string} props.entityType - Type of entity ('road' or 'collection')
 * @param {boolean} props.readOnly - Whether the component is read-only (just for display)
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.initialVisibleTags - Number of tags to show initially before collapsing
 * @param {boolean} props.showCategoryHeaders - Whether to show category headers for tags
 * @param {boolean} props.alwaysCollapsible - Whether to always show collapse/expand button even with few tags
 * @param {string} props.title - Optional title to show above the tags
 */
export default function CollapsibleTagSelector({
    selectedTags = [],
    onTagsChange,
    entityType = 'road',
    readOnly = false,
    className = '',
    initialVisibleTags = 3,
    showCategoryHeaders = false,
    alwaysCollapsible = false,
    title = null
}) {
    const [expanded, setExpanded] = useState(false);

    // Only keep the handleRemoveTag function for removing tags
    const handleRemoveTag = (tagId) => {
        if (onTagsChange) {
            const updatedTags = selectedTags.filter(tag => tag.id !== tagId);
            onTagsChange(updatedTags);
        }
    };

    // Group tags by category if needed
    const groupTagsByCategory = () => {
        if (!showCategoryHeaders) return { 'all': selectedTags };

        return selectedTags.reduce((acc, tag) => {
            const category = tag.type || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(tag);
            return acc;
        }, {});
    };

    // Define category display names
    const categoryNames = {
        'road_characteristic': 'Road Characteristics',
        'surface_type': 'Surface Types',
        'scenery': 'Scenery Types',
        'experience': 'Experience Types',
        'vehicle': 'Vehicle Suitability',
        'other': 'Other Tags'
    };

    // Get visible tags based on expanded state
    const getVisibleTags = () => {
        if (expanded || (selectedTags.length <= initialVisibleTags && !alwaysCollapsible)) {
            return selectedTags;
        }
        return selectedTags.slice(0, initialVisibleTags);
    };

    const visibleTags = getVisibleTags();
    const hasMoreTags = selectedTags.length > initialVisibleTags;
    const shouldShowCollapseButton = hasMoreTags || alwaysCollapsible;
    const groupedTags = groupTagsByCategory();

    return (
        <div className={`tag-selector ${className}`}>
            {/* Title if provided */}
            {title && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{title}</span>
                    {selectedTags.length > 0 && alwaysCollapsible && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                            {expanded ? 'Collapse' : 'Expand'}
                            <FaChevronDown
                                className={`ml-1 text-xs transition-transform ${expanded ? 'transform rotate-180' : ''}`}
                            />
                        </button>
                    )}
                </div>
            )}

            {/* Selected Tags */}
            {!showCategoryHeaders ? (
                <div className="flex flex-wrap gap-1 mb-1">
                    {visibleTags.map(tag => (
                        <div
                            key={tag.id}
                            className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                tag.type ? `tag-${tag.type}` : 'bg-blue-100 text-blue-800'
                            }`}
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
                                    <FaTimes size={10} />
                                </button>
                            )}
                        </div>
                    ))}

                    {shouldShowCollapseButton && !title && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                            {expanded ? 'Show Less' : hasMoreTags ? `+${selectedTags.length - initialVisibleTags} more` : 'Show All'}
                            <FaChevronDown
                                className={`ml-1 text-xs transition-transform ${expanded ? 'transform rotate-180' : ''}`}
                            />
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-1">
                    {Object.entries(groupedTags).map(([category, tags]) => {
                        if (tags.length === 0) return null;

                        return (
                            <div key={category} className="mb-1">
                                {category !== 'all' && (
                                    <div className="text-xs font-medium text-gray-700 mb-0.5">
                                        {categoryNames[category] || category}:
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-1">
                                    {(expanded ? tags : tags.slice(0, initialVisibleTags)).map(tag => (
                                        <div
                                            key={tag.id}
                                            className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                tag.type ? `tag-${tag.type}` : 'bg-blue-100 text-blue-800'
                                            }`}
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
                                                    <FaTimes size={10} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {category !== 'all' && tags.length > initialVisibleTags && !expanded && (
                                        <button
                                            onClick={() => setExpanded(true)}
                                            className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        >
                                            +{tags.length - initialVisibleTags} more
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {(hasMoreTags || alwaysCollapsible) && !title && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                            {expanded ? 'Show Less' : hasMoreTags ? 'Show All Tags' : 'Expand Tags'}
                            <FaChevronDown
                                className={`ml-1 text-xs transition-transform ${expanded ? 'transform rotate-180' : ''}`}
                            />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
