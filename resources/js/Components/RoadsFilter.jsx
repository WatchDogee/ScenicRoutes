import React, { useState } from 'react';
import { FaFilter, FaTimes, FaSearch } from 'react-icons/fa';

/**
 * Filter component for My Roads page
 * Allows filtering by road type (badge) and searching by name
 */
export default function RoadsFilter({
    searchQuery,
    setSearchQuery,
    selectedBadge,
    setSelectedBadge,
    loading
}) {
    const [showFilters, setShowFilters] = useState(false);

    const badges = [
        { id: 'all', label: 'All Types', color: 'bg-gray-100 text-gray-700' },
        { id: 'road', label: 'Saved Roads', color: 'bg-blue-100 text-blue-700' },
        { id: 'ride', label: 'Recorded Rides', color: 'bg-green-100 text-green-700' },
        { id: 'route', label: 'Planned Routes', color: 'bg-purple-100 text-purple-700' }
    ];

    return (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
            {/* Search Bar */}
            <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                        showFilters
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <FaFilter size={16} />
                    Filters
                </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
                <div className="pt-4 border-t">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Filter by Type:</p>
                    <div className="flex flex-wrap gap-2">
                        {badges.map(badge => (
                            <button
                                key={badge.id}
                                onClick={() => setSelectedBadge(badge.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                    selectedBadge === badge.id
                                        ? `${badge.color} ring-2 ring-offset-2`
                                        : `${badge.color} opacity-50 hover:opacity-75`
                                }`}
                            >
                                {badge.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
