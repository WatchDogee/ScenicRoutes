import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaTrophy, FaUsers, FaUserFriends, FaRoad, FaFolder, FaTimes, FaSearch, FaTag, FaMapMarkerAlt, FaFilter, FaChevronDown, FaSpinner } from 'react-icons/fa';
import CompactSearchForm from './CompactSearchForm';
import Modal from './Modal';
import CollectionModal from './CollectionModal';
import CollectionDetailsModal from './CollectionDetailsModal';
import Leaderboard from './Leaderboard';
import UserProfileModal from './UserProfileModal';
import RoadCard from './RoadCard';
import ProfilePicture from './ProfilePicture';
import UserMention from './UserMention';
import CollapsibleTagSelector from './CollapsibleTagSelector';
import EnhancedCollections from './EnhancedCollections';
export default function SocialModal({ isOpen, onClose, onViewRoad, onViewRoadDetails, selectedCollectionId: initialCollectionId, roadToAdd, activeTab: initialActiveTab, setActiveTab: setParentActiveTab }) {
    
    const [authState, setAuthState] = useState({
        isAuthenticated: !!localStorage.getItem('token'),
        user: null
    });
    
    useEffect(() => {
        
        if (isOpen) {
            
            document.body.classList.add('social-modal-open');
            
            const styleTag = document.createElement('style');
            styleTag.id = 'social-modal-styles';
            styleTag.innerHTML = `
                .social-modal {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 10000 !important;
                    position: fixed !important;
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(styleTag);
        }
        
        if (window.isUserAuthenticated && window.userId) {
            setAuthState({
                isAuthenticated: true,
                user: { id: window.userId }
            });
        } else {
            
            const token = localStorage.getItem('token');
            if (token) {
                axios.get('/api/user', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                .then(response => {
                    setAuthState({
                        isAuthenticated: true,
                        user: response.data
                    });
                })
                .catch((error) => {
                    setAuthState({
                        isAuthenticated: false,
                        user: null
                    });
                });
            } else {
            }
        }
        
        return () => {
            document.body.classList.remove('social-modal-open');
            const styleTag = document.getElementById('social-modal-styles');
            if (styleTag) {
                styleTag.remove();
            }
        };
    }, [isOpen]);
    const { isAuthenticated, user } = authState;
    const [activeTab, setActiveTab] = useState(initialActiveTab || 'leaderboard');
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [showUserProfileModal, setShowUserProfileModal] = useState(false);
    const [showCollectionDetailsModal, setShowCollectionDetailsModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);
    const [collections, setCollections] = useState([]);
    const [following, setFollowing] = useState([]);
    const [feedContent, setFeedContent] = useState({ roads: [], collections: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const [searchType, setSearchType] = useState('roads'); 
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [searchResults, setSearchResults] = useState({ roads: [], collections: [] });
    const [searchTags, setSearchTags] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [minRating, setMinRating] = useState(0);
    const [curvinessFilter, setCurvinessFilter] = useState('all');
    const [lengthFilter, setLengthFilter] = useState('all');
    const [sortBy, setSortBy] = useState('rating');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [locationSearchResults, setLocationSearchResults] = useState([]);
    const [countries, setCountries] = useState([]);
    const [regions, setRegions] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    useEffect(() => {
        if (isOpen) {
            
            const token = localStorage.getItem('token');
            const tempAuthState = localStorage.getItem('temp_auth_state');
            const isActuallyAuthenticated = isAuthenticated || !!token || !!tempAuthState || !!window.isUserAuthenticated;
            if (activeTab === 'collections' && isActuallyAuthenticated) {
                fetchCollections();
            } else if (activeTab === 'following' && isActuallyAuthenticated) {
                fetchFollowing();
            } else if (activeTab === 'feed' && isActuallyAuthenticated) {
                fetchFeed();
            } else if (activeTab === 'search') {
                
                fetchAvailableTags();
                
                fetchCountries();
                
                fetchAllPublicRoads();
            }
        }
    }, [activeTab, isAuthenticated, user, isOpen]);
    
    const fetchAllPublicRoads = async () => {
        try {
            setIsSearching(true);
            const response = await axios.get('/api/public-roads', {
                params: { timestamp: new Date().getTime() } 
            });
            if (response.data && response.data.roads) {
                setSearchResults(prevResults => ({
                    ...prevResults,
                    roads: [...response.data.roads] 
                }));
            } else if (Array.isArray(response.data)) {
                setSearchResults(prevResults => ({
                    ...prevResults,
                    roads: [...response.data]
                }));
            } else {
                setSearchResults(prevResults => ({ ...prevResults, roads: [] }));
            }
        } catch (error) {
            setSearchResults(prevResults => ({ ...prevResults, roads: [] }));
        } finally {
            setIsSearching(false);
        }
    };
    
    const fetchAvailableTags = async () => {
        try {
            
            try {
                const response = await axios.get('/api/tags');
                setAvailableTags(response.data);
            } catch (apiError) {
                
                if (process.env.NODE_ENV === 'development') {
                    setAvailableTags([
                        { id: 1, name: 'Scenic', type: 'scenery' },
                        { id: 2, name: 'Mountain', type: 'scenery' },
                        { id: 3, name: 'Coastal', type: 'scenery' },
                        { id: 4, name: 'Twisty', type: 'road_characteristic' },
                        { id: 5, name: 'Smooth', type: 'surface' },
                        { id: 6, name: 'Challenging', type: 'experience' },
                        { id: 7, name: 'Motorcycle', type: 'vehicle' },
                        { id: 8, name: 'Car', type: 'vehicle' }
                    ]);
                }
            }
        } catch (error) {
            setSearchError('Failed to load tags for filtering');
        }
    };
    
    const fetchCountries = async () => {
        try {
            setLoadingCountries(true);
            
            try {
                const response = await axios.get('/api/countries', {
                    params: { public_only: true }
                });
                if (response.data && response.data.length > 0) {
                    setCountries(response.data);
                } else {
                    
                    setCountries(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
                }
            } catch (apiError) {
                
                setCountries(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
            }
            
            try {
                const debugResponse = await axios.get('/api/debug/roads');
                if (debugResponse.data && debugResponse.data.countries && debugResponse.data.countries.length > 0) {
                    
                    setCountries(debugResponse.data.countries);
                }
            } catch (debugError) {
            }
            setLoadingCountries(false);
        } catch (error) {
            setLoadingCountries(false);
            
            setCountries(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
        }
    };
    
    const fetchRegions = async (country) => {
        if (!country) {
            setRegions([]);
            return;
        }
        try {
            
            try {
                const response = await axios.get('/api/regions', {
                    params: {
                        country,
                        public_only: true
                    }
                });
                if (response.data && response.data.length > 0) {
                    setRegions(response.data);
                } else {
                    
                    
                    if (country === 'Latvia') {
                        setRegions(['Riga', 'Vidzeme', 'Kurzeme', 'Zemgale', 'Latgale']);
                    } else if (country === 'Estonia') {
                        setRegions(['Tallinn', 'Tartu', 'Pärnu', 'Narva']);
                    } else if (country === 'Lithuania') {
                        setRegions(['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai']);
                    } else {
                        setRegions(['Region 1', 'Region 2', 'Region 3']);
                    }
                }
            } catch (apiError) {
                
                
                if (country === 'Latvia') {
                    setRegions(['Riga', 'Vidzeme', 'Kurzeme', 'Zemgale', 'Latgale']);
                } else if (country === 'Estonia') {
                    setRegions(['Tallinn', 'Tartu', 'Pärnu', 'Narva']);
                } else if (country === 'Lithuania') {
                    setRegions(['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai']);
                } else {
                    setRegions(['Region 1', 'Region 2', 'Region 3']);
                }
            }
        } catch (error) {
            setRegions([]);
            
            if (country === 'Latvia') {
                setRegions(['Riga', 'Vidzeme', 'Kurzeme', 'Zemgale', 'Latgale']);
            } else if (country === 'Estonia') {
                setRegions(['Tallinn', 'Tartu', 'Pärnu', 'Narva']);
            } else if (country === 'Lithuania') {
                setRegions(['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai']);
            } else {
                setRegions(['Region 1', 'Region 2', 'Region 3']);
            }
        }
    };
    
    useEffect(() => {
        if (selectedCountry) {
            fetchRegions(selectedCountry);
        } else {
            setRegions([]);
            setSelectedRegion('');
        }
    }, [selectedCountry]);
    
    useEffect(() => {
        if (isOpen && initialCollectionId) {
            setSelectedCollectionId(initialCollectionId);
            setShowCollectionDetailsModal(true);
            
            setActiveTab('collections');
            if (setParentActiveTab) {
                setParentActiveTab('collections');
            }
        }
    }, [isOpen, initialCollectionId]);
    
    useEffect(() => {
        if (isOpen && roadToAdd) {
            
            const isNewRoadAddition = roadToAdd && roadToAdd.id;
            if (isNewRoadAddition) {
                
                setActiveTab('collections');
                if (setParentActiveTab) {
                    setParentActiveTab('collections');
                }
                
                
                setTimeout(() => {
                    
                    if (isOpen && roadToAdd && roadToAdd.id) {
                        
                        setShowCollectionDetailsModal(false);
                        setShowUserProfileModal(false);
                        
                        setShowCollectionModal(true);
                    }
                }, 300);
            } else {
            }
        }
    }, [isOpen, roadToAdd]);
    const fetchCollections = async () => {
        try {
            setLoading(true);
            
            try {
                const response = await axios.get('/api/collections');
                setCollections(response.data);
                setError(null);
            } catch (apiError) {
                
                if (process.env.NODE_ENV === 'development') {
                    setCollections([
                        {
                            id: 1,
                            name: 'My Favorite Roads',
                            description: 'A collection of my favorite scenic routes',
                            is_public: true,
                            roads: [{ id: 1, road_name: 'Mountain Pass', length: 15000 }],
                            user: { name: 'Demo User' }
                        },
                        {
                            id: 2,
                            name: 'Weekend Trips',
                            description: 'Great roads for weekend getaways',
                            is_public: false,
                            roads: [{ id: 2, road_name: 'Coastal Highway', length: 25000 }],
                            user: { name: 'Demo User' }
                        }
                    ]);
                } else {
                    setError('Failed to load collections. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };
    const fetchFollowing = async () => {
        try {
            setLoading(true);
            
            try {
                const response = await axios.get('/api/following');
                setFollowing(response.data.data || []);
                setError(null);
            } catch (apiError) {
                
                if (process.env.NODE_ENV === 'development') {
                    setFollowing([]);
                } else {
                    setError('Failed to load following users. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };
    const fetchFeed = async () => {
        try {
            setLoading(true);
            
            try {
                const response = await axios.get('/api/feed');
                setFeedContent(response.data);
                setError(null);
            } catch (apiError) {
                
                if (process.env.NODE_ENV === 'development') {
                    setFeedContent({
                        roads: [],
                        collections: []
                    });
                } else {
                    setError('Failed to load feed. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };
    const handleCollectionCreated = (collection) => {
        setCollections(prev => [collection, ...prev]);
        setShowCollectionModal(false);
    };
    
    const refreshCollections = () => {
        fetchCollections();
    };
    const handleViewUser = (user) => {
        setSelectedUserId(user.id);
        setShowUserProfileModal(true);
    };
    const handleFollowChange = () => {
        
        if (activeTab === 'following') {
            fetchFollowing();
        }
        
        if (activeTab === 'feed') {
            fetchFeed();
        }
    };
    
    const searchForLocation = async (query) => {
        if (!query.trim()) {
            setLocationSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 5,
                    addressdetails: 1,
                    'accept-language': 'en',
                    dedupe: 1
                },
                withCredentials: false,
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (response.data.length === 0) {
                setLocationSearchResults([]);
                return;
            }
            const formattedResults = response.data
                .filter(result => result.type !== 'house' && result.type !== 'postcode')
                .map(result => ({
                    ...result,
                    displayName: formatLocationName(result)
                }));
            setLocationSearchResults(formattedResults);
        } catch (error) {
            setSearchError('Failed to search location. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };
    
    const formatLocationName = (result) => {
        const address = result.address;
        const parts = [];
        
        if (address.city || address.town || address.village || address.municipality) {
            parts.push(address.city || address.town || address.village || address.municipality);
        }
        
        if (address.county) {
            parts.push(address.county);
        } else if (address.state || address.region) {
            parts.push(address.state || address.region);
        }
        
        if (address.country) {
            parts.push(address.country);
        }
        
        if (parts.length === 0) {
            return result.display_name.split(',').slice(0, 3).join(',');
        }
        return parts.join(', ');
    };
    
    const handleLocationSelect = (location) => {
        setSearchLocation(location.displayName);
        setLocationSearchResults([]);
    };
    
    const searchRoads = async () => {
        setIsSearching(true);
        setSearchError(null);
        try {
            
            let lat, lon;
            let searchParams = {
                length_filter: lengthFilter,
                curviness_filter: curvinessFilter,
                min_rating: minRating,
                sort_by: sortBy,
                tags: selectedTagIds.length > 0 ? selectedTagIds.join(',') : null,
                debug: true 
            };
            
            searchParams.timestamp = new Date().getTime();
            
            if (selectedCountry) {
                searchParams.country = selectedCountry.trim();
                if (selectedRegion) {
                    searchParams.region = selectedRegion.trim();
                }
                
                if (!searchLocation) {
                    
                    
                    searchParams.debug = true;
                    searchParams.timestamp = new Date().getTime();
                    
                    Object.entries(searchParams).forEach(([key, value]) => {

                    });
                    try {
                        
                        const response = await axios.get('/api/public-roads', { params: searchParams });
                        
                        if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                            setSearchResults({
                                ...searchResults,
                                roads: response.data.roads
                            });
                            
                            setIsSearching(false);
                            return;
                        } else if (Array.isArray(response.data)) {
                            setSearchResults({
                                ...searchResults,
                                roads: response.data
                            });
                            
                            setIsSearching(false);
                            return;
                        }
                        
                        
                        const debugParams = {
                            ...searchParams,
                            debug: true
                        };
                        const debugResponse = await axios.get('/api/debug/search', { params: debugParams });
                        if (debugResponse.data && debugResponse.data.roads && debugResponse.data.roads.length > 0) {
                            setSearchResults({
                                ...searchResults,
                                roads: debugResponse.data.roads
                            });
                            
                            setIsSearching(false);
                            return;
                        }
                        
                        
                        if (searchParams.region) {
                        }
                        
                        if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                            setSearchResults({
                                ...searchResults,
                                roads: response.data.roads
                            });
                            
                            if (response.data.roads.length === 0) {
                                if (selectedRegion) {
                                }
                                
                                if (response.data.debug && response.data.debug.debug_info) {
                                    const debugInfo = response.data.debug.debug_info;
                                    
                                    if (debugInfo.public_roads > 0 && response.data.roads.length === 0) {
                                        
                                        const testParams = {
                                            country: searchParams.country,
                                            region: searchParams.region || 'Riga',
                                            debug: true,
                                            create_test: true,
                                            timestamp: new Date().getTime()
                                        };
                                        try {
                                            const testResponse = await axios.get('/api/public-roads', { params: testParams });
                                            
                                            const newResponse = await axios.get('/api/public-roads', { params: searchParams });
                                            if (newResponse.data && newResponse.data.roads && Array.isArray(newResponse.data.roads)) {
                                                setSearchResults({
                                                    ...searchResults,
                                                    roads: newResponse.data.roads
                                                });
                                                if (newResponse.data.roads.length > 0) {
                                                }
                                            }
                                        } catch (testError) {
                                        }
                                    }
                                }
                            } else {
                            }
                        }
                        
                        else if (Array.isArray(response.data)) {
                            setSearchResults({
                                ...searchResults,
                                roads: response.data
                            });
                            
                            if (response.data.length === 0) {
                                if (selectedRegion) {
                                }
                                
                                const testParams = {
                                    country: searchParams.country,
                                    region: searchParams.region || 'Riga',
                                    debug: true,
                                    create_test: true,
                                    timestamp: new Date().getTime()
                                };
                                try {
                                    const testResponse = await axios.get('/api/public-roads', { params: testParams });
                                    
                                    const newResponse = await axios.get('/api/public-roads', { params: searchParams });
                                    if (Array.isArray(newResponse.data)) {
                                        setSearchResults({
                                            ...searchResults,
                                            roads: newResponse.data
                                        });
                                        if (newResponse.data.length > 0) {
                                        }
                                    }
                                } catch (testError) {
                                }
                            } else {
                            }
                        } else {
                            setSearchError('Received invalid data format from the server. Please try again.');
                        }
                    } catch (error) {
                        if (error.response) {
                            
                            if (error.response.status === 404) {
                                setSearchError('The search endpoint was not found. Please contact support.');
                            } else if (error.response.status === 500) {
                                setSearchError('Server error occurred. Please try again later or contact support.');
                            } else {
                                setSearchError('Error ' + error.response.status + ': ' + (error.response.data.error || 'Unknown error'));
                            }
                        } else if (error.request) {
                            setSearchError('No response received from server. Please check your internet connection.');
                        } else {
                            setSearchError('Error: ' + error.message);
                        }
                    }
                    setIsSearching(false);
                    return;
                }
            }
            
            if (searchLocation) {
                
                const locationResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: {
                        q: searchLocation,
                        format: 'json',
                        limit: 1
                    },
                    withCredentials: false
                });
                if (locationResponse.data.length === 0) {
                    setSearchError('Location not found. Please try a different location.');
                    setIsSearching(false);
                    return;
                }
                lat = locationResponse.data[0].lat;
                lon = locationResponse.data[0].lon;
                
                searchParams.lat = lat;
                searchParams.lon = lon;
            }
            
            try {
                const response = await axios.get('/api/public-roads', { params: searchParams });
                
                if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                    setSearchResults({
                        ...searchResults,
                        roads: response.data.roads
                    });
                    
                    if (response.data.roads.length === 0) {
                        if (selectedCountry) {
                        }
                        if (selectedRegion) {
                        }
                        
                        if (response.data.debug && response.data.debug.debug_info) {
                            const debugInfo = response.data.debug.debug_info;
                        }
                    } else {
                    }
                }
                
                else if (Array.isArray(response.data)) {
                    setSearchResults({
                        ...searchResults,
                        roads: response.data
                    });
                    
                    if (response.data.length === 0) {
                        if (selectedCountry) {
                        }
                        if (selectedRegion) {
                        }
                    } else {
                    }
                } else {
                    setSearchError('Received invalid data format from the server. Please try again.');
                }
            } catch (error) {
                if (error.response) {
                    
                    if (error.response.status === 404) {
                        setSearchError('The search endpoint was not found. Please contact support.');
                    } else if (error.response.status === 500) {
                        setSearchError('Server error occurred. Please try again later or contact support.');
                    } else {
                        setSearchError('Error ' + error.response.status + ': ' + (error.response.data.error || 'Unknown error'));
                    }
                } else if (error.request) {
                    
                    setSearchError('No response received from server. Please check your internet connection.');
                } else {
                    
                    setSearchError('Error: ' + error.message);
                }
            }
        } catch (error) {
            setSearchError('Failed to search roads. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };
    
    const searchCollections = async () => {
        setIsSearching(true);
        setSearchError(null);
        try {
            
            const searchParams = {
                timestamp: new Date().getTime() 
            };
            if (searchQuery) {
                searchParams.query = searchQuery;
            }
            if (selectedTagIds.length > 0) {
                searchParams.tags = selectedTagIds.join(',');
            }
            if (selectedCountry) {
                searchParams.country = selectedCountry;
            }
            
            const response = await axios.get('/api/public-collections', {
                params: searchParams
            });
            
            let filteredCollections = [];
            if (response.data && response.data.data) {
                
                filteredCollections = response.data.data;
            } else if (Array.isArray(response.data)) {
                
                filteredCollections = response.data;
            } else if (response.data && Array.isArray(response.data.collections)) {
                
                filteredCollections = response.data.collections;
            }
            
            setSearchResults(prevResults => ({
                ...prevResults,
                collections: [...filteredCollections] 
            }));
        } catch (error) {
            setSearchError('Failed to search collections. Please try again.');
            
            setSearchResults(prevResults => ({
                ...prevResults,
                collections: []
            }));
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleSearch = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        if (searchType === 'roads') {
            setIsSearching(true);
            setSearchError(null);
            try {
                
                const searchParams = {
                    country: selectedCountry || '',
                    region: selectedRegion || '',
                    timestamp: new Date().getTime(), 
                    length_filter: lengthFilter || 'all',
                    curviness_filter: curvinessFilter || 'all',
                    min_rating: minRating || 0,
                    sort_by: sortBy || 'rating',
                    tags: selectedTagIds.length > 0 ? selectedTagIds.join(',') : null
                };
                try {
                    
                    const response = await axios.get('/api/public-roads', { params: searchParams });
                    let roads = [];
                    if (response.data && response.data.roads) {
                        roads = response.data.roads;
                    } else if (Array.isArray(response.data)) {
                        roads = response.data;
                    }
                    
                    if (selectedCountry) {
                        roads = roads.filter(road =>
                            road.country && road.country.toLowerCase() === selectedCountry.toLowerCase()
                        );
                    }
                    if (selectedRegion) {
                        roads = roads.filter(road =>
                            road.region && road.region.toLowerCase() === selectedRegion.toLowerCase()
                        );
                    }
                    
                    setSearchResults(prevResults => ({
                        ...prevResults,
                        roads: [...roads] 
                    }));
                } catch (error) {
                    setSearchResults(prevResults => ({ ...prevResults, roads: [] }));
                }
            } catch (error) {
                setSearchError('Failed to search roads. Please try again.');
            } finally {
                setIsSearching(false);
            }
        } else {
            searchCollections();
        }
    };
    
    const renderSearch = () => {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Search</h3>
                    <div className="flex space-x-2">
                        <button
                            className={'px-3 py-1 rounded-md ' + (searchType === 'roads' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
                            onClick={() => setSearchType('roads')}
                        >
                            <FaRoad className="inline mr-1" /> Roads
                        </button>
                        <button
                            className={'px-3 py-1 rounded-md ' + (searchType === 'collections' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
                            onClick={() => setSearchType('collections')}
                        >
                            <FaFolder className="inline mr-1" /> Collections
                        </button>
                    </div>
                </div>
                {searchError && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
                        {searchError}
                    </div>
                )}
                <CompactSearchForm
                    searchType={searchType}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedCountry={selectedCountry}
                    setSelectedCountry={setSelectedCountry}
                    selectedRegion={selectedRegion}
                    setSelectedRegion={setSelectedRegion}
                    countries={countries}
                    regions={regions}
                    loadingCountries={loadingCountries}
                    selectedTagIds={selectedTagIds}
                    setSelectedTagIds={setSelectedTagIds}
                    availableTags={availableTags}
                    handleSearch={handleSearch}
                    isSearching={isSearching}
                    minRating={minRating}
                    setMinRating={setMinRating}
                    curvinessFilter={curvinessFilter}
                    setCurvinessFilter={setCurvinessFilter}
                    lengthFilter={lengthFilter}
                    setLengthFilter={setLengthFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                />
                {$1}
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Search Results</h3>
                    {isSearching ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            <p className="mt-2 text-gray-600">Searching...</p>
                        </div>
                    ) : (
                        <>
                            {searchType === 'roads' && (
                                <div className="space-y-4">
                                    {searchResults.roads.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded border">
                                            <FaRoad className="mx-auto text-4xl text-gray-400 mb-2" />
                                            <p className="text-gray-600">No roads found matching your criteria</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {selectedCountry ?
                                                    ('No public roads found in ' + selectedCountry + (selectedRegion ? ', ' + selectedRegion : '') + '. ') :
                                                    'Try adjusting your search filters or '}
                                                {!selectedCountry && 'select a different country.'}
                                                {selectedCountry && 'Make sure you have made some roads public in this area.'}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Remember that only roads marked as public will appear in search results.
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                To make a road public, go to your saved roads, click on a road, and use the "Make Public" button.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-600">Found {searchResults.roads.length} roads</p>
                                            <div className="space-y-4">
                                                {searchResults.roads.map(road => (
                                                    <RoadCard
                                                        key={road.id}
                                                        road={road}
                                                        onViewMap={() => onViewRoad && onViewRoad(road)}
                                                        onViewUser={handleViewUser}
                                                        onViewDetails={(roadId, e) => {
                                                            if (onViewRoadDetails) {
                                                                onViewRoadDetails(roadId, e);
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {searchType === 'collections' && (
                                <div className="space-y-4">
                                    {searchResults.collections.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded border">
                                            <p className="text-gray-600">No collections found matching your criteria</p>
                                            <p className="text-sm text-gray-500 mt-1">Try adjusting your search filters</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-600">Found {searchResults.collections.length} collections</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {searchResults.collections.map(collection => (
                                                    <div key={collection.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                                        <div className="flex items-center">
                                                            {collection.cover_image ? (
                                                                <img
                                                                    src={'/storage/' + collection.cover_image}
                                                                    alt={collection.name}
                                                                    className="w-12 h-12 object-cover rounded"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                                                    <FaFolder className="text-gray-400" />
                                                                </div>
                                                            )}
                                                            <div className="ml-3">
                                                                <h4 className="font-medium">{collection.name}</h4>
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <span>{collection.roads_count || collection.roads?.length || 0} roads</span>
                                                                    <span className="mx-2">•</span>
                                                                    <span className="flex items-center">
                                                                        <ProfilePicture user={collection.user} size="xs" className="mr-1" />
                                                                        {collection.user?.name || 'Unknown User'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {collection.description && (
                                                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                                                {collection.description}
                                                            </p>
                                                        )}
                                                        {collection.tags && collection.tags.length > 0 && (
                                                            <div className="mt-2">
                                                                <CollapsibleTagSelector
                                                                    selectedTags={collection.tags}
                                                                    readOnly={true}
                                                                    entityType="collection"
                                                                    initialVisibleTags={3}
                                                                />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCollectionId(collection.id);
                                                                setShowCollectionDetailsModal(true);
                                                            }}
                                                            className="mt-2 text-sm text-blue-500 hover:text-blue-700"
                                                        >
                                                            View Details
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };
    const renderCollections = () => {
        return (
            <EnhancedCollections
                onViewCollection={(collection) => {
                    setSelectedCollectionId(collection.id);
                    setShowCollectionDetailsModal(true);
                }}
                onViewUser={handleViewUser}
                authState={authState}
            />
        );
    };
    const renderFollowing = () => {
        
        const token = localStorage.getItem('token');
        const tempAuthState = localStorage.getItem('temp_auth_state');
        const isActuallyAuthenticated = isAuthenticated || !!token || !!tempAuthState || !!window.isUserAuthenticated;
        if (!isActuallyAuthenticated) {
            return (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <p className="text-gray-600">You can view users, but you need to log in to follow them.</p>
                    <p className="mt-2 text-sm text-gray-500">Popular users will be displayed here.</p>
                </div>
            );
        }
        if (loading) {
            return <div className="text-center py-8">Loading following...</div>;
        }
        if (error) {
            return (
                <div className="text-center py-8 text-red-500">
                    {error}
                    <button
                        onClick={fetchFollowing}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return (
            <div>
                <h3 className="text-lg font-semibold mb-4">People You Follow</h3>
                {following.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded border">
                        <FaUserFriends className="mx-auto text-4xl text-gray-400 mb-2" />
                        <p className="text-gray-600">You aren't following anyone yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Follow other users to see their content in your feed
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {following.map(user => (
                            <div
                                key={user.id}
                                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleViewUser(user)}
                            >
                                <div className="flex items-center">
                                    <ProfilePicture user={user} size="md" />
                                    <div className="ml-3">
                                        <h4 className="font-medium">{user.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            @{user.username || 'user'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    const renderFeed = () => {
        
        const token = localStorage.getItem('token');
        const tempAuthState = localStorage.getItem('temp_auth_state');
        const isActuallyAuthenticated = isAuthenticated || !!token || !!tempAuthState || !!window.isUserAuthenticated;
        if (!isActuallyAuthenticated) {
            return (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <p className="text-gray-600">You can view popular content, but you need to log in to see a personalized feed.</p>
                    <p className="mt-2 text-sm text-gray-500">Recent popular roads and collections will be displayed here.</p>
                </div>
            );
        }
        if (loading) {
            return <div className="text-center py-8">Loading feed...</div>;
        }
        if (error) {
            return (
                <div className="text-center py-8 text-red-500">
                    {error}
                    <button
                        onClick={fetchFeed}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        const hasContent = feedContent.roads?.length > 0 || feedContent.collections?.length > 0;
        if (!hasContent) {
            return (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <FaUsers className="mx-auto text-4xl text-gray-400 mb-2" />
                    <p className="text-gray-600">Your feed is empty</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Follow other users to see their content here
                    </p>
                    <button
                        onClick={() => setActiveTab('following')}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Find People to Follow
                    </button>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {feedContent.roads?.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Recent Roads</h3>
                        <div className="space-y-4">
                            {feedContent.roads.map(road => {
                                
                                try {
                                    return (
                                        <RoadCard
                                            key={road.id}
                                            road={road}
                                            onViewMap={() => onViewRoad(road)}
                                            onViewUser={handleViewUser}
                                            onViewDetails={(roadId, e) => {
                                                if (onViewRoadDetails) {
                                                    onViewRoadDetails(roadId, e);
                                                }
                                            }}
                                        />
                                    );
                                } catch (error) {
                                    return (
                                        <div key={road.id} className="border rounded-lg p-4 bg-white">
                                            <h3 className="font-semibold text-lg">{road.road_name || 'Unnamed Road'}</h3>
                                            <p className="text-sm text-red-500">Error displaying road details</p>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                )}
                {feedContent.collections?.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Recent Collections</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedContent.collections.map(collection => (
                                <div key={collection.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                    <div className="flex items-center mb-2">
                                        <ProfilePicture user={collection.user} size="sm" />
                                        <div className="ml-2">
                                            <span className="font-medium">{collection.name}</span>
                                            <span className="text-sm text-gray-600 ml-1">
                                                by <UserMention
                                                    user={collection.user}
                                                    onViewUser={handleViewUser}
                                                    size="sm"
                                                />
                                            </span>
                                        </div>
                                    </div>
                                    {collection.description && (
                                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                            {collection.description}
                                        </p>
                                    )}
                                    <div className="text-xs text-gray-500">
                                        {collection.roads?.length || 0} roads
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };
    return (
        <>
            <Modal
                show={isOpen}
                onClose={showCollectionModal ? () => {} : onClose}
                maxWidth="4xl"
                staticBackdrop={true}>
                <div className="p-6" style={{ zIndex: 9000 }}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-blue-600">Social Hub</h2>
                        <div className="flex items-center">
                            {!isAuthenticated && (
                                <a
                                    href="/login"
                                    className="mr-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                >
                                    Login to Participate
                                </a>
                            )}
                            <button
                                onClick={() => {
                                    if (!showCollectionModal) {
                                        onClose();
                                    }
                                }}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                            >
                                <FaTimes className="text-xl" />
                            </button>
                        </div>
                    </div>
                    <div className="flex overflow-x-auto border-b mb-4">
                        <button
                            className={'px-4 py-3 ' + (activeTab === 'leaderboard' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600')}
                            onClick={() => {
                                setActiveTab('leaderboard');
                                if (setParentActiveTab) {
                                    setParentActiveTab('leaderboard');
                                }
                            }}
                        >
                            <FaTrophy className="inline mr-1" /> Leaderboard
                        </button>
                        <button
                            className={'px-4 py-3 ' + (activeTab === 'collections' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600')}
                            onClick={() => {
                                setActiveTab('collections');
                                if (setParentActiveTab) {
                                    setParentActiveTab('collections');
                                }
                            }}
                        >
                            <FaFolder className="inline mr-1" /> Collections
                        </button>
                        <button
                            className={'px-4 py-3 ' + (activeTab === 'following' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600')}
                            onClick={() => {
                                setActiveTab('following');
                                if (setParentActiveTab) {
                                    setParentActiveTab('following');
                                }
                            }}
                        >
                            <FaUserFriends className="inline mr-1" /> Following
                        </button>
                        <button
                            className={'px-4 py-3 ' + (activeTab === 'feed' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600')}
                            onClick={() => {
                                setActiveTab('feed');
                                if (setParentActiveTab) {
                                    setParentActiveTab('feed');
                                }
                            }}
                        >
                            <FaUsers className="inline mr-1" /> Feed
                        </button>
                        <button
                            className={'px-4 py-3 ' + (activeTab === 'search' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600')}
                            onClick={() => {
                                setActiveTab('search');
                                if (setParentActiveTab) {
                                    setParentActiveTab('search');
                                }
                            }}
                        >
                            <FaSearch className="inline mr-1" /> Search
                        </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {activeTab === 'leaderboard' && (
                            <Leaderboard
                                onViewRoad={onViewRoad}
                                onViewUser={handleViewUser}
                                onViewRoadDetails={onViewRoadDetails}
                            />
                        )}
                        {activeTab === 'collections' && renderCollections()}
                        {activeTab === 'following' && renderFollowing()}
                        {activeTab === 'feed' && renderFeed()}
                        {activeTab === 'search' && renderSearch()}
                    </div>
                </div>
            </Modal>
            {$1}
            <UserProfileModal
                isOpen={showUserProfileModal}
                onClose={() => setShowUserProfileModal(false)}
                userId={selectedUserId}
                currentUserId={user?.id}
            />
            {$1}
            <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => {
                    setShowCollectionModal(false);
                }}
                onSuccess={handleCollectionCreated}
                roadToAdd={roadToAdd && roadToAdd.id ? roadToAdd : null}
            />
            {$1}
            <CollectionDetailsModal
                isOpen={showCollectionDetailsModal}
                onClose={() => {
                    setShowCollectionDetailsModal(false);
                    
                    refreshCollections();
                }}
                collectionId={selectedCollectionId}
                onCollectionUpdated={refreshCollections}
            />
        </>
    );
}
