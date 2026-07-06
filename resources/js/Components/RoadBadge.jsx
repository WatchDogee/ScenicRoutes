import React from 'react';
import { FaMapMarkerAlt, FaRoad, FaBicycle } from 'react-icons/fa';

/**
 * Badge component to differentiate between roads, recorded rides, and routes
 */
export default function RoadBadge({ type, className = '' }) {
    const badges = {
        road: {
            label: 'Saved Road',
            bg: 'bg-blue-100',
            text: 'text-blue-700',
            icon: FaRoad,
            tooltip: 'Manually created road'
        },
        ride: {
            label: 'Recorded Ride',
            bg: 'bg-green-100',
            text: 'text-green-700',
            icon: FaBicycle,
            tooltip: 'GPS recorded from actual ride'
        },
        route: {
            label: 'Planned Route',
            bg: 'bg-purple-100',
            text: 'text-purple-700',
            icon: FaMapMarkerAlt,
            tooltip: 'Route planned with navigation'
        }
    };

    const badge = badges[type] || badges.road;
    const IconComponent = badge.icon;

    return (
        <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ${className}`}
            title={badge.tooltip}
        >
            <IconComponent size={12} />
            <span>{badge.label}</span>
        </div>
    );
}
