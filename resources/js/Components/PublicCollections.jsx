import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFolder, FaSearch, FaGlobe, FaTag, FaRoad, FaUser } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
export default function PublicCollections({ onViewCollection, onViewUser }) {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [countries, setCountries] = useState([]);
    const [tags, setTags] = useState([]);
    useEffect(() => {
        fetchPublicCollections();
        fetchCountries();
        fetchTags();
    }, []);
    useEffect(() => {
        if (selectedCountry) {
            fetchCollectionsByCountry(selectedCountry);
        } else if (selectedTag) {
            fetchCollectionsByTag(selectedTag);
        } else if (searchQuery) {
            searchCollections(searchQuery);
        } else {
            fetchPublicCollections();
        }
    }, [selectedCountry, selectedTag, searchQuery]);
    const fetchPublicCollections = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/public-collections');
            setCollections(response.data.data || response.data);
            setError(null);
        } catch (error) {
            setError('Failed to load public collections');
        } finally {
            setLoading(false);
        }
    };
    const fetchCollectionsByCountry = async (country) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/collections-by-country?country=${country}`);
            setCollections(response.data);
            setError(null);
        } catch (error) {
            setError('Failed to load collections for this country');
        } finally {
            setLoading(false);
        }
    };
    const fetchCollectionsByTag = async (tagId) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/collections-by-tag?tag_id=${tagId}`);
            setCollections(response.data);
            setError(null);
        } catch (error) {
            setError('Failed to load collections for this tag');
        } finally {
            setLoading(false);
        }
    };
    const searchCollections = async (query) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/public-collections?query=${query}`);
            setCollections(response.data.data || response.data);
            setError(null);
        } catch (error) {
            setError('Failed to search collections');
        } finally {
            setLoading(false);
        }
    };
    const fetchCountries = async () => {
        try {
            const response = await axios.get('/api/countries');
            setCountries(response.data);
        } catch (error) {
        }
    };
    const fetchTags = async () => {
        try {
            const response = await axios.get('/api/tags');
            setTags(response.data);
        } catch (error) {
        }
    };
    const handleSearch = (e) => {
        e.preventDefault();
        
    };
    const handleCountryChange = (e) => {
        setSelectedCountry(e.target.value);
        setSelectedTag(''); 
    };
    const handleTagChange = (e) => {
        setSelectedTag(e.target.value);
        setSelectedCountry(''); 
    };
    const handleClearFilters = () => {
        setSelectedCountry('');
        setSelectedTag('');
        setSearchQuery('');
        fetchPublicCollections();
    };
    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Public Collections</h2>
            <div className="mb-4">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search collections..."
                                className="w-full px-4 py-2 border rounded-lg pr-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <FaSearch className="absolute right-3 top-3 text-gray-400" />
                        </div>
                    </div>
                    <select
                        className="px-4 py-2 border rounded-lg"
                        value={selectedCountry}
                        onChange={handleCountryChange}
                    >
                        <option value="">Filter by Country</option>
                        {countries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                    <select
                        className="px-4 py-2 border rounded-lg"
                        value={selectedTag}
                        onChange={handleTagChange}
                    >
                        <option value="">Filter by Tag</option>
                        {tags.map(tag => (
                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                        ))}
                    </select>
                    {(selectedCountry || selectedTag || searchQuery) && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Clear Filters
                        </button>
                    )}
                </form>
            </div>
            {loading ? (
                <div className="text-center py-8">Loading collections...</div>
            ) : error ? (
                <div className="text-center py-8 text-red-500">
                    {error}
                    <button
                        onClick={fetchPublicCollections}
                        className="block mx-auto mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            ) : collections.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <FaFolder className="mx-auto text-4xl text-gray-400 mb-2" />
                    <p className="text-gray-600">No public collections found</p>
                    {(selectedCountry || selectedTag || searchQuery) && (
                        <button
                            onClick={handleClearFilters}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {collections.map(collection => (
                        <div
                            key={collection.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer shadow-sm"
                            onClick={() => onViewCollection && onViewCollection(collection)}
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
                                    <h3 className="font-medium">{collection.name}</h3>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <FaRoad className="mr-1" />
                                        <span>{collection.roads?.length || 0} roads</span>
                                    </div>
                                </div>
                            </div>
                            {collection.description && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                    {collection.description}
                                </p>
                            )}
                            <div className="flex justify-between items-center mt-2">
                                {collection.tags && collection.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {collection.tags.slice(0, 3).map(tag => (
                                            <span
                                                key={tag.id}
                                                className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800"
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                        {collection.tags.length > 3 && (
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                                                +{collection.tags.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                                {collection.user && (
                                    <div
                                        className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewUser && onViewUser(collection.user);
                                        }}
                                    >
                                        <ProfilePicture user={collection.user} size="xs" />
                                        <span className="ml-2 text-sm text-blue-600 font-medium">
                                            {collection.user.name || 'Unknown User'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
