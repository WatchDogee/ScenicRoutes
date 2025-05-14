import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
export default function SearchInput({ 
    placeholder = 'Search for any location...', 
    onLocationSelect,
    initialValue = '',
    className = ''
}) {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const searchTimeoutRef = useRef(null);
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (!value.trim()) {
            setResults([]);
            setIsSearching(false);
            return;
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchLocation(value);
        }, 300);
    };
    const searchLocation = async (searchQuery) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        setError(null);
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: searchQuery,
                    format: 'json',
                    limit: 10,
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
                setResults([]);
                return;
            }
            const formattedResults = response.data
                .filter(result => result.type !== 'house' && result.type !== 'postcode')
                .map(result => ({
                    ...result,
                    displayName: formatLocationName(result)
                }));
            setResults(formattedResults);
        } catch (error) {
            setError('Failed to search location. Please try again.');
            setResults([]);
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
        setQuery(location.displayName);
        setResults([]);
        if (onLocationSelect) {
            onLocationSelect(location);
        }
    };
    return (
        <div className={`relative ${className}`}>
            <input
                type="text"
                placeholder={placeholder}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={query}
                onChange={handleSearchChange}
                role="combobox"
                aria-expanded={results.length > 0}
                aria-autocomplete="list"
                aria-controls="search-results-list"
                autoComplete="off"
                spellCheck="false"
            />
            {isSearching && (
                <div className="absolute right-3 top-2.5 text-gray-400">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
            {results.length > 0 && (
                <div
                    id="search-results-list"
                    role="listbox"
                    className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                    {results.map((result, index) => (
                        <button
                            key={`${result.place_id}-${index}`}
                            role="option"
                            aria-selected={false}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors duration-150"
                            onClick={() => handleLocationSelect(result)}
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            <div className="font-medium">{result.displayName}</div>
                            <div className="text-sm text-gray-600 truncate">{result.display_name}</div>
                        </button>
                    ))}
                </div>
            )}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
}
