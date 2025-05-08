import React, { useState } from 'react';
import { FaTag, FaChevronDown } from 'react-icons/fa';
import TagCategoryCollapsible from './TagCategoryCollapsible';

/**
 * CollapsibleFilterByTags component for displaying tag filters with collapsible functionality
 * 
 * @param {Object} props
 * @param {Array} props.availableTags - Array of all available tags
 * @param {Array} props.selectedTagIds - Array of selected tag IDs
 * @param {Function} props.setSelectedTagIds - Function to update selected tag IDs
 * @param {Function} props.onTagsChange - Function to call when tags change
 * @param {string} props.className - Additional CSS classes
 */
export default function CollapsibleFilterByTags({
    availableTags = [],
    selectedTagIds = [],
    setSelectedTagIds,
    onTagsChange,
    className = ''
}) {
    // State for each category's expanded status
    const [expandedCategories, setExpandedCategories] = useState({});

    // Define category display names
    const categoryNames = {
        'road_characteristic': 'Road Characteristics',
        'surface_type': 'Surface Types',
        'scenery': 'Scenery Types',
        'experience': 'Experience Types',
        'vehicle': 'Vehicle Suitability',
        'other': 'Other Tags'
    };

    // Group tags by category
    const groupTagsByCategory = () => {
        const filteredTags = availableTags.filter(tag => !selectedTagIds.includes(tag.id));
        const groupedTags = filteredTags.reduce((acc, tag) => {
            const category = tag.type || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(tag);
            return acc;
        }, {});
        return groupedTags;
    };

    // Get category name
    const getCategoryName = (category) => {
        return categoryNames[category] || category.replace('_', ' ');
    };

    // Toggle category expanded state
    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Handle tag selection
    const handleTagSelect = (tag) => {
        const newTags = [...selectedTagIds, tag.id];
        setSelectedTagIds(newTags);
        if (onTagsChange) {
            onTagsChange(newTags);
        }
    };

    return (
        <div className={`filter-by-tags ${className}`}>
            <h3 className="text-sm font-medium mb-2">Filter by Tags</h3>
            
            {availableTags.length === 0 ? (
                <div className="text-sm text-gray-500">No tags available</div>
            ) : (
                <div className="space-y-2">
                    {/* Group tags by category */}
                    {Object.entries(groupTagsByCategory()).map(([category, tags]) => {
                        if (tags.length === 0) return null;
                        
                        const isExpanded = expandedCategories[category] !== false; // Default to expanded
                        
                        return (
                            <div key={category} className="mb-2">
                                <div 
                                    className="text-xs font-medium text-gray-700 mb-1 flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleCategory(category)}
                                >
                                    <span>{getCategoryName(category)}</span>
                                    <FaChevronDown
                                        className={`ml-1 text-xs transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                                    />
                                </div>
                                
                                {isExpanded && (
                                    <div className="border rounded p-2 bg-white">
                                        <div className={`tag-category-${category}`}>
                                            <TagCategoryCollapsible
                                                tags={tags}
                                                onTagSelect={handleTagSelect}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
