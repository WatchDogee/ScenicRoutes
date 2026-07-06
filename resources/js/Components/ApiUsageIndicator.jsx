import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function ApiUsageIndicator({ apiStats, className = '' }) {
    if (!apiStats) return null;

    const percentage = (apiStats.count / apiStats.limit) * 100;
    const isWarning = apiStats.warning || percentage >= 90;
    const isCritical = apiStats.limit_reached || percentage >= 100;

    const getColor = () => {
        if (isCritical) return 'bg-red-500';
        if (isWarning) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getTextColor = () => {
        if (isCritical) return 'text-red-700';
        if (isWarning) return 'text-yellow-700';
        return 'text-gray-600';
    };

    return (
        <div className={`api-usage-indicator ${className}`}>
            <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${getColor()}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                <span className={`font-medium ${getTextColor()}`}>
                    {apiStats.remaining} remaining
                </span>
                {isWarning && !isCritical && (
                    <FaExclamationTriangle className="text-yellow-500" title="Approaching daily limit" />
                )}
                {isCritical && (
                    <span className="text-red-600 font-semibold">Limit Reached</span>
                )}
            </div>
            {isWarning && (
                <p className="text-xs mt-1 text-gray-600">
                    {isCritical 
                        ? 'Daily limit reached. Route calculation unavailable until tomorrow.'
                        : `Warning: ${apiStats.count}/${apiStats.limit} calls used today.`
                    }
                </p>
            )}
        </div>
    );
}
