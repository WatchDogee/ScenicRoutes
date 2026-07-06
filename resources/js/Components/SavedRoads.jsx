import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../utils/apiClient';
import RatingModal from './RatingModal';
import RoadBadge from './RoadBadge';
import { showToast } from './ToastContainer';
import { FaSearch, FaFolder, FaFolderPlus, FaTrash, FaDownload, FaFilter, FaCheckSquare, FaSquare, FaTimes } from 'react-icons/fa';

export default function SavedRoads({ auth }) {
    const [roads, setRoads] = useState([]);
    const [publicRoads, setPublicRoads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [expandedRoads, setExpandedRoads] = useState({});
    const [isListExpanded, setIsListExpanded] = useState(true);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedRoadForReview, setSelectedRoadForReview] = useState(null);
    const [localRating, setLocalRating] = useState(0);
    const [localComment, setLocalComment] = useState('');
    
    // Enhanced management features
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('all'); // 'all', folder names, 'uncategorized'
    const [folders, setFolders] = useState([]); // Simple folder system (stored in localStorage for now)
    const [selectedRoads, setSelectedRoads] = useState([]); // For bulk operations
    const [showFilters, setShowFilters] = useState(false);
    const [filterCountry, setFilterCountry] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'rating', 'distance'
    useEffect(() => {
        if (auth.token) {
            fetchSavedRoads();
        }
    }, [auth.token]);
    
    // Listen for saved roads/routes updates
    useEffect(() => {
        const handleUpdate = () => {
            console.log('savedRoadsUpdated event received, refreshing roads list');
            if (auth.token) {
                // Add small delay to ensure backend has processed the save
                setTimeout(() => {
                    fetchSavedRoads();
                }, 300);
            }
        };
        window.addEventListener('savedRoadsUpdated', handleUpdate);
        return () => window.removeEventListener('savedRoadsUpdated', handleUpdate);
    }, [auth.token]);
    
    useEffect(() => {
        fetchPublicRoads();
    }, []);
    
    // Load folders from localStorage
    useEffect(() => {
        const savedFolders = localStorage.getItem('savedRoadsFolders');
        if (savedFolders) {
            try {
                setFolders(JSON.parse(savedFolders));
            } catch (e) {
                console.error('Error loading folders:', e);
            }
        }
    }, []);
    
    // Save folders to localStorage
    useEffect(() => {
        if (folders.length > 0) {
            localStorage.setItem('savedRoadsFolders', JSON.stringify(folders));
        }
    }, [folders]);
    const fetchSavedRoads = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/saved-roads');
            console.log('Fetched saved roads:', response.data);
            setRoads(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching saved roads:', error);
            setError('Failed to load saved roads');
            if (error.response?.status === 401) {
                window.dispatchEvent(new CustomEvent('auth:failed'));
            }
        } finally {
            setLoading(false);
        }
    };
    const fetchPublicRoads = async () => {
        try {
            const response = await apiClient.get('/api/public-roads');
            const roads = response.data.roads ? response.data.roads : response.data;
            setPublicRoads(roads);
        } catch (error) {
        }
    };
    const saveRoad = async (roadData) => {
        try {
            const response = await apiClient.post('/saved-roads', roadData);
            setRoads([...roads, response.data]);
            return response.data;
        } catch (error) {
            throw error;
        }
    };
    const deleteRoad = async (roadId) => {
        try {
            await apiClient.delete(`/saved-roads/${roadId}`);
            setRoads(roads.filter(road => road.id !== roadId));
            return { success: true, message: 'Road deleted successfully' };
        } catch (error) {
            let errorMessage = 'Failed to delete road. Please try again.';
            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = 'Road not found or you don\'t have permission to delete it.';
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            }
            throw new Error(errorMessage);
        }
    };
    const toggleRoadExpansion = (roadId) => {
        setExpandedRoads(prev => ({
            ...prev,
            [roadId]: !prev[roadId]
        }));
    };
    const handleViewDetails = async (road) => {
        try {
            const response = await apiClient.get(`/api/saved-roads/${road.id}`);
            setSelectedRoadForReview(response.data);
            setRatingModalOpen(true);
            if (auth?.user) {
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
            await apiClient.post(`/saved-roads/${selectedRoadForReview.id}/review`, {
                rating,
                comment
            });
            handleCloseRatingModal();
            fetchSavedRoads();
            fetchPublicRoads();
        } catch (error) {
        }
    };
    
    // Enhanced management functions
    const createFolder = (folderName) => {
        if (!folderName.trim()) return;
        const newFolder = {
            id: Date.now(),
            name: folderName.trim(),
            createdAt: new Date().toISOString()
        };
        setFolders([...folders, newFolder]);
    };
    
    const deleteFolder = (folderId) => {
        if (window.confirm('Delete this folder? Roads in this folder will be moved to "Uncategorized".')) {
            // Move roads from this folder to uncategorized
            const updatedRoads = roads.map(road => {
                if (road.folderId === folderId) {
                    return { ...road, folderId: null };
                }
                return road;
            });
            setRoads(updatedRoads);
            setFolders(folders.filter(f => f.id !== folderId));
            if (selectedFolder === folderId) {
                setSelectedFolder('uncategorized');
            }
        }
    };
    
    const moveRoadToFolder = (roadId, folderId) => {
        setRoads(roads.map(road => 
            road.id === roadId ? { ...road, folderId } : road
        ));
    };
    
    const toggleRoadSelection = (roadId) => {
        setSelectedRoads(prev => 
            prev.includes(roadId) 
                ? prev.filter(id => id !== roadId)
                : [...prev, roadId]
        );
    };
    
    const selectAllRoads = () => {
        setSelectedRoads(filteredAndSortedRoads.map(road => road.id));
    };
    
    const deselectAllRoads = () => {
        setSelectedRoads([]);
    };
    
    const bulkDelete = async () => {
        if (selectedRoads.length === 0) return;
        if (!window.confirm(`Delete ${selectedRoads.length} selected road(s)? This cannot be undone.`)) return;
        
        try {
            await Promise.all(selectedRoads.map(id => apiClient.delete(`/saved-roads/${id}`)));
            setRoads(roads.filter(road => !selectedRoads.includes(road.id)));
            setSelectedRoads([]);
            showToast(`${selectedRoads.length} road(s) deleted successfully!`, 'success', 3000);
        } catch (error) {
            showToast('Error deleting roads. Some may have been deleted.', 'error', 4000);
        }
    };
    
    const bulkExport = async () => {
        if (selectedRoads.length === 0) return;
        
        try {
            const selectedRoadsData = roads.filter(road => selectedRoads.includes(road.id));
            const gpxData = convertRoadsToGPX(selectedRoadsData);
            const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `saved-roads-${new Date().toISOString().split('T')[0]}.gpx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            showToast('Error exporting roads', 'error', 4000);
        }
    };
    
    const convertRoadsToGPX = (roadsData) => {
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">\n';
        roadsData.forEach(road => {
            if (road.road_coordinates && road.road_coordinates.length > 0) {
                gpx += '  <trk>\n';
                gpx += `    <name>${road.road_name || 'Unnamed Road'}</name>\n`;
                gpx += '    <trkseg>\n';
                road.road_coordinates.forEach(coord => {
                    gpx += `      <trkpt lat="${coord[0]}" lon="${coord[1]}">\n`;
                    if (coord[2]) {
                        gpx += `        <ele>${coord[2]}</ele>\n`;
                    }
                    gpx += '      </trkpt>\n';
                });
                gpx += '    </trkseg>\n';
                gpx += '  </trk>\n';
            }
        });
        gpx += '</gpx>';
        return gpx;
    };
    
    // Helper function to determine if a saved road is actually a route
    const getRoadType = (road) => {
        // Use route_type field - this should always be set when saving
        if (road.route_type === 'route') {
            return 'route';
        }
        // Default to 'road' if route_type is 'road' or null/undefined (legacy entries)
        return 'scenic_road';
    };
    
    // Filter and sort roads
    const filteredAndSortedRoads = useMemo(() => {
        let filtered = roads;
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(road => 
                (road.road_name || '').toLowerCase().includes(query) ||
                (road.description || '').toLowerCase().includes(query) ||
                (road.country || '').toLowerCase().includes(query) ||
                (road.region || '').toLowerCase().includes(query)
            );
        }
        
        // Folder filter
        if (selectedFolder !== 'all') {
            if (selectedFolder === 'uncategorized') {
                filtered = filtered.filter(road => !road.folderId);
            } else {
                filtered = filtered.filter(road => road.folderId === selectedFolder);
            }
        }
        
        // Country filter
        if (filterCountry) {
            filtered = filtered.filter(road => road.country === filterCountry);
        }
        
        // Region filter
        if (filterRegion) {
            filtered = filtered.filter(road => road.region === filterRegion);
        }
        
        // Sort
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.road_name || '').localeCompare(b.road_name || '');
                case 'rating':
                    return (b.average_rating || 0) - (a.average_rating || 0);
                case 'distance':
                    return (b.length || 0) - (a.length || 0);
                case 'recent':
                default:
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            }
        });
        
        return filtered;
    }, [roads, searchQuery, selectedFolder, filterCountry, filterRegion, sortBy]);
    
    const uniqueCountries = useMemo(() => 
        [...new Set(roads.map(r => r.country).filter(Boolean))].sort(),
        [roads]
    );
    
    const uniqueRegions = useMemo(() => 
        [...new Set(roads.map(r => r.region).filter(Boolean))].sort(),
        [roads]
    );
    if (error) {
        return <div className="error-message">{error}</div>;
    }
    return (
        <div className="p-4">
            {/* Enhanced Header with Search and Filters */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold">Saved Roads</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1"
                        >
                            <FaFilter />
                            Filters
                        </button>
                        <button
                            onClick={() => {
                                const folderName = prompt('Enter folder name:');
                                if (folderName) createFolder(folderName);
                            }}
                            className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
                        >
                            <FaFolderPlus />
                            New Folder
                        </button>
                    </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative mb-3">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search roads by name, description, country, region..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
                
                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                                <select
                                    value={filterCountry}
                                    onChange={(e) => setFilterCountry(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                >
                                    <option value="">All Countries</option>
                                    {uniqueCountries.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Region</label>
                                <select
                                    value={filterRegion}
                                    onChange={(e) => setFilterRegion(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                >
                                    <option value="">All Regions</option>
                                    {uniqueRegions.map(region => (
                                        <option key={region} value={region}>{region}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                >
                                    <option value="recent">Most Recent</option>
                                    <option value="name">Name (A-Z)</option>
                                    <option value="rating">Highest Rating</option>
                                    <option value="distance">Longest Distance</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Folder Navigation */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedFolder('all')}
                        className={`px-3 py-1 text-sm rounded whitespace-nowrap ${
                            selectedFolder === 'all' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                        All ({roads.length})
                    </button>
                    <button
                        onClick={() => setSelectedFolder('uncategorized')}
                        className={`px-3 py-1 text-sm rounded whitespace-nowrap ${
                            selectedFolder === 'uncategorized' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                        Uncategorized ({roads.filter(r => !r.folderId).length})
                    </button>
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => setSelectedFolder(folder.id)}
                            className={`px-3 py-1 text-sm rounded whitespace-nowrap flex items-center gap-1 ${
                                selectedFolder === folder.id 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                        >
                            <FaFolder />
                            {folder.name} ({roads.filter(r => r.folderId === folder.id).length})
                        </button>
                    ))}
                </div>
                
                {/* Bulk Operations */}
                {selectedRoads.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-700">
                                {selectedRoads.length} road(s) selected
                            </span>
                            <button
                                onClick={deselectAllRoads}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={bulkExport}
                                className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded flex items-center gap-1"
                            >
                                <FaDownload />
                                Export GPX
                            </button>
                            <button
                                onClick={bulkDelete}
                                className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded flex items-center gap-1"
                            >
                                <FaTrash />
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedRoads.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchQuery || filterCountry || filterRegion 
                                ? 'No roads match your filters.' 
                                : 'No saved roads yet.'}
                        </div>
                    ) : (
                        <>
                            {filteredAndSortedRoads.length !== roads.length && (
                                <div className="text-sm text-gray-600 mb-2">
                                    Showing {filteredAndSortedRoads.length} of {roads.length} roads
                                </div>
                            )}
                            {filteredAndSortedRoads.map(road => (
                            <div key={road.id} className={`border rounded-lg bg-white shadow ${
                                selectedRoads.includes(road.id) ? 'ring-2 ring-blue-500' : ''
                            }`}>
                                <div className="p-3">
                                    <div className="flex items-start gap-3">
                                        {/* Selection Checkbox */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleRoadSelection(road.id);
                                            }}
                                            className="mt-1 text-blue-500 hover:text-blue-700"
                                        >
                                            {selectedRoads.includes(road.id) ? (
                                                <FaCheckSquare />
                                            ) : (
                                                <FaSquare />
                                            )}
                                        </button>
                                        
                                        <div 
                                            className="flex-1 cursor-pointer"
                                            onClick={() => toggleRoadExpansion(road.id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium">{road.road_name || 'Unnamed Road'}</h3>
                                                        {getRoadType(road) === 'route' ? (
                                                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-semibold" title="Saved Route">
                                                                ROUTE
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold" title="Saved Road">
                                                                ROAD
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 mt-1 text-xs text-gray-500">
                                                        {road.country && <span>{road.country}</span>}
                                                        {road.region && <span>• {road.region}</span>}
                                                        {road.length && <span>• {Math.round(road.length / 1000)}km</span>}
                                                        {road.average_rating && (
                                                            <span>• ⭐ {road.average_rating.toFixed(1)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-gray-500 ml-2">
                                                    {expandedRoads[road.id] ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {expandedRoads[road.id] && (
                                        <div className="px-3 pb-3 border-t mt-3 pt-3">
                                            <p className="text-sm text-gray-600 mb-3">
                                                {road.description || 'No description available'}
                                            </p>
                                            
                                            {/* Folder Selection */}
                                            <div className="mb-3">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Folder
                                                </label>
                                                <select
                                                    value={road.folderId || ''}
                                                    onChange={(e) => moveRoadToFolder(road.id, e.target.value ? parseInt(e.target.value) : null)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="">Uncategorized</option>
                                                    {folders.map(folder => (
                                                        <option key={folder.id} value={folder.id}>
                                                            {folder.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDetails(road);
                                                    }}
                                                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`Are you sure you want to delete "${road.road_name || 'Unnamed Road'}"? This action cannot be undone.`)) {
                                                            try {
                                                                await deleteRoad(road.id);
                                                                showToast("Road deleted successfully!", 'success', 3000);
                                                            } catch (error) {
                                                                showToast(error.message, 'error', 4000);
                                                            }
                                                        }
                                                    }}
                                                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            ))}
                        </>
                    )}
                </div>
            )}
            
            {/* Select All / Deselect All */}
            {filteredAndSortedRoads.length > 0 && (
                <div className="mb-3 flex justify-between items-center">
                    <button
                        onClick={selectedRoads.length === filteredAndSortedRoads.length ? deselectAllRoads : selectAllRoads}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                        {selectedRoads.length === filteredAndSortedRoads.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            )}
            
            <h2 className="text-xl font-bold mt-8 mb-4">Public Roads</h2>
            <div className="space-y-4">
                {publicRoads.map(road => (
                    <div key={road.id} className="border rounded-lg p-4 bg-white shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{road.road_name || 'Unnamed Road'}</h3>
                                    {getRoadType(road) === 'route' ? (
                                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-semibold" title="Saved Route">
                                            ROUTE
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold" title="Saved Road">
                                            ROAD
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600">Rating: {road.average_rating || 'No ratings yet'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleViewDetails(road)}
                                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Rating Modal */}
            <RatingModal
                isOpen={ratingModalOpen}
                onClose={handleCloseRatingModal}
                onSubmit={handleSubmitReview}
                road={selectedRoadForReview}
                auth={auth}
                initialRating={localRating}
                initialComment={localComment}
            />
        </div>
    );
}