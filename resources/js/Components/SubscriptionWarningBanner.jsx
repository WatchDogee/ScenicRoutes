import React from 'react';
import { Link } from '@inertiajs/react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export default function SubscriptionWarningBanner({ subscriptionStatus, onDismiss }) {
    if (!subscriptionStatus) return null;

    const { status, days_remaining, days_ago, expires_at, expired_at } = subscriptionStatus;
    
    // Get navigate function for React Router (mobile app)
    let navigate = null;
    try {
        if (typeof useNavigate === 'function') {
            navigate = useNavigate();
        }
    } catch (e) {
        // React Router not available
    }
    
    const handleSubscriptionClick = () => {
        if (navigate) {
            navigate('/subscription');
        } else if (Link) {
            // Will be handled by Link component
            return;
        } else {
            window.location.href = '/subscription';
        }
    };
    
    if (status === 'expired') {
        const expiredDate = expired_at ? new Date(expired_at).toLocaleDateString() : '';
        const daysAgo = days_ago || 0;
        
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex items-start">
                    <FaExclamationTriangle className="text-red-500 text-xl mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-red-800 font-semibold mb-1">
                            Subscription Expired
                        </h3>
                        <p className="text-red-700 text-sm mb-3">
                            Your subscription expired {daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`} 
                            {expiredDate && ` (${expiredDate})`}. Renew now to restore access to premium features.
                        </p>
                        {navigate ? (
                            <button
                                onClick={handleSubscriptionClick}
                                className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                Renew Subscription
                            </button>
                        ) : (
                            <Link
                                href="/subscription"
                                className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                Renew Subscription
                            </Link>
                        )}
                    </div>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="text-red-500 hover:text-red-700 ml-4 flex-shrink-0"
                            aria-label="Dismiss"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    if (status === 'expiring' && days_remaining !== undefined) {
        const expiresDate = expires_at ? new Date(expires_at).toLocaleDateString() : '';
        
        let urgency = 'warning';
        let bgColor = 'bg-yellow-50';
        let borderColor = 'border-yellow-500';
        let textColor = 'text-yellow-800';
        let buttonColor = 'bg-yellow-600 hover:bg-yellow-700';
        
        if (days_remaining <= 1) {
            urgency = 'critical';
            bgColor = 'bg-orange-50';
            borderColor = 'border-orange-500';
            textColor = 'text-orange-800';
            buttonColor = 'bg-orange-600 hover:bg-orange-700';
        }
        
        let message = '';
        if (days_remaining === 0) {
            message = `Your subscription expires today (${expiresDate}). Renew now to continue enjoying premium features!`;
        } else if (days_remaining === 1) {
            message = `Your subscription expires tomorrow (${expiresDate}). Renew now to avoid losing access!`;
        } else {
            message = `Your subscription expires in ${days_remaining} days (${expiresDate}). Renew now to continue enjoying premium features!`;
        }
        
        return (
            <div className={`${bgColor} border-l-4 ${borderColor} p-4 mb-4`}>
                <div className="flex items-start">
                    <FaExclamationTriangle className={`${textColor} text-xl mr-3 mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                        <h3 className={`${textColor} font-semibold mb-1`}>
                            Subscription Expiring Soon
                        </h3>
                        <p className={`${textColor} text-sm mb-3`}>
                            {message}
                        </p>
                        {navigate ? (
                            <button
                                onClick={handleSubscriptionClick}
                                className={`inline-block px-4 py-2 ${buttonColor} text-white rounded-lg transition-colors text-sm font-medium`}
                            >
                                Renew Subscription
                            </button>
                        ) : (
                            <Link
                                href="/subscription"
                                className={`inline-block px-4 py-2 ${buttonColor} text-white rounded-lg transition-colors text-sm font-medium`}
                            >
                                Renew Subscription
                            </Link>
                        )}
                    </div>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className={`${textColor} hover:opacity-70 ml-4 flex-shrink-0`}
                            aria-label="Dismiss"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    return null;
}

