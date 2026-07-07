import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBicycle, FaCalendar, FaTachometerAlt, FaClock, FaTrash, FaSync } from 'react-icons/fa';
import RoadBadge from './RoadBadge';

export default function RecordedRides({ auth }) {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedRides, setExpandedRides] = useState({});
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (auth.token) {
            fetchRides();
        }
    }, [auth.token]);

    const fetchRides = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/rides', {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setRides(response.data.data || response.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to load recorded rides');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const syncRides = async () => {
        try {
            setSyncing(true);
            const response = await axios.post('/api/rides/sync', {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            // Update rides after sync
            await fetchRides();
            alert(`Synced successfully: ${response.data.synced} rides`);
        } catch (err) {
            alert('Failed to sync rides');
            console.error(err);
        } finally {
            setSyncing(false);
        }
    };

    const deleteRide = async (rideId) => {
        if (!window.confirm('Are you sure you want to delete this ride?')) return;

        try {
            await axios.delete(`/api/rides/${rideId}`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setRides(rides.filter(r => r.id !== rideId));
        } catch (err) {
            alert('Failed to delete ride');
        }
    };

    const toggleRideExpansion = (rideId) => {
        setExpandedRides(prev => ({
            ...prev,
            [rideId]: !prev[rideId]
        }));
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <FaBicycle className="text-green-600" size={24} />
                    <h2 className="text-2xl font-bold">Recorded Rides</h2>
                </div>
                <button
                    onClick={syncRides}
                    disabled={syncing || rides.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                    <FaSync className={syncing ? 'animate-spin' : ''} />
                    Sync Rides
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">Loading rides...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : rides.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recorded rides yet. Start riding to record your first ride!</p>
            ) : (
                <div className="space-y-3">
                    {rides.map(ride => (
                        <div key={ride.id} className="border rounded-lg overflow-hidden hover:shadow-md transition">
                            {/* Ride Header */}
                            <div
                                className="p-4 bg-green-50 cursor-pointer hover:bg-green-100 flex justify-between items-start"
                                onClick={() => toggleRideExpansion(ride.id)}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <RoadBadge type="ride" />
                                        <span className="text-gray-600 text-sm">
                                            <FaCalendar className="inline mr-1" />
                                            {formatDate(ride.started_at || ride.startTime)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600">Distance</p>
                                            <p className="font-semibold">
                                                {(ride.distance_meters / 1000).toFixed(1)} km
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Duration</p>
                                            <p className="font-semibold">
                                                {formatTime(ride.duration_seconds)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Avg Speed</p>
                                            <p className="font-semibold">
                                                {ride.average_speed?.toFixed(1) || '0'} m/s
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteRide(ride.id);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-2"
                                >
                                    <FaTrash />
                                </button>
                            </div>

                            {/* Expanded Details */}
                            {expandedRides[ride.id] && (
                                <div className="p-4 bg-white border-t space-y-3">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600">Max Speed</p>
                                            <p className="font-semibold">{ride.max_speed?.toFixed(1) || '0'} m/s</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Sync Status</p>
                                            <p className={`font-semibold ${ride.synced ? 'text-green-600' : 'text-orange-600'}`}>
                                                {ride.synced ? '✓ Synced' : '✗ Not Synced'}
                                            </p>
                                        </div>
                                        {ride.linked_route_id && (
                                            <div className="col-span-2">
                                                <p className="text-gray-600">Linked Route</p>
                                                <p className="font-semibold">{ride.linked_route_id}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* GPS Points Summary */}
                                    {ride.points && (
                                        <div className="pt-3 border-t">
                                            <p className="text-gray-600 text-sm">
                                                GPS Points Recorded: {JSON.parse(ride.points).length || 0}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
