import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCopy, FaShare, FaFacebook, FaTwitter, FaEnvelope, FaTimes } from 'react-icons/fa';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { logTelemetryEvent } from '../utils/telemetry';

export default function ShareRoute({ route, routeName, routeDescription, auth = null, onClose }) {
    const [shareToken, setShareToken] = useState(null);
    const [shareUrl, setShareUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);

    const generateShare = async () => {
        if (!route || !route.coordinates || route.coordinates.length < 2) {
            setError('Invalid route data');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('/api/routes/share', {
                route: route,
                route_name: routeName || 'Shared Route',
                route_description: routeDescription || null
            }, {
                headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
            });

            setShareToken(response.data.share_token);
            setShareUrl(response.data.share_url);
            logTelemetryEvent('route_share_created', {
                share_token: response.data.share_token,
                route_name: routeName || 'Shared Route',
            });
            
            // Fetch stats if user is authenticated
            if (auth?.token) {
                fetchStats(response.data.share_token);
            }
        } catch (error) {
            console.error('Error generating share:', error);
            setError(error.response?.data?.message || 'Failed to generate shareable link');
            logTelemetryEvent('route_share_failed', {
                message: error.response?.data?.message || error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (token) => {
        if (!auth?.token) return;
        
        try {
            const response = await axios.get(`/api/routes/shared/${token}/stats`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setStats(response.data);
        } catch (error) {
            // Ignore errors - stats are optional
            console.log('Could not fetch stats:', error);
        }
    };

    const recordShareAction = async (source) => {
        if (!shareToken) return;
        logTelemetryEvent('route_share_action', {
            source,
            share_token: shareToken,
        });
        try {
            await axios.post(`/api/routes/shared/${shareToken}/share`, { source });
            setStats((prev) => prev ? { ...prev, share_count: (prev.share_count || 0) + 1 } : prev);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.debug('Failed to record share action', error?.message);
            }
        }
    };

    const copyLink = () => {
        if (!shareUrl) return;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            recordShareAction('copy_link');
        }).catch(err => {
            console.error('Failed to copy:', err);
            setError('Failed to copy link');
        });
    };

    const shareToSocial = (platform) => {
        if (!shareUrl) return;
        
        const text = encodeURIComponent(`Check out this route: ${routeName || 'Shared Route'}`);
        const url = encodeURIComponent(shareUrl);
        
        const urls = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
            email: `mailto:?subject=${text}&body=${text}%20${url}`
        };

        if (urls[platform]) {
            window.open(urls[platform], '_blank', 'width=600,height=400');
            recordShareAction(platform);
        }
    };

    useEffect(() => {
        if (route && route.coordinates && route.coordinates.length >= 2) {
            generateShare();
        }
    }, [route]);

    if (loading) {
        return (
            <div className="share-route p-4 bg-white rounded-lg shadow-lg max-w-md">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-600">Generating shareable link...</p>
                </div>
            </div>
        );
    }

    if (error && !shareUrl) {
        return (
            <div className="share-route p-4 bg-white rounded-lg shadow-lg max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Share Route</h3>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
                <div className="text-red-600 text-sm">{error}</div>
                <button
                    onClick={generateShare}
                    className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!shareUrl) {
        return (
            <div className="share-route p-4 bg-white rounded-lg shadow-lg max-w-md">
                <div className="text-center text-gray-600">
                    No route to share
                </div>
            </div>
        );
    }

    return (
        <div className="share-route p-4 bg-white rounded-lg shadow-lg max-w-md">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Share Route</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>
            
            {/* QR Code */}
            <div className="flex justify-center mb-4 p-4 bg-gray-50 rounded">
                <QRCode value={shareUrl} size={200} level="M" />
            </div>

            {/* Shareable Link */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Shareable Link:</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.target.select()}
                    />
                    <button
                        onClick={copyLink}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            copied 
                                ? 'bg-green-500 text-white' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        title="Copy link"
                    >
                        {copied ? 'Copied!' : <FaCopy />}
                    </button>
                </div>
            </div>

            {/* Social Share Buttons */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Share to:</label>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => shareToSocial('facebook')}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-1"
                    >
                        <FaFacebook />
                        <span className="hidden sm:inline">Facebook</span>
                    </button>
                    <button
                        onClick={() => shareToSocial('twitter')}
                        className="px-3 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 text-sm font-medium flex items-center justify-center gap-1"
                    >
                        <FaTwitter />
                        <span className="hidden sm:inline">Twitter</span>
                    </button>
                    <button
                        onClick={() => shareToSocial('email')}
                        className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium flex items-center justify-center gap-1"
                    >
                        <FaEnvelope />
                        <span className="hidden sm:inline">Email</span>
                    </button>
                </div>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Views:</span>
                        <span className="font-semibold">{stats.view_count}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>Shares:</span>
                        <span className="font-semibold">{stats.share_count}</span>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
                >
                    Close
                </button>
            )}
        </div>
    );
}

