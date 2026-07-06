import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FaSearch, FaRoad, FaBicycle, FaMapMarkerAlt, FaCalendar, FaTachometerAlt, FaTrash, FaDownload, FaEye } from 'react-icons/fa';
import RoadBadge from '../Components/RoadBadge';
import RoadsFilter from '../Components/RoadsFilter';

export default function MyRoads({ auth }) {
    const [roads, setRoads] = useState([]);
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBadge, setSelectedBadge] = useState('all');
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        if (auth.token) {
            fetchAllData();
        }
    }, [auth.token]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [roadsRes, ridesRes] = await Promise.all([
                axios.get('/api/saved-roads', { headers: { Authorization: `Bearer ${auth.token}` } }),
                axios.get('/api/rides', { headers: { Authorization: `Bearer ${auth.token}` } })
            ]);

            setRoads(roadsRes.data || []);
            setRides(ridesRes.data.data || ridesRes.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to load your roads and rides');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Combine and filter roads and rides
    const combinedItems = useMemo(() => {
        const items = [
            ...roads.map(road => ({
                id: `road-${road.id}`,
                originalId: road.id,
                type: 'road',
                name: road.road_name || 'Unnamed Road',
                date: road.created_at,
                distance: road.length,
                ...road
            })),
            ...rides.map(ride => ({
                id: `ride-${ride.id}`,
                originalId: ride.id,
                type: 'ride',
                name: `Ride - ${new Date(ride.started_at).toLocaleDateString()}`,
                date: ride.started_at,
                distance: ride.distance_meters,
                ...ride
            }))
        ];

        // Filter by badge type
        let filtered = items;
        if (selectedBadge !== 'all') {
            filtered = items.filter(item => item.type === selectedBadge);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query)
            );
        }

        // Sort by date descending
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [roads, rides, selectedBadge, searchQuery]);

    const deleteItem = async (item) => {
        if (!window.confirm(`Delete this ${item.type === 'road' ? 'road' : 'ride'}?`)) return;

        try {
            const endpoint = item.type === 'road'
                ? `/api/saved-roads/${item.originalId}`
                : `/api/rides/${item.originalId}`;

            await axios.delete(endpoint, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            if (item.type === 'road') {
                setRoads(roads.filter(r => r.id !== item.originalId));
            } else {
                setRides(rides.filter(r => r.id !== item.originalId));
            }
        } catch (err) {
            alert(`Failed to delete ${item.type}`);
        }
    };

    const toggleExpansion = (itemId) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (seconds) => {
        if (!seconds) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">My Roads & Rides</h1>
                    <p className="text-gray-600">
                        Manage your saved roads, planned routes, and recorded rides
                    </p>
                </div>

                {/* Filter Component */}
                <RoadsFilter
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedBadge={selectedBadge}
                    setSelectedBadge={setSelectedBadge}
                    loading={loading}
                />

                {/* Results Summary */}
                <div className="mb-4 text-sm text-gray-600">
                    Found <span className="font-semibold">{combinedItems.length}</span> item(s)
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                    </div>
                ) : combinedItems.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500 mb-4">No items found</p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-blue-500 hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {combinedItems.map(item => (
                            <div
                                key={item.id}
                                className="bg-white rounded-lg shadow hover:shadow-md transition border border-gray-200 overflow-hidden"
                            >
                                {/* Item Header */}
                                <div
                                    className={`p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-start ${
                                        item.type === 'road' ? 'bg-blue-50' : 'bg-green-50'
                                    }`}
                                    onClick={() => toggleExpansion(item.id)}
                                >
                                    <div className="flex-1">
                                        {/* Badge and Title */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <RoadBadge type={item.type} />
                                            <h3 className="font-semibold text-gray-800 flex-1">
                                                {item.name}
                                            </h3>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-600">Distance</p>
                                                <p className="font-semibold">
                                                    {item.type === 'ride'
                                                        ? (item.distance / 1000).toFixed(1)
                                                        : (item.distance / 1000).toFixed(1)
                                                    } km
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">
                                                    {item.type === 'ride' ? 'Duration' : 'Corners'}
                                                </p>
                                                <p className="font-semibold">
                                                    {item.type === 'ride'
                                                        ? formatTime(item.duration_seconds)
                                                        : item.corner_count || 'N/A'
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">
                                                    {item.type === 'ride' ? 'Avg Speed' : 'Elevation'}
                                                </p>
                                                <p className="font-semibold">
                                                    {item.type === 'ride'
                                                        ? `${(item.average_speed || 0).toFixed(1)} m/s`
                                                        : `${(item.elevation_gain || 0).toFixed(0)} m`
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Date</p>
                                                <p className="font-semibold text-xs">
                                                    {formatDate(item.date)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteItem(item);
                                            }}
                                            className="text-red-500 hover:text-red-700 p-2"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedItems[item.id] && (
                                    <div className="p-4 bg-white border-t space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            {item.type === 'road' && (
                                                <>
                                                    <div>
                                                        <p className="text-gray-600">Twistiness</p>
                                                        <p className="font-semibold">
                                                            {item.twistiness || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Elevation Loss</p>
                                                        <p className="font-semibold">
                                                            {(item.elevation_loss || 0).toFixed(0)} m
                                                        </p>
                                                    </div>
                                                    {item.country && (
                                                        <div>
                                                            <p className="text-gray-600">Location</p>
                                                            <p className="font-semibold">
                                                                {item.country}
                                                                {item.region ? `, ${item.region}` : ''}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {item.type === 'ride' && (
                                                <>
                                                    <div>
                                                        <p className="text-gray-600">Max Speed</p>
                                                        <p className="font-semibold">
                                                            {(item.max_speed || 0).toFixed(1)} m/s
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Sync Status</p>
                                                        <p className={`font-semibold ${item.synced ? 'text-green-600' : 'text-orange-600'}`}>
                                                            {item.synced ? '✓ Synced' : '✗ Not Synced'}
                                                        </p>
                                                    </div>
                                                    {item.linked_route_id && (
                                                        <div className="col-span-2">
                                                            <p className="text-gray-600">Linked Route</p>
                                                            <p className="font-semibold">{item.linked_route_id}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {item.description && (
                                            <div className="pt-3 border-t">
                                                <p className="text-gray-600 mb-1">Description</p>
                                                <p className="text-gray-800">{item.description}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
