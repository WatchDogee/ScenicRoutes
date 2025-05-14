import React, { useState } from 'react';
import { FaTag, FaChevronDown } from 'react-icons/fa';
$1
export default function TagCategoryCollapsible({ 
    tags, 
    onTagSelect, 
    selectedTagIds = [], 
    initialVisibleCount = 5 
}) {
    const [expanded, setExpanded] = useState(false);
    const hasMoreTags = tags.length > initialVisibleCount;
    
    const visibleTags = expanded ? tags : tags.slice(0, initialVisibleCount);
    return (
        <div className="tag-category-collapsible">
            <div className="flex flex-wrap gap-1">
                {visibleTags.map(tag => (
                    <button
                        key={tag.id}
                        type="button"
                        className={`px-2 py-1 rounded text-xs ${
                            selectedTagIds.includes(tag.id) 
                                ? 'bg-blue-500 text-white' 
                                : tag.type 
                                    ? `tag-${tag.type}` 
                                    : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        onClick={() => onTagSelect(tag)}
                        title={tag.description || ''}
                    >
                        <FaTag className="inline mr-1 text-xs" />
                        {tag.name}
                    </button>
                ))}
                {hasMoreTags && (
                    <button
                        type="button"
                        className="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 flex items-center tag-expand-button"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? 'Show Less' : `+${tags.length - initialVisibleCount} more`}
                        <FaChevronDown
                            className={`ml-1 text-xs transition-transform ${expanded ? 'transform rotate-180' : ''}`}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}
