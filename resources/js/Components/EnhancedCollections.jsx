import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FaFolder,
    FaSearch,
    FaGlobe,
    FaTag,
    FaRoad,
    FaUser,
    FaPlus,
    FaFilter,
    FaChevronDown,
    FaChevronUp,
    FaMapMarkerAlt,
    FaMountain,
    FaRuler,
    FaCar,
    FaMotorcycle,
    FaCalendarAlt,
    FaSun,
    FaSnowflake,
    FaLeaf,
    FaEye,
    FaStar,
    FaHeart,
    FaClock
} from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import CollectionModal from './CollectionModal';
import CollectionDetailsModal from './CollectionDetailsModal';
import CollapsibleTagSelector from './CollapsibleTagSelector';
export default function EnhancedCollections({
    onViewCollection,
    onViewUser,
    authState = { isAuthenticated: false, user: null }
}) {
    
    const [myCreatedCollections, setMyCreatedCollections] = useState([]);
    const [mySavedCollections, setMySavedCollections] = useState([]);
    const [communityCollections, setCommunityCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [viewMode, setViewMode] = useState('my'); 
    
    const [myCollectionsViewMode, setMyCollectionsViewMode] = useState('all'); 
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedExperience, setSelectedExperience] = useState('');
    const [selectedSurface, setSelectedSurface] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedSeason, setSelectedSeason] = useState('');
    const [twistinessRange, setTwistinessRange] = useState([0, 100]);
    const [elevationRange, setElevationRange] = useState([0, 100]);
    const [lengthRange, setLengthRange] = useState([0, 100]);
    
    const [sortBy, setSortBy] = useState('newest');
    
    const [countries, setCountries] = useState([]);
    const [regions, setRegions] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCollectionDetailsModal, setShowCollectionDetailsModal] = useState(false);
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);
    
    const [showFilters, setShowFilters] = useState(false);
    
    const [popularCollections, setPopularCollections] = useState([]);
    const [topRatedCollections, setTopRatedCollections] = useState([]);
    const [nearbyCollections, setNearbyCollections] = useState([]);
    const [trendingCollections, setTrendingCollections] = useState([]);
    const [followingCollections, setFollowingCollections] = useState([]);
    
    const { isAuthenticated, user } = authState;
    useEffect(() => {
        
        fetchCollections();
        fetchCountries();
        fetchTags();
        
        fetchPopularCollections();
        fetchTopRatedCollections();
        fetchNearbyCollections();
        fetchTrendingCollections();
        
        if (isAuthenticated && user) {
            fetchFollowingCollections();
        }
    }, [isAuthenticated, user]);
    
    const fetchCollections = async () => {
        setLoading(true);
        try {
            
            if (isAuthenticated && user) {
                
                const createdResponse = await axios.get('/api/collections');
                setMyCreatedCollections(createdResponse.data);
                
                try {
                    const savedResponse = await axios.get('/api/saved-collections');
                    setMySavedCollections(savedResponse.data);
                } catch (savedErr) {
                    
                    setMySavedCollections([]);
                    
                    if (process.env.NODE_ENV === 'development') {
                        setMySavedCollections([
                            {
                                id: 101,
                                name: 'Saved Collection 1',
                                description: 'A collection saved from another user',
                                is_public: true,
                                roads_count: 3,
                                average_rating: 4.5,
                                saved_count: 12,
                                user: { id: 2, name: 'Other User' },
                                tags: [{ id: 1, name: 'Scenic' }, { id: 4, name: 'Twisty' }]
                            },
                            {
                                id: 102,
                                name: 'Saved Collection 2',
                                description: 'Another saved collection',
                                is_public: true,
                                roads_count: 5,
                                average_rating: 4.2,
                                saved_count: 8,
                                user: { id: 3, name: 'Another User' },
                                tags: [{ id: 2, name: 'Mountain' }, { id: 7, name: 'Motorcycle' }]
                            }
                        ]);
                    }
                }
            }
            
            const communityResponse = await axios.get('/api/public-collections');
            setCommunityCollections(communityResponse.data.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to load collections. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchCountries = async () => {
        try {
            const response = await axios.get('/api/countries');
            setCountries(response.data);
        } catch (err) {
        }
    };
    
    const fetchRegions = async (country) => {
        if (!country) {
            setRegions([]);
            return;
        }
        try {
            const response = await axios.get(`/api/regions?country=${country}`);
            setRegions(response.data);
        } catch (err) {
        }
    };
    
    const fetchTags = async () => {
        try {
            const response = await axios.get('/api/tags');
            setAvailableTags(response.data);
        } catch (err) {
        }
    };
    
    const fetchPopularCollections = async () => {
        try {
            
            
            const response = await axios.get('/api/public-collections?sort=saved_count&limit=5');
            setPopularCollections(response.data.data || []);
        } catch (err) {
        }
    };
    
    const fetchTopRatedCollections = async () => {
        try {
            const response = await axios.get('/api/leaderboard/top-rated-collections');
            setTopRatedCollections(response.data || []);
        } catch (err) {
        }
    };
    
    const fetchNearbyCollections = async () => {
        try {
            
            
            setNearbyCollections(communityCollections.slice(0, 5));
        } catch (err) {
        }
    };
    
    const fetchTrendingCollections = async () => {
        try {
            
            
            const shuffled = [...communityCollections].sort(() => 0.5 - Math.random());
            setTrendingCollections(shuffled.slice(0, 5));
        } catch (err) {
        }
    };
    
    const fetchFollowingCollections = async () => {
        try {
            const response = await axios.get('/api/following/collections');
            setFollowingCollections(response.data || []);
        } catch (err) {
            
            setFollowingCollections([]);
        }
    };
    
    const handleCountryChange = (country) => {
        setSelectedCountry(country);
        setSelectedRegion('');
        fetchRegions(country);
    };
    
    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCountry('');
        setSelectedRegion('');
        setSelectedTags([]);
        setSelectedExperience('');
        setSelectedSurface('');
        setSelectedVehicle('');
        setSelectedSeason('');
        setTwistinessRange([0, 100]);
        setElevationRange([0, 100]);
        setLengthRange([0, 100]);
    };
    
    const handleCollectionCreated = (collection) => {
        setMyCreatedCollections(prev => [collection, ...prev]);
        fetchCollections(); 
    };
    
    const handleViewCollectionDetails = (collection) => {
        setSelectedCollectionId(collection.id);
        setShowCollectionDetailsModal(true);
    };
    
    const handleSaveCollection = async (collection) => {
        if (!isAuthenticated) {
            alert('Please log in to save collections');
            return;
        }
        try {
            
            const response = await axios.post(`/api/collections/${collection.id}/save`);
            
            setMySavedCollections(prev => [response.data.collection || collection, ...prev]);
            
            alert('Collection saved successfully!');
        } catch (err) {
            
            if (process.env.NODE_ENV === 'development') {
                setMySavedCollections(prev => [collection, ...prev]);
                alert('Collection saved successfully! (Development mode)');
            } else {
                alert('Failed to save collection. Please try again.');
            }
        }
    };
    
    const getFilteredCollections = () => {
        let collections = [];
        if (viewMode === 'my') {
            
            if (myCollectionsViewMode === 'all') {
                collections = [...myCreatedCollections, ...mySavedCollections];
            } else if (myCollectionsViewMode === 'created') {
                collections = myCreatedCollections;
            } else if (myCollectionsViewMode === 'saved') {
                collections = mySavedCollections;
            }
        } else {
            collections = communityCollections;
        }
        return collections.filter(collection => {
            
            if (searchQuery && !collection.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !collection.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            
            if (selectedCountry && !collection.roads?.some(road => road.country === selectedCountry)) {
                return false;
            }
            
            if (selectedRegion && !collection.roads?.some(road => road.region === selectedRegion)) {
                return false;
            }
            
            if (selectedTags.length > 0 && !selectedTags.every(tagId =>
                collection.tags?.some(tag => tag.id === tagId)
            )) {
                return false;
            }
            
            if (selectedExperience && !collection.tags?.some(tag =>
                tag.name.toLowerCase() === selectedExperience.toLowerCase() ||
                tag.type === 'experience'
            )) {
                return false;
            }
            
            if (selectedSurface && !collection.tags?.some(tag =>
                tag.name.toLowerCase() === selectedSurface.toLowerCase() ||
                tag.type === 'surface'
            )) {
                return false;
            }
            
            if (selectedVehicle && !collection.tags?.some(tag =>
                tag.name.toLowerCase() === selectedVehicle.toLowerCase() ||
                tag.type === 'vehicle'
            )) {
                return false;
            }
            
            if (selectedSeason && !collection.tags?.some(tag =>
                tag.name.toLowerCase() === selectedSeason.toLowerCase() ||
                tag.type === 'season'
            )) {
                return false;
            }
            return true;
        });
    };
    
    const getSortedCollections = (collections) => {
        switch (sortBy) {
            case 'newest':
                return [...collections].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            case 'oldest':
                return [...collections].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            case 'rating':
                return [...collections].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
            case 'popularity':
                return [...collections].sort((a, b) => (b.saved_count || 0) - (a.saved_count || 0));
            case 'name':
                return [...collections].sort((a, b) => a.name.localeCompare(b.name));
            default:
                return collections;
        }
    };
    
    const displayCollections = getSortedCollections(getFilteredCollections());
    
    const renderCollectionCard = (collection) => {
        return (
            <div
                key={collection.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer shadow-sm transition-all hover:shadow-md"
                onClick={() => handleViewCollectionDetails(collection)}
            >
                <div className="flex items-center mb-2">
                    {collection.cover_image ? (
                        <img
                            src={`/storage/${collection.cover_image}`}
                            alt={collection.name}
                            className="w-12 h-12 object-cover rounded"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                            <FaFolder className="text-blue-400" />
                        </div>
                    )}
                    <div className="ml-3 flex-1">
                        <h3 className="font-semibold text-gray-800">{collection.name}</h3>
                        <div className="flex items-center text-sm text-gray-500">
                            <span className="flex items-center">
                                <FaRoad className="mr-1" />
                                {collection.roads_count || collection.roads?.length || 0} roads
                            </span>
                            <span className="mx-2">•</span>
                            <span className="flex items-center">
                                <FaStar className="mr-1 text-yellow-400" />
                                {collection.average_rating?.toFixed(1) || "N/A"}
                            </span>
                            {collection.saved_count > 0 && (
                                <>
                                    <span className="mx-2">•</span>
                                    <span className="flex items-center">
                                        <FaHeart className="mr-1 text-red-400" />
                                        {collection.saved_count}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {collection.user && (
                    <div className="flex items-center mt-2 text-sm">
                        <ProfilePicture user={collection.user} size="sm" />
                        <span className="ml-2 text-gray-600">
                            {collection.user.name}
                            {viewMode === 'my' && myCollectionsViewMode === 'all' && collection.user.id !== user?.id && (
                                <span className="ml-2 text-xs text-blue-500">(Saved)</span>
                            )}
                        </span>
                    </div>
                )}
                {collection.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{collection.description}</p>
                )}
                {collection.tags && collection.tags.length > 0 && (
                    <div className="mt-2">
                        <CollapsibleTagSelector
                            selectedTags={collection.tags}
                            readOnly={true}
                            initialVisibleTags={3}
                        />
                    </div>
                )}
                {$1}
                {viewMode === 'community' && isAuthenticated && (
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSaveCollection(collection);
                            }}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                        >
                            <FaHeart className="mr-1" /> Save Collection
                        </button>
                    </div>
                )}
            </div>
        );
    };
    
    const renderDiscoverySection = (title, collections, icon) => {
        if (!collections || collections.length === 0) return null;
        return (
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                    {icon}
                    <span className="ml-2">{title}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {collections.slice(0, 4).map(collection => renderCollectionCard(collection))}
                </div>
            </div>
        );
    };
    
    return (
        <div className="bg-white rounded-lg shadow">
            {$1}
            <div className="flex border-b">
                <button
                    className={`px-4 py-3 ${viewMode === 'my' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                    onClick={() => setViewMode('my')}
                >
                    My Collections
                </button>
                <button
                    className={`px-4 py-3 ${viewMode === 'community' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                    onClick={() => setViewMode('community')}
                >
                    Community Collections
                </button>
            </div>
            {$1}
            <div className="p-4 border-b">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search collections..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md pl-10"
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-3 py-2 border rounded-md flex items-center bg-gray-50 hover:bg-gray-100"
                        >
                            <FaFilter className="mr-2" />
                            Filters
                            {showFilters ? <FaChevronUp className="ml-2" /> : <FaChevronDown className="ml-2" />}
                        </button>
                    </div>
                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border rounded-md bg-gray-50"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="rating">Highest Rated</option>
                            <option value="popularity">Most Popular</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                    </div>
                    {isAuthenticated && viewMode === 'my' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-3 py-2 bg-blue-500 text-white rounded-md flex items-center hover:bg-blue-600"
                        >
                            <FaPlus className="mr-2" />
                            Create Collection
                        </button>
                    )}
                </div>
                {$1}
                {showFilters && (
                    <div className="mt-4 p-4 border rounded-md bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {$1}
                            <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                    <FaGlobe className="mr-2" />
                                    Location
                                </h4>
                                <div className="space-y-2">
                                    <select
                                        value={selectedCountry}
                                        onChange={(e) => handleCountryChange(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="">All Countries</option>
                                        {countries.map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
                                    {selectedCountry && (
                                        <select
                                            value={selectedRegion}
                                            onChange={(e) => setSelectedRegion(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md"
                                        >
                                            <option value="">All Regions</option>
                                            {regions.map(region => (
                                                <option key={region} value={region}>{region}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            {$1}
                            <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                    <FaMountain className="mr-2" />
                                    Experience
                                </h4>
                                <div className="space-y-2">
                                    <select
                                        value={selectedExperience}
                                        onChange={(e) => setSelectedExperience(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="">All Experience Levels</option>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="expert">Expert</option>
                                    </select>
                                    <select
                                        value={selectedSurface}
                                        onChange={(e) => setSelectedSurface(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="">All Surface Types</option>
                                        <option value="paved">Paved</option>
                                        <option value="unpaved">Unpaved</option>
                                        <option value="mixed">Mixed</option>
                                    </select>
                                </div>
                            </div>
                            {$1}
                            <div>
                                <h4 className="font-medium mb-2 flex items-center">
                                    <FaCar className="mr-2" />
                                    Vehicle & Season
                                </h4>
                                <div className="space-y-2">
                                    <select
                                        value={selectedVehicle}
                                        onChange={(e) => setSelectedVehicle(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="">All Vehicle Types</option>
                                        <option value="car">Car</option>
                                        <option value="motorcycle">Motorcycle</option>
                                        <option value="suv">SUV/4x4</option>
                                    </select>
                                    <select
                                        value={selectedSeason}
                                        onChange={(e) => setSelectedSeason(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="">All Seasons</option>
                                        <option value="spring">Spring</option>
                                        <option value="summer">Summer</option>
                                        <option value="autumn">Autumn</option>
                                        <option value="winter">Winter</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        {$1}
                        <div className="mt-4">
                            <h4 className="font-medium mb-2 flex items-center">
                                <FaTag className="mr-2" />
                                Tags
                            </h4>
                            <div className="border rounded-md p-3 bg-white">
                                <CollapsibleTagSelector
                                    selectedTags={selectedTags.map(tagId => {
                                        const tag = availableTags.find(t => t.id === tagId);
                                        return tag || { id: tagId, name: `Tag ${tagId}` };
                                    })}
                                    onTagsChange={(tags) => setSelectedTags(tags.map(tag => tag.id))}
                                    showCategoryHeaders={true}
                                    initialVisibleTags={10}
                                />
                            </div>
                        </div>
                        {$1}
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 border rounded-md mr-2 hover:bg-gray-100"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {$1}
            <div className="p-4">
                {loading ? (
                    <div className="text-center py-8">Loading collections...</div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">
                        {error}
                        <button
                            onClick={fetchCollections}
                            className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        {$1}
                        {viewMode === 'my' && (
                            <>
                                {!isAuthenticated ? (
                                    <div className="text-center py-8 bg-gray-50 rounded border">
                                        <FaUser className="mx-auto text-4xl text-gray-400 mb-2" />
                                        <p className="text-gray-600">Please log in to view your collections</p>
                                    </div>
                                ) : (myCreatedCollections.length === 0 && mySavedCollections.length === 0) ? (
                                    <div className="text-center py-8 bg-gray-50 rounded border">
                                        <FaFolder className="mx-auto text-4xl text-gray-400 mb-2" />
                                        <p className="text-gray-600">You haven't created or saved any collections yet</p>
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Create Your First Collection
                                        </button>
                                    </div>
                                ) : displayCollections.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded border">
                                        <FaSearch className="mx-auto text-4xl text-gray-400 mb-2" />
                                        <p className="text-gray-600">No collections match your filters</p>
                                        <button
                                            onClick={handleClearFilters}
                                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {$1}
                                        <div className="mb-4 border-b">
                                            <div className="flex">
                                                <button
                                                    className={`px-4 py-2 ${myCollectionsViewMode === 'all' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
                                                    onClick={() => setMyCollectionsViewMode('all')}
                                                >
                                                    All Collections
                                                </button>
                                                <button
                                                    className={`px-4 py-2 ${myCollectionsViewMode === 'created' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
                                                    onClick={() => setMyCollectionsViewMode('created')}
                                                >
                                                    Created by Me
                                                    <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                                                        {myCreatedCollections.length}
                                                    </span>
                                                </button>
                                                <button
                                                    className={`px-4 py-2 ${myCollectionsViewMode === 'saved' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
                                                    onClick={() => setMyCollectionsViewMode('saved')}
                                                >
                                                    Saved from Others
                                                    <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                                                        {mySavedCollections.length}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        {$1}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {displayCollections.map(collection => renderCollectionCard(collection))}
                                        </div>
                                        {$1}
                                        {myCollectionsViewMode === 'created' && myCreatedCollections.length === 0 && (
                                            <div className="text-center py-8 bg-gray-50 rounded border mt-4">
                                                <FaFolder className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You haven't created any collections yet</p>
                                                <button
                                                    onClick={() => setShowCreateModal(true)}
                                                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Create Your First Collection
                                                </button>
                                            </div>
                                        )}
                                        {$1}
                                        {myCollectionsViewMode === 'saved' && mySavedCollections.length === 0 && (
                                            <div className="text-center py-8 bg-gray-50 rounded border mt-4">
                                                <FaFolder className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">You haven't saved any collections from other users yet</p>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    Browse the Community Collections tab to discover and save collections from other users
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                        {$1}
                        {viewMode === 'community' && (
                            <>
                                {$1}
                                {!searchQuery && !selectedCountry && !selectedRegion && selectedTags.length === 0 && (
                                    <div className="mb-6">
                                        {renderDiscoverySection('Popular Collections', popularCollections, <FaHeart className="text-red-500" />)}
                                        {renderDiscoverySection('Top Rated Collections', topRatedCollections, <FaStar className="text-yellow-500" />)}
                                        {renderDiscoverySection('Nearby Collections', nearbyCollections, <FaMapMarkerAlt className="text-green-500" />)}
                                        {renderDiscoverySection('Trending Collections', trendingCollections, <FaEye className="text-blue-500" />)}
                                        {isAuthenticated && renderDiscoverySection('From Users You Follow', followingCollections, <FaUser className="text-purple-500" />)}
                                    </div>
                                )}
                                {$1}
                                {(searchQuery || selectedCountry || selectedRegion || selectedTags.length > 0) && (
                                    <>
                                        <h3 className="text-lg font-semibold mb-3">Search Results</h3>
                                        {displayCollections.length === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded border">
                                                <FaSearch className="mx-auto text-4xl text-gray-400 mb-2" />
                                                <p className="text-gray-600">No collections match your filters</p>
                                                <button
                                                    onClick={handleClearFilters}
                                                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Clear Filters
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {displayCollections.map(collection => renderCollectionCard(collection))}
                                            </div>
                                        )}
                                    </>
                                )}
                                {$1}
                                {!searchQuery && !selectedCountry && !selectedRegion && selectedTags.length === 0 &&
                                 !popularCollections.length && !topRatedCollections.length &&
                                 !nearbyCollections.length && !trendingCollections.length && (
                                    <div className="text-center py-8 bg-gray-50 rounded border">
                                        <FaFolder className="mx-auto text-4xl text-gray-400 mb-2" />
                                        <p className="text-gray-600">No community collections found</p>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
            {$1}
            <CollectionModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCollectionCreated}
            />
            {selectedCollectionId && (
                <CollectionDetailsModal
                    isOpen={showCollectionDetailsModal}
                    onClose={() => {
                        setShowCollectionDetailsModal(false);
                        setSelectedCollectionId(null);
                    }}
                    collectionId={selectedCollectionId}
                    onCollectionUpdated={fetchCollections}
                />
            )}
        </div>
    );
}
