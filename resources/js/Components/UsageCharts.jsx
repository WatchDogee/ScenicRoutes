import React from 'react';
import { FaRoute, FaChartBar, FaChartPie } from 'react-icons/fa';

export default function UsageCharts({ stats }) {
    if (!stats) return null;

    const formatByTypeData = () => {
        if (!stats.by_type || Object.keys(stats.by_type).length === 0) return [];
        return Object.entries(stats.by_type).map(([type, count]) => ({
            name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: count,
            count: count
        }));
    };

    const formatCurvatureData = () => {
        if (!stats.by_curvature || Object.keys(stats.by_curvature).length === 0) return [];
        return Object.entries(stats.by_curvature).map(([curvature, count]) => ({
            name: curvature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: count,
            count: count
        }));
    };

    const typeData = formatByTypeData();
    const curvatureData = formatCurvatureData();

    // Calculate percentages for visual representation
    const getPercentage = (value, total) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    // Color schemes
    const typeColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const curvatureColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Routes by Type - Bar Chart */}
            {typeData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FaChartBar className="text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Routes by Type</h3>
                    </div>
                    <div className="space-y-4">
                        {typeData.map((item, index) => {
                            const percentage = getPercentage(item.value, stats.total);
                            return (
                                <div key={item.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700 font-medium">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600">{item.count}</span>
                                            <span className="text-gray-400">({percentage}%)</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                        <div
                                            className="h-4 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: typeColors[index % typeColors.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Routes by Curvature - Pie Chart Style */}
            {curvatureData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FaChartPie className="text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Routes by Curvature</h3>
                    </div>
                    <div className="space-y-4">
                        {curvatureData.map((item, index) => {
                            const percentage = getPercentage(item.value, stats.total);
                            return (
                                <div key={item.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded"
                                                style={{
                                                    backgroundColor: curvatureColors[index % curvatureColors.length]
                                                }}
                                            />
                                            <span className="text-gray-700 font-medium">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600">{item.count}</span>
                                            <span className="text-gray-400">({percentage}%)</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                        <div
                                            className="h-4 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: curvatureColors[index % curvatureColors.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {typeData.length === 0 && curvatureData.length === 0 && (
                <div className="col-span-2 bg-white rounded-lg shadow p-8 text-center">
                    <FaRoute className="text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No detailed statistics available for this period.</p>
                </div>
            )}
        </div>
    );
}



