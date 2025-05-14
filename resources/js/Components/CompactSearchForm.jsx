import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaTag, FaChevronDown, FaSpinner, FaTimes } from 'react-icons/fa';
import CollapsibleTagSelector from './CollapsibleTagSelector';
export default function CompactSearchForm({
    searchType,
    searchQuery,
    setSearchQuery,
    selectedCountry,
    setSelectedCountry,
    selectedRegion,
    setSelectedRegion,
    countries,
    regions,
    loadingCountries,
    selectedTagIds,
    setSelectedTagIds,
    availableTags,
    handleSearch,
    isSearching,
    minRating,
    setMinRating,
    curvinessFilter,
    setCurvinessFilter,
    lengthFilter,
    setLengthFilter,
    sortBy,
    setSortBy
}) {
    const [showFilters, setShowFilters] = useState(false);
    
    const groupTagsByCategory = (tags) => {
        return tags.reduce((acc, tag) => {
            const category = tag.type || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(tag);
            return acc;
        }, {});
    };
    
    const categoryOrder = [
        'road_characteristic',
        'surface_type',
        'scenery',
        'experience',
        'vehicle',
        'other'
    ];
    const categoryNames = {
        'road_characteristic': 'Road Characteristics',
        'surface_type': 'Surface Types',
        'scenery': 'Scenery Types',
        'experience': 'Experience Types',
        'vehicle': 'Vehicle Suitability',
        'other': 'Other Tags'
    };
    return (
        <form onSubmit={handleSearch} className="space-y-2">
            {$1}
            <div className="flex items-center mb-2">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder={`Search ${searchType}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setSearchQuery('')}
                        >
                            <FaTimes size={12} />
                        </button>
                    )}
                </div>
                <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center"
                    disabled={isSearching}
                    onClick={(e) => {
                        e.preventDefault();
                        handleSearch(e);
                    }}
                >
                    {isSearching ? <FaSpinner className="animate-spin mr-1" /> : <FaSearch className="mr-1" />}
                    <span>Search</span>
                </button>
            </div>
            {$1}
            <div className="border rounded-md overflow-hidden mb-2 p-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                    {$1}
                    <div className="flex items-center gap-1">
                        <div>
                            <select
                                value={selectedCountry}
                                onChange={(e) => setSelectedCountry(e.target.value)}
                                className="px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                style={{ width: "100px" }}
                                title="Country"
                            >
                                <option value="">All Countries</option>
                                {loadingCountries ? (
                                    <option disabled>Loading...</option>
                                ) : (
                                    countries.map(country => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        {selectedCountry && (
                            <div>
                                <select
                                    value={selectedRegion}
                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                    className="px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    style={{ width: "90px" }}
                                    title="Region"
                                >
                                    <option value="">All Regions</option>
                                    {regions.map(region => (
                                        <option key={region} value={region}>
                                            {region}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    {$1}
                    {searchType === 'roads' && (
                        <div className="flex items-center gap-1">
                            <select
                                value={minRating}
                                onChange={(e) => setMinRating(Number(e.target.value))}
                                className="px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                style={{ width: "70px" }}
                                title="Minimum Rating"
                            >
                                <option value="0">Any ★</option>
                                <option value="3">3+★</option>
                                <option value="4">4+★</option>
                                <option value="4.5">4.5+★</option>
                            </select>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                style={{ width: "90px" }}
                                title="Sort By"
                            >
                                <option value="rating">By Rating</option>
                                <option value="newest">Newest</option>
                                <option value="popular">Popular</option>
                                <option value="length">Longest</option>
                            </select>
                        </div>
                    )}
                    {$1}
                    {searchType === 'roads' && (
                        <div className="flex items-center gap-1">
                            <select
                                value={lengthFilter}
                                onChange={(e) => setLengthFilter(e.target.value)}
                                className="px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                style={{ width: "90px" }}
                                title="Road Length"
                            >
                                <option value="all">Any Length</option>
                                <option value="short">&lt; 10 km</option>
                                <option value="medium">10-30 km</option>
                                <option value="long">&gt; 30 km</option>
                            </select>
                            <select
                                value={curvinessFilter}
                                onChange={(e) => setCurvinessFilter(e.target.value)}
                                className="px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                style={{ width: "90px" }}
                                title="Curviness"
                            >
                                <option value="all">Any Curves</option>
                                <option value="straight">Straight</option>
                                <option value="moderate">Moderate</option>
                                <option value="very">Very Curvy</option>
                            </select>
                        </div>
                    )}
                    {$1}
                    {(selectedCountry || selectedRegion || minRating > 0 ||
                      curvinessFilter !== 'all' || lengthFilter !== 'all' ||
                      sortBy !== 'rating' || selectedTagIds.length > 0) && (
                        <button
                            type="button"
                            className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 focus:outline-none flex items-center"
                            onClick={() => {
                                setSelectedCountry('');
                                setSelectedRegion('');
                                setMinRating(0);
                                setCurvinessFilter('all');
                                setLengthFilter('all');
                                setSortBy('rating');
                                setSelectedTagIds([]);
                            }}
                            title="Clear all filters"
                        >
                            <FaTimes size={10} className="mr-1" /> Clear
                        </button>
                    )}
                </div>
                {$1}
                {selectedTagIds.length > 0 && (
                    <div className="mb-1 border-t pt-1">
                        <span className="text-[10px] text-gray-500 mr-1">Tags:</span>
                        <CollapsibleTagSelector
                            selectedTags={selectedTagIds.map(tagId => {
                                const tag = availableTags.find(t => t.id === tagId);
                                return tag || { id: tagId, name: `Tag ${tagId}` };
                            })}
                            onTagsChange={(tags) => {
                                setSelectedTagIds(tags.map(tag => tag.id));
                            }}
                            initialVisibleTags={5}
                            className="mt-1"
                        />
                    </div>
                )}
                {$1}
                <div className="flex justify-start items-center">
                    <button
                        type="button"
                        className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FaTag className="mr-0.5 text-[8px]" />
                        {showFilters ? 'Hide Tags' : 'Add Tags'}
                        <FaChevronDown className={`ml-0.5 transition-transform text-[8px] ${showFilters ? 'transform rotate-180' : ''}`} />
                    </button>
                </div>
            </div>
            {$1}
            {showFilters && (
                <div className="border rounded-md overflow-hidden p-1 mb-1">
                    <div className="border rounded max-h-28 overflow-y-auto">
                        {$1}
                        <div className="divide-y divide-gray-200">
                            {categoryOrder.map(category => {
                                const filteredTags = availableTags.filter(tag =>
                                    !selectedTagIds.includes(tag.id) && tag.type === category
                                );
                                if (!filteredTags || filteredTags.length === 0) return null;
                                return (
                                    <div key={category}>
                                        <div className={`px-1 py-0.5 text-[9px] font-semibold bg-gray-100 text-gray-700 uppercase tracking-wider tag-${category}`}>
                                            {categoryNames[category]}
                                        </div>
                                        <div className="flex flex-wrap gap-0.5 p-0.5">
                                            {filteredTags.map(tag => (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    className={`px-1 py-0.5 rounded text-[9px] hover:opacity-80 ${
                                                        tag.type ? `tag-${tag.type}` : 'bg-gray-100 hover:bg-gray-200'
                                                    }`}
                                                    onClick={() => setSelectedTagIds([...selectedTagIds, tag.id])}
                                                    title={tag.description || ''}
                                                >
                                                    <FaTag className="inline mr-0.5 text-[8px]" />
                                                    {tag.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
