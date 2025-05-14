import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import L from 'leaflet';
import NavigationAppSelector from './NavigationAppSelector';
import RatingModal from './RatingModal';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
import CollapsibleTagSelector from './CollapsibleTagSelector';
import { FaTag, FaChevronDown, FaSearch } from 'react-icons/fa';

function TagCategoryCollapsible({ tags, onTagSelect }) {
    const [expanded, setExpanded] = useState(false);
    const initialVisibleCount = 5;
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
                            tag.type ? `tag-${tag.type}` : 'bg-gray-100 hover:bg-gray-200'
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
                            className={`ml-1 text-xs transition-transform icon ${expanded ? 'expanded' : ''}`}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}
export default function Community({ auth }) {
    const { userSettings } = useContext(UserSettingsContext);
    const [publicRoads, setPublicRoads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchLocation, setSearchLocation] = useState('');
    const [searchRadius, setSearchRadius] = useState(50); 
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedRoadForReview, setSelectedRoadForReview] = useState(null);
    const [localRating, setLocalRating] = useState(0);
    const [localComment, setLocalComment] = useState('');
    
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [showTagFilters, setShowTagFilters] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);
    useEffect(() => {
        fetchPublicRoads();
        fetchTags();
    }, []);
    
    const fetchTags = async () => {
        setLoadingTags(true);
        try {
            const response = await axios.get('/api/tags');
            setAvailableTags(response.data);
        } catch (error) {
        } finally {
            setLoadingTags(false);
        }
    };
    const fetchPublicRoads = async (location = '') => {
        setLoading(true);
        try {
            let url = '/api/public-roads';
            const params = new URLSearchParams();
            if (location) {
                params.append('location', location);
                params.append('radius', searchRadius);
            }
            
            if (selectedTagIds.length > 0) {
                params.append('tags', selectedTagIds.join(','));
            }
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            const response = await axios.get(url);
            
            let roadsData = response.data;
            if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                roadsData = response.data.roads;
            } else if (!Array.isArray(response.data)) {
                roadsData = [];
            }
            setPublicRoads(roadsData);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };
    const handleSearch = (e) => {
        e.preventDefault();
        fetchPublicRoads(searchLocation);
    };
    
    const handleTagsChange = (tags) => {
        setSelectedTagIds(tags.map(tag => tag.id));
        fetchPublicRoads(searchLocation);
    };
    
    const handleClearFilters = () => {
        setSearchLocation('');
        setSearchRadius(50);
        setSelectedTagIds([]);
        fetchPublicRoads('');
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
        
        return Object.fromEntries(
            
            categoryOrder
                .filter(category => groupedTags[category] && groupedTags[category].length > 0)
                .map(category => [category, groupedTags[category]])
                
                .concat(
                    Object.entries(groupedTags)
                        .filter(([category]) => !categoryOrder.includes(category))
                )
        );
    };
    
    const getCategoryName = (category) => {
        return categoryNames[category] || category;
    };
    const handleViewDetails = async (road) => {
        try {
            
            const response = await axios.get(`/api/public-roads/${road.id}`);
            setSelectedRoadForReview(response.data);
            setRatingModalOpen(true);
            
            if (auth.user) {
                const existingReview = response.data.reviews?.find(review => review.user?.id === auth.user.id);
                if (existingReview) {
                    setLocalRating(existingReview.rating);
                    setLocalComment(existingReview.comment || '');
                } else {
                    setLocalRating(0);
                    setLocalComment('');
                }
            } else {
                setLocalRating(0);
                setLocalComment('');
            }
        } catch (error) {
            alert('Failed to load road details');
        }
    };
    const handleCloseRatingModal = () => {
        setRatingModalOpen(false);
        setSelectedRoadForReview(null);
        setLocalRating(0);
        setLocalComment('');
    };
    const handleSubmitReview = async (rating, comment) => {
        try {
            await axios.post(`/api/saved-roads/${selectedRoadForReview.id}/review`, {
                rating,
                comment
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            handleCloseRatingModal();
            fetchPublicRoads(searchLocation); 
        } catch (error) {
            alert('Failed to submit review');
        }
    };
    const handleNavigateClick = (e, road) => {
        e.stopPropagation(); 
        if (!road.road_coordinates) {
            alert('No coordinates available for this road');
            return;
        }
        setSelectedRoad(road);
        setShowNavigationSelector(true);
    };
    
    const handleViewOnMap = (road) => {
        if (!road.road_coordinates) {
            alert('No coordinates available for this road');
            return;
        }
        
        const event = new CustomEvent('viewRoadOnMap', {
            detail: {
                road: road
            }
        });
        window.dispatchEvent(event);
    };
    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Community Roads</h2>
            {$1}
            <div className="mb-6 border rounded-lg p-4 bg-white shadow">
                <form onSubmit={handleSearch}>
                    <div className="flex flex-wrap gap-4 mb-3">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by location (e.g., Balvi)"
                                    value={searchLocation}
                                    onChange={(e) => setSearchLocation(e.target.value)}
                                    className="w-full p-2 border rounded pr-10"
                                />
                                <FaSearch className="absolute right-3 top-3 text-gray-400" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={searchRadius}
                                onChange={(e) => setSearchRadius(e.target.value)}
                                min="1"
                                max="200"
                                className="w-20 p-2 border rounded"
                            />
                            <span className="self-center">km</span>
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Search
                        </button>
                        {(searchLocation || searchRadius !== 50 || selectedTagIds.length > 0) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                    {$1}
                    <div className="flex items-center">
                        <button
                            type="button"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            onClick={() => setShowTagFilters(!showTagFilters)}
                        >
                            <FaTag className="mr-1 text-xs" />
                            {showTagFilters ? 'Hide Tag Filters' : 'Show Tag Filters'}
                            <FaChevronDown
                                className={`ml-1 text-xs transition-transform ${showTagFilters ? 'transform rotate-180' : ''}`}
                            />
                        </button>
                    </div>
                    {$1}
                    {showTagFilters && (
                        <div className="mt-1 text-xs text-gray-500">
                            Each category of tags is collapsible. Click the "+X more" button to see all tags in a category.
                        </div>
                    )}
                    {$1}
                    {selectedTagIds.length > 0 && (
                        <div className="mt-3">
                            <CollapsibleTagSelector
                                selectedTags={selectedTagIds.map(id => {
                                    const tag = availableTags.find(t => t.id === id);
                                    return tag || { id, name: `Tag ${id}` };
                                })}
                                onTagsChange={handleTagsChange}
                                initialVisibleTags={5}
                                alwaysCollapsible={true}
                                showCategoryHeaders={true}
                                title="Selected Tags"
                            />
                        </div>
                    )}
                    {$1}
                    {showTagFilters && (
                        <div className="mt-3 border rounded p-3 bg-gray-50">
                            <h3 className="text-sm font-medium mb-2">Filter by Tags</h3>
                            {loadingTags ? (
                                <div className="text-sm text-gray-500">Loading tags...</div>
                            ) : (
                                <>
                                    {availableTags.length === 0 ? (
                                        <div className="text-sm text-gray-500">No tags available</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {$1}
                                            {Object.entries(groupTagsByCategory()).map(([category, tags]) => {
                                                if (tags.length === 0) return null;
                                                return (
                                                    <div key={category} className="mb-2">
                                                        <div className="text-xs font-medium text-gray-700 mb-1">
                                                            {getCategoryName(category)}
                                                        </div>
                                                        <div className="border rounded p-2 bg-white">
                                                            <div className={`tag-category-${category}`}>
                                                                <TagCategoryCollapsible
                                                                    tags={tags}
                                                                    onTagSelect={(tag) => {
                                                                        const newTags = [...selectedTagIds, tag.id];
                                                                        setSelectedTagIds(newTags);
                                                                        fetchPublicRoads(searchLocation);
                                                                    }}
                                                                />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </form>
            </div>
            {$1}
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-4">
                    {publicRoads.map(road => (
                        <div key={road.id} className="border rounded-lg p-4 bg-white shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold">{road.road_name}</h3>
                                    <div className="text-sm text-gray-600 mt-1">
                                    <p>Length: {userSettings?.measurement_units === 'imperial' ?
                                        ((road.length / 1000) * 0.621371).toFixed(2) + ' miles' :
                                        (road.length / 1000).toFixed(2) + ' km'}</p>
                                    <p>Corners: {road.corner_count}</p>
                                    <p>Curve Score: {road.twistiness?.toFixed(4)}</p>
                                    {road.elevation_gain && road.elevation_loss && (
                                        <p>Elevation: {userSettings?.measurement_units === 'imperial' ?
                                            Math.round(road.elevation_gain * 3.28084) + ' ft ↑ ' + Math.round(road.elevation_loss * 3.28084) + ' ft ↓' :
                                            Math.round(road.elevation_gain) + ' m ↑ ' + Math.round(road.elevation_loss) + ' m ↓'}</p>
                                    )}
                                    <p>Average Rating: {road.average_rating ? road.average_rating.toFixed(1) : 'No ratings'} ⭐</p>
                                </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleViewOnMap(road)}
                                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        View on Map
                                    </button>
                                    <button
                                        onClick={(e) => handleNavigateClick(e, road)}
                                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        Navigate
                                    </button>
                                    <button
                                        onClick={() => handleViewDetails(road)}
                                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {$1}
            <RatingModal
                isOpen={ratingModalOpen}
                onClose={handleCloseRatingModal}
                onSubmit={handleSubmitReview}
                road={selectedRoadForReview}
                auth={auth}
                initialRating={localRating}
                initialComment={localComment}
            />
            {$1}
            {showNavigationSelector && selectedRoad && (
                            <NavigationAppSelector
                    isOpen={showNavigationSelector}
                    onClose={() => setShowNavigationSelector(false)}
                    coordinates={selectedRoad.road_coordinates}
                />
            )}
        </div>
    );
}
