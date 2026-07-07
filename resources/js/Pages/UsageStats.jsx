import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaChartLine, FaRoute, FaRuler, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import apiClient from '@/utils/apiClient';
import UsageCharts from '../Components/UsageCharts';
import FeatureGate from '../Components/FeatureGate';

export default function UsageStats({ auth }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadStats();
    }, [period]);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get(`/subscriptions/usage?period=${period}`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load usage stats', error);
            setError('Failed to load usage statistics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        return typeof num === 'number' ? num.toLocaleString() : num;
    };

    const formatDistance = (km) => {
        if (!km || km === 0) return '0 km';
        if (km < 1) return `${(km * 1000).toFixed(0)} m`;
        if (km < 1000) return `${km.toFixed(1)} km`;
        return `${(km / 1000).toFixed(2)} thousand km`;
    };

    const getAverageDistance = () => {
        if (!stats || stats.total === 0) return 0;
        return stats.total_distance_km / stats.total;
    };

    // Set document title
    useEffect(() => {
        document.title = 'Usage Statistics - ScenicRoutes';
    }, []);

    return (
        <FeatureGate feature="usage_analytics" user={auth?.user}>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <FaChartLine className="text-blue-600" />
                                    Usage Statistics
                                </h1>
                                <p className="mt-2 text-gray-600">
                                    Track your route planning activity and see your usage patterns
                                </p>
                            </div>
                            <Link
                                href="/subscription"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Manage Subscription
                            </Link>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="mb-6 bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-4">
                            <FaCalendarAlt className="text-gray-400" />
                            <label className="text-sm font-medium text-gray-700">Time Period:</label>
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="day">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="year">This Year</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <FaSpinner className="animate-spin text-4xl text-blue-600" />
                            <span className="ml-3 text-gray-600">Loading statistics...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <p className="text-red-800">{error}</p>
                            <button
                                onClick={loadStats}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    ) : !stats ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <p className="text-gray-600">No usage data available for this period.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                {/* Total Routes */}
                                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Total Routes</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                                {formatNumber(stats.total)}
                                            </p>
                                        </div>
                                        <div className="bg-blue-100 rounded-full p-4">
                                            <FaRoute className="text-2xl text-blue-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-4">
                                        Routes calculated this {period}
                                    </p>
                                </div>

                                {/* Total Distance */}
                                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Total Distance</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                                {formatDistance(stats.total_distance_km)}
                                            </p>
                                        </div>
                                        <div className="bg-green-100 rounded-full p-4">
                                            <FaRuler className="text-2xl text-green-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-4">
                                        Total distance planned
                                    </p>
                                </div>

                                {/* Average Distance */}
                                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Avg Distance</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                                {formatDistance(getAverageDistance())}
                                            </p>
                                        </div>
                                        <div className="bg-purple-100 rounded-full p-4">
                                            <FaChartLine className="text-2xl text-purple-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-4">
                                        Average per route
                                    </p>
                                </div>

                                {/* Routes Per Day */}
                                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Routes/Day</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                                {period === 'day' 
                                                    ? formatNumber(stats.total)
                                                    : period === 'week'
                                                    ? formatNumber((stats.total / 7).toFixed(1))
                                                    : period === 'month'
                                                    ? formatNumber((stats.total / 30).toFixed(1))
                                                    : formatNumber((stats.total / 365).toFixed(1))
                                                }
                                            </p>
                                        </div>
                                        <div className="bg-orange-100 rounded-full p-4">
                                            <FaCalendarAlt className="text-2xl text-orange-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-4">
                                        Average per day
                                    </p>
                                </div>
                            </div>

                            {/* Charts Section */}
                            {(stats.by_type && Object.keys(stats.by_type).length > 0) || 
                             (stats.by_curvature && Object.keys(stats.by_curvature).length > 0) ? (
                                <UsageCharts stats={stats} />
                            ) : (
                                <div className="bg-white rounded-lg shadow p-8 text-center">
                                    <p className="text-gray-600">No detailed statistics available for this period.</p>
                                </div>
                            )}

                            {/* Detailed Breakdown */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                                {/* Routes by Type */}
                                {stats.by_type && Object.keys(stats.by_type).length > 0 && (
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Routes by Type</h3>
                                        <div className="space-y-3">
                                            {Object.entries(stats.by_type).map(([type, count]) => (
                                                <div key={type} className="flex items-center justify-between">
                                                    <span className="text-gray-700 capitalize">
                                                        {type.replace('_', ' ')}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full"
                                                                style={{
                                                                    width: `${(count / stats.total) * 100}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                                            {count}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Routes by Curvature */}
                                {stats.by_curvature && Object.keys(stats.by_curvature).length > 0 && (
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Routes by Curvature</h3>
                                        <div className="space-y-3">
                                            {Object.entries(stats.by_curvature).map(([curvature, count]) => (
                                                <div key={curvature} className="flex items-center justify-between">
                                                    <span className="text-gray-700 capitalize">
                                                        {curvature.replace('_', ' ')}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-green-600 h-2 rounded-full"
                                                                style={{
                                                                    width: `${(count / stats.total) * 100}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                                            {count}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info Message */}
                            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Statistics are updated in real-time. Data includes all route calculations 
                                    made while logged in. Routes calculated while not logged in are not included.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </FeatureGate>
    );
}

