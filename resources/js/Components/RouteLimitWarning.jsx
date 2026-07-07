import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';

export default function RouteLimitWarning() {
    const [limitCheck, setLimitCheck] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkLimit();
    }, []);

    const checkLimit = async () => {
        try {
            const response = await apiClient.get('/route-usage/check');
            setLimitCheck(response.data);
        } catch (error) {
            console.error('Failed to check route limit', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !limitCheck) {
        return null;
    }

    // Don't show if unlimited or allowed
    if (limitCheck.allowed && limitCheck.remaining === Number.MAX_SAFE_INTEGER) {
        return null;
    }

    const percentageUsed = limitCheck.limit !== Number.MAX_SAFE_INTEGER
        ? ((limitCheck.limit - limitCheck.remaining) / limitCheck.limit) * 100
        : 0;
    
    const isWarning = percentageUsed >= 80 && limitCheck.allowed;
    const isError = !limitCheck.allowed;

    if (isError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-red-800 font-semibold mb-1">Route Limit Reached</h3>
                        <p className="text-red-600 text-sm">
                            You've used all {limitCheck.limit} of your daily routes.
                            {limitCheck.reset_at && (
                                <> Resets at {new Date(limitCheck.reset_at).toLocaleTimeString()}</>
                            )}
                        </p>
                    </div>
                    <Link
                        href="/subscription"
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                        Upgrade to Premium
                    </Link>
                </div>
            </div>
        );
    }

    if (isWarning) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h3 className="text-yellow-800 font-semibold mb-1">Approaching Route Limit</h3>
                        <p className="text-yellow-600 text-sm mb-2">
                            {limitCheck.remaining} of {limitCheck.limit} routes remaining today
                        </p>
                        <div className="w-full bg-yellow-200 rounded-full h-2">
                            <div
                                className="bg-yellow-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentageUsed}%` }}
                            />
                        </div>
                    </div>
                    <Link
                        href="/subscription"
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                        Upgrade
                    </Link>
                </div>
            </div>
        );
    }

    return null;
}


