import React, { useState } from 'react';
import { FaTag, FaChevronDown, FaFilter } from 'react-icons/fa';
import TagCategoryCollapsible from './TagCategoryCollapsible';
$1
export default function CollapsibleFilterByTags({
    availableTags = [],
    selectedTagIds = [],
    setSelectedTagIds,
    onTagsChange,
    className = ''
}) {
    
    const [isExpanded, setIsExpanded] = useState(false);
    
    const [expandedCategories, setExpandedCategories] = useState({});
    
    const categoryNames = {
        'road_characteristic': 'Road Characteristics',
        'surface_type': 'Surface Types',
        'scenery': 'Scenery Types',
        'experience': 'Experience Types',
        'vehicle': 'Vehicle Suitability',
        'other': 'Other Tags'
    };
    
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
    
    const getCategoryName = (category) => {
        return categoryNames[category] || category.replace('_', ' ');
    };
    
    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };
    
    const handleTagSelect = (tag) => {
        const newTags = [...selectedTagIds, tag.id];
        setSelectedTagIds(newTags);
        if (onTagsChange) {
            onTagsChange(newTags);
        }
    };
    
    const toggleFilterSection = () => {
        setIsExpanded(!isExpanded);
    };
    return (
        <div className={`filter-by-tags ${className}`}>
            {$1}
            <div
                className="flex justify-between items-center cursor-pointer p-2 bg-gray-100 rounded-md mb-2"
                onClick={toggleFilterSection}
            >
                <h3 className="text-sm font-medium flex items-center">
                    <FaFilter className="mr-2 text-gray-600" />
                    Filter by Tags {selectedTagIds.length > 0 && `(${selectedTagIds.length} selected)`}
                </h3>
                <FaChevronDown
                    className={`text-xs transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                />
            </div>
            {$1}
            {isExpanded && (
                availableTags.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">No tags available</div>
                ) : (
                    <div className="space-y-2 p-2 border rounded-md bg-gray-50">
                        {$1}
                        {Object.entries(groupTagsByCategory()).map(([category, tags]) => {
                            if (tags.length === 0) return null;
                            const isExpanded = expandedCategories[category] !== false; 
                            return (
                                <div key={category} className="mb-2">
                                    <div
                                        className="text-xs font-medium text-gray-700 mb-1 flex justify-between items-center cursor-pointer p-1 hover:bg-gray-100 rounded"
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
                )
            )}
            {$1}
            {!isExpanded && selectedTagIds.length > 0 && (
                <div className="text-xs text-blue-600 font-medium pl-2">
                    {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected
                </div>
            )}
        </div>
    );
}
