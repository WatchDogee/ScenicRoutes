import React from 'react';
import { FaMap, FaRoute, FaUsers, FaSearch } from 'react-icons/fa';

export default function EmptyState({ 
    icon = FaMap, 
    title, 
    description, 
    actionLabel, 
    onAction,
    iconSize = 'text-6xl'
}) {
    const Icon = icon;
    
    return (
        <div className="empty-state fade-in">
            <Icon className={`empty-state-icon ${iconSize}`} />
            {title && <h3 className="empty-state-title">{title}</h3>}
            {description && <p className="empty-state-description">{description}</p>}
            {actionLabel && onAction && (
                <div className="empty-state-action">
                    <button
                        onClick={onAction}
                        className="btn-primary"
                    >
                        {actionLabel}
                    </button>
                </div>
            )}
        </div>
    );
}

// Predefined empty states for common scenarios
export function EmptySavedRoads({ onFindRoads }) {
    return (
        <EmptyState
            icon={FaRoute}
            title="No saved roads yet"
            description="Start by finding some curved roads and save your favorites!"
            actionLabel="Find Curved Roads"
            onAction={onFindRoads}
        />
    );
}

export function EmptySearchResults({ onReset }) {
    return (
        <EmptyState
            icon={FaSearch}
            title="No roads found"
            description="Try adjusting your search filters or drop a marker in a different location."
            actionLabel="Reset Filters"
            onAction={onReset}
        />
    );
}

export function EmptyCommunityRoads({ onSearch }) {
    return (
        <EmptyState
            icon={FaUsers}
            title="No community roads found"
            description="Be the first to share a road in this area, or try searching in a different location."
            actionLabel="Search Again"
            onAction={onSearch}
        />
    );
}



