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

export default function SocialModal({ isOpen, onClose, onViewRoad, onViewRoadDetails, selectedCollectionId: initialCollectionId, roadToAdd, activeTab: initialActiveTab, setActiveTab: setParentActiveTab }) {
    // Get auth state from parent component or localStorage
    const [authState, setAuthState] = useState({
        isAuthenticated: !!localStorage.getItem('token'),
        user: null
    });

    // Check auth state on mount
    useEffect(() => {
        console.log('SocialModal mounted, isOpen:', isOpen);

        // Force the modal to be visible
        if (isOpen) {
            // Add a class to the body to ensure the modal is visible
            document.body.classList.add('social-modal-open');

            // Add a style tag to ensure the modal is visible
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

        // Check if we have global auth state from the Map component
        if (window.isUserAuthenticated && window.userId) {
            console.log('Using global auth state for SocialModal');
            setAuthState({
                isAuthenticated: true,
                user: { id: window.userId }
            });
        } else {
            // Fallback to token check
            const token = localStorage.getItem('token');
            if (token) {
                axios.get('/api/user', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                .then(response => {
                    console.log('User data loaded for SocialModal');
                    setAuthState({
                        isAuthenticated: true,
                        user: response.data
                    });
                })
                .catch((error) => {
                    console.error('Error loading user data for SocialModal:', error);
                    setAuthState({
                        isAuthenticated: false,
                        user: null
                    });
                });
            } else {
                console.log('No token found for SocialModal');
            }
        }

        // Cleanup function
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

    // Search state
    const [searchType, setSearchType] = useState('roads'); // 'roads' or 'collections'
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
            // Double-check authentication status
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
                // Fetch available tags for search filtering
                fetchAvailableTags();
                // Fetch available countries
                fetchCountries();

                // Load all public roads by default when search tab is opened
                fetchAllPublicRoads();
            }
        }
    }, [activeTab, isAuthenticated, user, isOpen]);

    // Function to fetch all public roads
    const fetchAllPublicRoads = async () => {
        try {
            setIsSearching(true);

            const response = await axios.get('/api/public-roads', {
                params: { timestamp: new Date().getTime() } // Prevent caching
            });

            if (response.data && response.data.roads) {
                setSearchResults(prevResults => ({
                    ...prevResults,
                    roads: [...response.data.roads] // Create a new array to ensure state update
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
            console.error('Error fetching public roads:', error);
            setSearchResults(prevResults => ({ ...prevResults, roads: [] }));
        } finally {
            setIsSearching(false);
        }
    };

    // Fetch available tags for search filtering
    const fetchAvailableTags = async () => {
        try {
            // Try to fetch tags from the API
            try {
                const response = await axios.get('/api/tags');
                setAvailableTags(response.data);
            } catch (apiError) {
                console.error('Error fetching tags:', apiError);

                // Use default tags if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using default tags for development');
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
            console.error('Error in tag handling:', error);
            setSearchError('Failed to load tags for filtering');
        }
    };

    // Fetch available countries
    const fetchCountries = async () => {
        try {
            setLoadingCountries(true);

            // First try to get countries from the API - only get countries with public roads
            try {
                const response = await axios.get('/api/countries', {
                    params: { public_only: true }
                });
                console.log('Countries from API:', response.data);

                if (response.data && response.data.length > 0) {
                    setCountries(response.data);
                } else {
                    // If no countries returned, add some default countries for testing
                    console.log('No countries returned from API, adding default countries');
                    setCountries(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
                }
            } catch (apiError) {
                console.error('Error fetching countries from API:', apiError);
                // Add default countries for testing
                console.log('Adding default countries due to API error');
                setCountries(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
            }

            // Try to get debug information about available roads
            try {
                const debugResponse = await axios.get('/api/debug/roads');
                console.log('Debug roads information:', debugResponse.data);

                if (debugResponse.data && debugResponse.data.countries && debugResponse.data.countries.length > 0) {
                    console.log('Found countries with roads in database:', debugResponse.data.countries);
                    // Update countries list with actual data from database
                    setCountries(debugResponse.data.countries);
                }
            } catch (debugError) {
                console.error('Error fetching debug road information:', debugError);
            }

            setLoadingCountries(false);
        } catch (error) {
            console.error('Error in fetchCountries:', error);
            setLoadingCountries(false);
            // Add default countries as fallback
            setCountries(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
        }
    };

    // Fetch regions for a selected country
    const fetchRegions = async (country) => {
        if (!country) {
            setRegions([]);
            return;
        }

        try {
            // First try to get regions from the API - only get regions with public roads
            try {
                const response = await axios.get('/api/regions', {
                    params: {
                        country,
                        public_only: true
                    }
                });
                console.log(`Regions for ${country} from API:`, response.data);

                if (response.data && response.data.length > 0) {
                    setRegions(response.data);
                } else {
                    // If no regions returned, add some default regions for testing
                    console.log(`No regions returned for ${country}, adding default regions`);

                    // Add default regions based on country
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
                console.error(`Error fetching regions for ${country} from API:`, apiError);
                // Add default regions for testing
                console.log(`Adding default regions for ${country} due to API error`);

                // Add default regions based on country
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
            console.error(`Error in fetchRegions for ${country}:`, error);
            setRegions([]);

            // Add default regions as fallback
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

    // Handle country selection
    useEffect(() => {
        if (selectedCountry) {
            fetchRegions(selectedCountry);
        } else {
            setRegions([]);
            setSelectedRegion('');
        }
    }, [selectedCountry]);

    // Handle selected collection ID from props
    useEffect(() => {
        if (isOpen && initialCollectionId) {
            console.log('Selected collection ID received:', initialCollectionId);
            setSelectedCollectionId(initialCollectionId);
            setShowCollectionDetailsModal(true);
            // Switch to collections tab
            setActiveTab('collections');
            if (setParentActiveTab) {
                setParentActiveTab('collections');
            }
        }
    }, [isOpen, initialCollectionId]);

    // Handle road to add to collection
    useEffect(() => {
        if (isOpen && roadToAdd) {
            console.log('SocialModal: Road to add to collection received:', roadToAdd);

            // Check if this is a new road being added with a valid ID
            const isNewRoadAddition = roadToAdd && roadToAdd.id;

            if (isNewRoadAddition) {
                console.log('SocialModal: Valid road detected, preparing to open collection modal');

                // Switch to collections tab
                setActiveTab('collections');
                if (setParentActiveTab) {
                    setParentActiveTab('collections');
                }

                // Add a longer delay before opening the collection modal
                // This ensures any previous modals are fully closed and DOM is updated
                setTimeout(() => {
                    // Check again that the component is still mounted and the road is still valid
                    if (isOpen && roadToAdd && roadToAdd.id) {
                        console.log('SocialModal: Opening collection modal for road:', roadToAdd.id);

                        // First make sure no other modals are open
                        setShowCollectionDetailsModal(false);
                        setShowUserProfileModal(false);

                        // Then open the collection modal
                        setShowCollectionModal(true);
                    }
                }, 300);
            } else {
                console.log('SocialModal: Ignoring roadToAdd as it appears to be invalid or from a previous session');
            }
        }
    }, [isOpen, roadToAdd]);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            // Check if the API endpoint is available
            try {
                const response = await axios.get('/api/collections');
                setCollections(response.data);
                setError(null);
            } catch (apiError) {
                console.error('Error fetching collections:', apiError);
                // For development purposes, use mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using mock collections data for development');
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
            console.error('Error in collections handling:', error);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowing = async () => {
        try {
            setLoading(true);
            // Check if the API endpoint is available
            try {
                const response = await axios.get('/api/following');
                setFollowing(response.data.data || []);
                setError(null);
            } catch (apiError) {
                console.error('Error fetching following:', apiError);
                // For development purposes, use mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using mock following data for development');
                    setFollowing([
                        { id: 1, name: 'John Doe', username: 'johndoe', profile_picture_url: null },
                        { id: 2, name: 'Jane Smith', username: 'janesmith', profile_picture_url: null }
                    ]);
                } else {
                    setError('Failed to load following users. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            console.error('Error in following handling:', error);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchFeed = async () => {
        try {
            setLoading(true);
            // Check if the API endpoint is available
            try {
                const response = await axios.get('/api/feed');
                setFeedContent(response.data);
                setError(null);
            } catch (apiError) {
                console.error('Error fetching feed:', apiError);
                // For development purposes, use mock data if API fails
                if (process.env.NODE_ENV === 'development') {
                    console.log('Using mock feed data for development');
                    setFeedContent({
                        roads: [
                            {
                                id: 1,
                                road_name: 'Alpine Pass',
                                length: 18000,
                                user: { name: 'John Doe', profile_picture_url: null },
                                road_coordinates: [
                                    { lat: 47.1, lon: 9.5 },
                                    { lat: 47.2, lon: 9.6 }
                                ]
                            }
                        ],
                        collections: [
                            {
                                id: 1,
                                name: 'Mountain Roads',
                                description: 'Best mountain roads in Europe',
                                user: { name: 'Jane Smith', profile_picture_url: null },
                                roads: [{ id: 1, road_name: 'Alpine Pass' }]
                            }
                        ]
                    });
                } else {
                    setError('Failed to load feed. The API endpoint may not be implemented yet.');
                }
            }
        } catch (error) {
            console.error('Error in feed handling:', error);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleCollectionCreated = (collection) => {
        console.log('Collection created:', collection);
        setCollections(prev => [collection, ...prev]);
        setShowCollectionModal(false);
    };

    // Function to refresh collections data
    const refreshCollections = () => {
        console.log('Refreshing collections data');
        fetchCollections();
    };

    const handleViewUser = (user) => {
        setSelectedUserId(user.id);
        setShowUserProfileModal(true);
    };

    const handleFollowChange = () => {
        // Refresh following list if we're on the following tab
        if (activeTab === 'following') {
            fetchFollowing();
        }
        // Refresh feed if we're on the feed tab
        if (activeTab === 'feed') {
            fetchFeed();
        }
    };

    // Search for location using Nominatim API
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
            console.error('Error searching location:', error);
            setSearchError('Failed to search location. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    // Format location name for display
    const formatLocationName = (result) => {
        const address = result.address;
        const parts = [];

        // Add the most specific location first
        if (address.city || address.town || address.village || address.municipality) {
            parts.push(address.city || address.town || address.village || address.municipality);
        }

        // Add county/state/region if available
        if (address.county) {
            parts.push(address.county);
        } else if (address.state || address.region) {
            parts.push(address.state || address.region);
        }

        // Always add country
        if (address.country) {
            parts.push(address.country);
        }

        // If no parts were added (e.g., for natural features), use the display name
        if (parts.length === 0) {
            return result.display_name.split(',').slice(0, 3).join(',');
        }

        return parts.join(', ');
    };

    // Handle location selection
    const handleLocationSelect = (location) => {
        setSearchLocation(location.displayName);
        setLocationSearchResults([]);
    };

    // Search for roads based on current filters
    const searchRoads = async () => {
        console.log('searchRoads function called');
        setIsSearching(true);
        setSearchError(null);

        try {
            // Get coordinates from selected location if provided
            let lat, lon;
            let searchParams = {
                length_filter: lengthFilter,
                curviness_filter: curvinessFilter,
                min_rating: minRating,
                sort_by: sortBy,
                tags: selectedTagIds.length > 0 ? selectedTagIds.join(',') : null,
                debug: true // Always include debug parameter
            };

            // Add a timestamp to prevent caching
            searchParams.timestamp = new Date().getTime();

            console.log('Search initiated with params:', searchParams);

            console.log('Initial search params:', searchParams);

            // Add country and region filters if selected
            if (selectedCountry) {
                searchParams.country = selectedCountry.trim();
                console.log(`Setting country parameter to: "${searchParams.country}"`);

                if (selectedRegion) {
                    searchParams.region = selectedRegion.trim();
                    console.log(`Setting region parameter to: "${searchParams.region}"`);
                }

                // If country is selected, we don't necessarily need coordinates
                if (!searchLocation) {
                    // Make the API call with just country/region filters
                    console.log('Making country-based API call with params:', searchParams);

                    // Add debug information to the request
                    searchParams.debug = true;
                    searchParams.timestamp = new Date().getTime();

                    // Log the exact parameters being sent
                    console.log('Search parameters being sent to API:');
                    Object.entries(searchParams).forEach(([key, value]) => {
                        console.log(`  ${key}: ${value} (type: ${typeof value})`);
                    });

                    try {
                        // Try the regular endpoint first
                        console.log('Using public-roads endpoint for search...');

                        const response = await axios.get('/api/public-roads', { params: searchParams });
                        console.log('Public-roads search response:', response.data);

                        // Check if we have a debug response format or regular array
                        if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                            console.log('Public-roads endpoint found roads! Using these results.');
                            setSearchResults({
                                ...searchResults,
                                roads: response.data.roads
                            });

                            // Exit early with success
                            setIsSearching(false);
                            return;
                        } else if (Array.isArray(response.data)) {
                            console.log('Public-roads endpoint found roads! Using these results.');
                            setSearchResults({
                                ...searchResults,
                                roads: response.data
                            });

                            // Exit early with success
                            setIsSearching(false);
                            return;
                        }

                        // If we get here, the response format was unexpected or no roads were found
                        // Fall back to debug endpoint without create_test
                        console.log('Public-roads endpoint returned unexpected format or no roads. Trying debug endpoint...');

                        const debugParams = {
                            ...searchParams,
                            debug: true
                        };

                        const debugResponse = await axios.get('/api/debug/search', { params: debugParams });
                        console.log('Debug search response:', debugResponse.data);

                        if (debugResponse.data && debugResponse.data.roads && debugResponse.data.roads.length > 0) {
                            console.log('Debug endpoint found roads! Using these results.');
                            setSearchResults({
                                ...searchResults,
                                roads: debugResponse.data.roads
                            });

                            // Exit early with success
                            setIsSearching(false);
                            return;
                        }

                        // If both endpoints didn't find roads, log the issue
                        console.log('Both endpoints found no roads with the current search parameters.');
                        console.log('Country-based search parameters:', searchParams);

                        // Log the country and region values that were used
                        console.log('Search was performed with country:', searchParams.country);
                        if (searchParams.region) {
                            console.log('Search was performed with region:', searchParams.region);
                        }

                        // Check if we have a debug response format
                        if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                            console.log('Debug info received:', response.data.debug);

                            setSearchResults({
                                ...searchResults,
                                roads: response.data.roads
                            });

                            // Log the results for debugging
                            if (response.data.roads.length === 0) {
                                console.log('No roads found with the current country/region parameters');
                                console.log(`No roads found in country: ${selectedCountry}`);
                                if (selectedRegion) {
                                    console.log(`No roads found in region: ${selectedRegion}`);
                                }

                                // Log debug information if available
                                if (response.data.debug && response.data.debug.debug_info) {
                                    const debugInfo = response.data.debug.debug_info;
                                    console.log('Debug information:', debugInfo);
                                    console.log(`Total roads in database: ${debugInfo.total_roads}`);
                                    console.log(`Public roads in database: ${debugInfo.public_roads}`);
                                    console.log(`Countries in database: ${debugInfo.countries_in_db.join(', ')}`);
                                    console.log(`Regions in database: ${debugInfo.regions_in_db.join(', ')}`);

                                    // If no roads found but we have test roads in the database, try creating a test road
                                    if (debugInfo.public_roads > 0 && response.data.roads.length === 0) {
                                        console.log('No roads found in search results but public roads exist. Trying to create a test road...');

                                        // Try creating a test road
                                        const testParams = {
                                            country: searchParams.country,
                                            region: searchParams.region || 'Riga',
                                            debug: true,
                                            create_test: true,
                                            timestamp: new Date().getTime()
                                        };

                                        try {
                                            const testResponse = await axios.get('/api/public-roads', { params: testParams });
                                            console.log('Test road creation response:', testResponse.data);

                                            // Try searching again
                                            const newResponse = await axios.get('/api/public-roads', { params: searchParams });

                                            if (newResponse.data && newResponse.data.roads && Array.isArray(newResponse.data.roads)) {
                                                setSearchResults({
                                                    ...searchResults,
                                                    roads: newResponse.data.roads
                                                });

                                                if (newResponse.data.roads.length > 0) {
                                                    console.log(`Found ${newResponse.data.roads.length} roads after creating test road`);
                                                }
                                            }
                                        } catch (testError) {
                                            console.error('Error creating test road:', testError);
                                        }
                                    }
                                }
                            } else {
                                console.log(`Found ${response.data.roads.length} roads matching the country/region criteria`);
                            }
                        }
                        // Handle regular array response
                        else if (Array.isArray(response.data)) {
                            setSearchResults({
                                ...searchResults,
                                roads: response.data
                            });

                            // Log the results for debugging
                            if (response.data.length === 0) {
                                console.log('No roads found with the current country/region parameters');
                                console.log(`No roads found in country: ${selectedCountry}`);
                                if (selectedRegion) {
                                    console.log(`No roads found in region: ${selectedRegion}`);
                                }

                                // Try creating a test road
                                const testParams = {
                                    country: searchParams.country,
                                    region: searchParams.region || 'Riga',
                                    debug: true,
                                    create_test: true,
                                    timestamp: new Date().getTime()
                                };

                                try {
                                    const testResponse = await axios.get('/api/public-roads', { params: testParams });
                                    console.log('Test road creation response:', testResponse.data);

                                    // Try searching again
                                    const newResponse = await axios.get('/api/public-roads', { params: searchParams });

                                    if (Array.isArray(newResponse.data)) {
                                        setSearchResults({
                                            ...searchResults,
                                            roads: newResponse.data
                                        });

                                        if (newResponse.data.length > 0) {
                                            console.log(`Found ${newResponse.data.length} roads after creating test road`);
                                        }
                                    }
                                } catch (testError) {
                                    console.error('Error creating test road:', testError);
                                }
                            } else {
                                console.log(`Found ${response.data.length} roads matching the country/region criteria`);
                            }
                        } else {
                            console.error('Country-based response data is not an array:', response.data);
                            setSearchError('Received invalid data format from the server. Please try again.');
                        }
                    } catch (error) {
                        console.error('Country-based API call error:', error);
                        if (error.response) {
                            console.error('Country-based error response data:', error.response.data);
                            console.error('Country-based error response status:', error.response.status);

                            // Provide more specific error message based on status code
                            if (error.response.status === 404) {
                                setSearchError('The search endpoint was not found. Please contact support.');
                            } else if (error.response.status === 500) {
                                setSearchError('Server error occurred. Please try again later or contact support.');
                            } else {
                                setSearchError(`Error ${error.response.status}: ${error.response.data.error || 'Unknown error'}`);
                            }
                        } else if (error.request) {
                            console.error('No response received:', error.request);
                            setSearchError('No response received from server. Please check your internet connection.');
                        } else {
                            console.error('Error setting up request:', error.message);
                            setSearchError(`Error: ${error.message}`);
                        }
                    }
                    setIsSearching(false);
                    return;
                }
            }

            // If we have a location search, get coordinates
            if (searchLocation) {
                // Search for the location first
                const locationResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
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

                // Add coordinates to search params
                searchParams.lat = lat;
                searchParams.lon = lon;
            }

            // Search for roads with all applicable parameters
            console.log('Making API call to /api/public-roads with params:', searchParams);
            try {
                const response = await axios.get('/api/public-roads', { params: searchParams });
                console.log('Search response:', response.data);
                console.log('Response status:', response.status);
                console.log('Response data length:', Array.isArray(response.data) ? response.data.length : 'Not an array');

                // Check if we have a debug response format
                if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                    console.log('Debug info received:', response.data.debug);

                    setSearchResults({
                        ...searchResults,
                        roads: response.data.roads
                    });

                    // Log the results for debugging
                    if (response.data.roads.length === 0) {
                        console.log('No roads found with the current search parameters');
                        if (selectedCountry) {
                            console.log(`No roads found in country: ${selectedCountry}`);
                        }
                        if (selectedRegion) {
                            console.log(`No roads found in region: ${selectedRegion}`);
                        }

                        // Log debug information if available
                        if (response.data.debug && response.data.debug.debug_info) {
                            const debugInfo = response.data.debug.debug_info;
                            console.log('Debug information:', debugInfo);
                            console.log(`Total roads in database: ${debugInfo.total_roads}`);
                            console.log(`Public roads in database: ${debugInfo.public_roads}`);
                            console.log(`Countries in database: ${debugInfo.countries_in_db.join(', ')}`);
                            console.log(`Regions in database: ${debugInfo.regions_in_db.join(', ')}`);
                        }
                    } else {
                        console.log(`Found ${response.data.roads.length} roads matching the search criteria`);
                    }
                }
                // Handle regular array response
                else if (Array.isArray(response.data)) {
                    setSearchResults({
                        ...searchResults,
                        roads: response.data
                    });

                    // Log the results for debugging
                    if (response.data.length === 0) {
                        console.log('No roads found with the current search parameters');
                        if (selectedCountry) {
                            console.log(`No roads found in country: ${selectedCountry}`);
                        }
                        if (selectedRegion) {
                            console.log(`No roads found in region: ${selectedRegion}`);
                        }
                    } else {
                        console.log(`Found ${response.data.length} roads matching the search criteria`);
                    }
                } else {
                    console.error('Response data is not an array:', response.data);
                    setSearchError('Received invalid data format from the server. Please try again.');
                }
            } catch (error) {
                console.error('API call error:', error);
                if (error.response) {
                    console.error('Error response data:', error.response.data);
                    console.error('Error response status:', error.response.status);

                    // Provide more specific error message based on status code
                    if (error.response.status === 404) {
                        setSearchError('The search endpoint was not found. Please contact support.');
                    } else if (error.response.status === 500) {
                        setSearchError('Server error occurred. Please try again later or contact support.');
                    } else {
                        setSearchError(`Error ${error.response.status}: ${error.response.data.error || 'Unknown error'}`);
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    console.error('No response received:', error.request);
                    setSearchError('No response received from server. Please check your internet connection.');
                } else {
                    // Something happened in setting up the request
                    console.error('Error setting up request:', error.message);
                    setSearchError(`Error: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('Error searching roads:', error);
            setSearchError('Failed to search roads. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    // Search for collections
    const searchCollections = async () => {
        setIsSearching(true);
        setSearchError(null);

        try {
            // Build search parameters
            const searchParams = {
                timestamp: new Date().getTime() // Prevent caching
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

            // Fetch collections with filters applied on the server
            const response = await axios.get('/api/public-collections', {
                params: searchParams
            });

            // Handle different response formats
            let filteredCollections = [];

            if (response.data && response.data.data) {
                // Paginated response format
                filteredCollections = response.data.data;
            } else if (Array.isArray(response.data)) {
                // Direct array response format
                filteredCollections = response.data;
            } else if (response.data && Array.isArray(response.data.collections)) {
                // Object with collections array
                filteredCollections = response.data.collections;
            }

            // Update state with filtered collections
            setSearchResults(prevResults => ({
                ...prevResults,
                collections: [...filteredCollections] // Create a new array to ensure state update
            }));
        } catch (error) {
            console.error('Error searching collections:', error);
            setSearchError('Failed to search collections. Please try again.');

            // Set empty collections array on error
            setSearchResults(prevResults => ({
                ...prevResults,
                collections: []
            }));
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search form submission
    const handleSearch = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if (searchType === 'roads') {
            setIsSearching(true);
            setSearchError(null);

            try {
                // Build search parameters
                const searchParams = {
                    country: selectedCountry || '',
                    region: selectedRegion || '',
                    timestamp: new Date().getTime(), // Prevent caching
                    length_filter: lengthFilter || 'all',
                    curviness_filter: curvinessFilter || 'all',
                    min_rating: minRating || 0,
                    sort_by: sortBy || 'rating',
                    tags: selectedTagIds.length > 0 ? selectedTagIds.join(',') : null
                };

                try {
                    // Get public roads with filters
                    const response = await axios.get('/api/public-roads', { params: searchParams });

                    let roads = [];
                    if (response.data && response.data.roads) {
                        roads = response.data.roads;
                    } else if (Array.isArray(response.data)) {
                        roads = response.data;
                    }

                    // Filter roads based on country and region if specified
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

                    // Update state with filtered roads
                    setSearchResults(prevResults => ({
                        ...prevResults,
                        roads: [...roads] // Create a new array to ensure state update
                    }));
                } catch (error) {
                    console.error('Error searching roads:', error);
                    setSearchResults(prevResults => ({ ...prevResults, roads: [] }));
                }
            } catch (error) {
                console.error('Error searching roads:', error);
                setSearchError('Failed to search roads. Please try again.');
            } finally {
                setIsSearching(false);
            }
        } else {
            searchCollections();
        }
    };

    // Render the search interface
    const renderSearch = () => {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Search</h3>
                    <div className="flex space-x-2">
                        <button
                            className={`px-3 py-1 rounded-md ${searchType === 'roads' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            onClick={() => setSearchType('roads')}
                        >
                            <FaRoad className="inline mr-1" /> Roads
                        </button>
                        <button
                            className={`px-3 py-1 rounded-md ${searchType === 'collections' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
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

                {/* Search Results */}
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
                                                    `No public roads found in ${selectedCountry}${selectedRegion ? `, ${selectedRegion}` : ''}. ` :
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
                                                                    src={`/storage/${collection.cover_image}`}
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
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {collection.tags.map(tag => (
                                                                    <span key={tag.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                                                        {tag.name}
                                                                    </span>
                                                                ))}
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
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Your Collections</h3>
                    <button
                        onClick={() => {
                            console.log('Opening collection modal');
                            setShowCollectionModal(true);
                        }}
                        className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        <FaPlus className="mr-1" /> New Collection
                    </button>
                </div>

                {!isAuthenticated ? (
                    <div className="text-center py-8 bg-gray-50 rounded border">
                        <p className="text-gray-600">You need to log in to create and manage your collections.</p>
                        <a
                            href="/login"
                            className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Log In
                        </a>
                    </div>
                ) : loading ? (
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
                ) : collections.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded border">
                        <FaFolder className="mx-auto text-4xl text-gray-400 mb-2" />
                        <p className="text-gray-600">You don't have any collections yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Create a collection to organize your favorite roads
                        </p>
                        <button
                            onClick={() => {
                                console.log('Opening collection modal from empty state');
                                setShowCollectionModal(true);
                            }}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Create Collection
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {collections.map(collection => (
                            <div key={collection.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                <div className="flex items-center">
                                    {collection.cover_image ? (
                                        <img
                                            src={`/storage/${collection.cover_image}`}
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
                                        <p className="text-sm text-gray-600">
                                            {collection.roads?.length || 0} roads
                                        </p>
                                    </div>
                                </div>

                                {collection.description && (
                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                        {collection.description}
                                    </p>
                                )}

                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-500">
                                        {collection.is_public ? 'Public' : 'Private'}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setSelectedCollectionId(collection.id);
                                            setShowCollectionDetailsModal(true);
                                        }}
                                        className="text-sm text-blue-500 hover:text-blue-700"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderFollowing = () => {
        // Double-check authentication status
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
        // Double-check authentication status
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
                                // Add error boundary for each road card
                                try {
                                    return (
                                        <RoadCard
                                            key={road.id}
                                            road={road}
                                            onViewMap={() => onViewRoad(road)}
                                            onViewDetails={(roadId, e) => {
                                                if (onViewRoadDetails) {
                                                    onViewRoadDetails(roadId, e);
                                                }
                                            }}
                                        />
                                    );
                                } catch (error) {
                                    console.error("Error rendering road card:", error, road);
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
                                                by {collection.user.name}
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
                                    console.log('Close button clicked in SocialModal');
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
                            className={`px-4 py-3 ${activeTab === 'leaderboard' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
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
                            className={`px-4 py-3 ${activeTab === 'collections' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
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
                            className={`px-4 py-3 ${activeTab === 'following' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
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
                            className={`px-4 py-3 ${activeTab === 'feed' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
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
                            className={`px-4 py-3 ${activeTab === 'search' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
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

            {/* User Profile Modal - moved outside to prevent being cropped */}
            <UserProfileModal
                isOpen={showUserProfileModal}
                onClose={() => setShowUserProfileModal(false)}
                userId={selectedUserId}
                currentUserId={user?.id}
            />

            {/* Collection Modal - moved outside to prevent being cropped */}
            <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => {
                    console.log('Closing collection modal');
                    setShowCollectionModal(false);
                }}
                onSuccess={handleCollectionCreated}
                roadToAdd={roadToAdd && roadToAdd.id ? roadToAdd : null}
            />

            {/* Collection Details Modal */}
            <CollectionDetailsModal
                isOpen={showCollectionDetailsModal}
                onClose={() => {
                    setShowCollectionDetailsModal(false);
                    // Refresh collections when modal is closed
                    refreshCollections();
                }}
                collectionId={selectedCollectionId}
                onCollectionUpdated={refreshCollections}
            />
        </>
    );
}
