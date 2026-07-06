import React, { useState, useRef, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { FaChevronDown, FaSpinner } from 'react-icons/fa';
import apiClient from '@/utils/apiClient';
import { useNotification } from '../Contexts/NotificationContext';
import { calculateYearlySavings, PRICING } from '../utils/subscriptionPricing';

export default function SubscriptionBadge({ user, onOpenSettings }) {
    const { addNotification } = useNotification();
    const [showDropdown, setShowDropdown] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const dropdownRef = useRef(null);

    if (!user?.subscription) {
        return null;
    }

    const tier = user.subscription.plan || 'free';
    
    // Don't show badge for free tier
    if (tier === 'free') {
        return null;
    }

    const tierColors = {
        premium: 'bg-blue-500',
        pro: 'bg-purple-500',
    };

    const tierLabels = {
        premium: 'Premium',
        pro: 'Pro',
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    const handleUpgrade = async (plan, billingCycle) => {
        setUpgradeLoading(true);
        addNotification('Creating checkout session...', { type: 'info', duration: 3000 });
        
        try {
            const response = await apiClient.post('/subscriptions/checkout', {
                plan_id: plan,
                billing_cycle: billingCycle,
            });
            
            if (response.data.checkout_url) {
                addNotification('Redirecting to payment...', { type: 'info', duration: 2000 });
                setTimeout(() => {
                    window.location.href = response.data.checkout_url;
                }, 500);
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Failed to create checkout', error);
            const errorMsg = error.response?.data?.message || 'Failed to create checkout session';
            addNotification(errorMsg, { type: 'error', duration: 6000 });
            setUpgradeLoading(false);
        }
    };

    const handleChangeBillingCycle = async (billingCycle) => {
        setUpgradeLoading(true);
        addNotification('Updating billing cycle...', { type: 'info', duration: 3000 });
        
        try {
            const response = await apiClient.post('/subscriptions/checkout', {
                plan_id: tier,
                billing_cycle: billingCycle,
            });
            
            if (response.data.checkout_url) {
                addNotification('Redirecting to payment...', { type: 'info', duration: 2000 });
                setTimeout(() => {
                    window.location.href = response.data.checkout_url;
                }, 500);
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Failed to change billing cycle', error);
            const errorMsg = error.response?.data?.message || 'Failed to change billing cycle';
            addNotification(errorMsg, { type: 'error', duration: 6000 });
            setUpgradeLoading(false);
        }
    };

    const currentBillingCycle = user.subscription?.billing_cycle || 'monthly';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-white text-sm font-medium ${
                    tierColors[tier] || tierColors.premium
                } hover:opacity-80 transition-opacity`}
            >
                {tierLabels[tier] || 'Premium'}
                <FaChevronDown className="ml-1 text-xs" />
            </button>
            
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                        <p className="text-sm font-bold text-gray-900 capitalize">{tier} Plan</p>
                        <p className="text-xs text-gray-600 capitalize mt-1">{currentBillingCycle} billing</p>
                    </div>
                    
                    {/* Change Billing Cycle */}
                    <div className="p-2">
                        {currentBillingCycle === 'monthly' ? (() => {
                            const savings = calculateYearlySavings(tier);
                            return (
                                <button
                                    onClick={() => handleChangeBillingCycle('yearly')}
                                    disabled={upgradeLoading}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between rounded-lg transition-colors border border-transparent hover:border-green-200"
                                >
                                    {upgradeLoading ? (
                                        <span className="flex items-center gap-2">
                                            <FaSpinner className="animate-spin" />
                                            <span>Processing...</span>
                                        </span>
                                    ) : (
                                        <>
                                            <span>Switch to Yearly</span>
                                            {savings && (
                                                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded">Save ${savings.amount.toFixed(2)}/year</span>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })() : (
                            <button
                                onClick={() => handleChangeBillingCycle('monthly')}
                                disabled={upgradeLoading}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-lg transition-colors"
                            >
                                {upgradeLoading ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    'Switch to Monthly'
                                )}
                            </button>
                        )}
                    </div>
                    
                    {/* Upgrade to Pro (if Premium) */}
                    {tier === 'premium' && (() => {
                        const savings = calculateYearlySavings('pro');
                        return (
                            <>
                                <div className="border-t border-gray-200 my-1"></div>
                                <div className="p-2 space-y-1">
                                    <button
                                        onClick={() => handleUpgrade('pro', 'monthly')}
                                        disabled={upgradeLoading}
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between rounded-lg transition-colors"
                                    >
                                        {upgradeLoading ? (
                                            <span className="flex items-center gap-2">
                                                <FaSpinner className="animate-spin" />
                                                <span>Processing...</span>
                                            </span>
                                        ) : (
                                            <>
                                                <span>Upgrade to Pro (Monthly)</span>
                                                <span className="text-xs text-gray-500 font-semibold">${PRICING.pro.monthly}/mo</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleUpgrade('pro', 'yearly')}
                                        disabled={upgradeLoading}
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between rounded-lg transition-colors border border-transparent hover:border-green-200"
                                    >
                                        {upgradeLoading ? (
                                            <span className="flex items-center gap-2">
                                                <FaSpinner className="animate-spin" />
                                                <span>Processing...</span>
                                            </span>
                                        ) : (
                                            <>
                                                <span>Upgrade to Pro (Yearly)</span>
                                                {savings && (
                                                    <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded">Save ${savings.amount.toFixed(2)}</span>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                    
                    <div className="border-t border-gray-200 my-1"></div>
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => {
                                setShowDropdown(false);
                                if (onOpenSettings) {
                                    onOpenSettings();
                                    // Small delay to ensure modal opens, then switch to subscription tab
                                    setTimeout(() => {
                                        const tabs = document.querySelectorAll('[role="tab"]');
                                        const subscriptionTab = Array.from(tabs).find(t => t.textContent.includes('Subscription'));
                                        if (subscriptionTab) subscriptionTab.click();
                                    }, 300);
                                }
                            }}
                            className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                        >
                            View Subscription Details
                        </button>
                        <Link
                            href="/subscription"
                            onClick={() => setShowDropdown(false)}
                            className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            View All Plans
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}


