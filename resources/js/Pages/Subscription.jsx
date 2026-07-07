import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';

export default function Subscription({ auth }) {
    const [plans, setPlans] = useState(null);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadData();
        
        // Handle canceled redirect
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('canceled') === 'true') {
            setTimeout(() => {
                alert('Subscription checkout was canceled. You can try again anytime.');
            }, 500);
            // Clean URL
            window.history.replaceState({}, '', '/subscription');
        }
    }, []);

    // Set document title (must be before any conditional returns)
    useEffect(() => {
        document.title = 'Subscription Plans - ScenicRoutes';
    }, []);

    const loadData = async () => {
        try {
            // Plans are always available (public endpoint)
            const plansRes = await apiClient.get('/subscriptions/plans');
            setPlans(plansRes.data.plans);
            
            // Attempt to fetch regardless; handle 401 gracefully
            try {
                const currentRes = await apiClient.get('/subscriptions/current');
                setCurrentSubscription(currentRes.data);
            } catch (error) {
                console.error('Failed to load subscription data:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                });
                // Fallback to free tier display
                setCurrentSubscription({ tier: 'free' });
            }
        } catch (error) {
            console.error('Failed to load subscription plans', error);
            setMessage({ type: 'error', text: 'Failed to load subscription plans' });
        }
    };

    const handleSubscribe = async (plan, billingCycle) => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            const response = await apiClient.post('/subscriptions/checkout', {
                plan_id: plan,
                billing_cycle: billingCycle,
            });
            
            // Redirect directly to Stripe checkout URL
            if (response.data.checkout_url) {
                window.location.href = response.data.checkout_url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Failed to create checkout', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to create checkout session';
            const errors = error.response?.data?.errors;
            let fullMessage = errorMsg;
            if (errors) {
                fullMessage += ' - ' + Object.values(errors).flat().join(', ');
            }
            setMessage({ 
                type: 'error', 
                text: fullMessage
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
            return;
        }
        
        setLoading(true);
        try {
            await apiClient.post('/subscriptions/cancel', {
                at_period_end: true,
            });
            setMessage({ type: 'success', text: 'Subscription will be cancelled at the end of the billing period' });
            await loadData();
        } catch (error) {
            console.error('Failed to cancel subscription', error);
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Failed to cancel subscription' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        setLoading(true);
        try {
            await apiClient.post('/subscriptions/resume');
            setMessage({ type: 'success', text: 'Subscription resumed successfully' });
            await loadData();
        } catch (error) {
            console.error('Failed to resume subscription', error);
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Failed to resume subscription' 
            });
        } finally {
            setLoading(false);
        }
    };

    if (!plans) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading subscription plans...</p>
                </div>
            </div>
        );
    }

    const currentTier = currentSubscription?.tier || 'free';
    const isCancelled = currentSubscription?.subscription?.status === 'cancelled' || 
                       currentSubscription?.subscription?.cancel_at_period_end;
    const isTrialing = currentSubscription?.subscription?.status === 'trialing' ||
                       !!currentSubscription?.subscription?.trial_ends_at;
    const trialEligible = currentSubscription?.can_start_premium_trial;
    const trialDays = currentSubscription?.premium_trial_days || 7;

    return (
        <>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-6">Subscription Plans</h1>
                    
                    {/* Message Alert */}
                    {message.text && (
                        <div className={`mb-6 p-4 rounded-lg ${
                            message.type === 'error' 
                                ? 'bg-red-50 border border-red-200 text-red-800' 
                                : 'bg-green-50 border border-green-200 text-green-800'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Current Subscription Status */}
                    {/* Current status is integrated into the Premium card below */}

                    {/* Removed usage section for a cleaner layout */}

                    {/* Plan Comparison */}
                    <div className="grid md:grid-cols-3 gap-5">
                        {Object.entries(plans).map(([key, plan]) => {
                            const isCurrentPlan = currentTier === key;
                            const isUpgrade = 
                                (key === 'premium' && currentTier === 'free') ||
                                (key === 'pro' && (currentTier === 'free' || currentTier === 'premium'));
                            // Show all plans for symmetry
                            const shouldShowPlan = true;
                            // Can show upgrade buttons if: it's an upgrade OR (free user looking at paid plans) AND not free tier
                            const canShowUpgradeButtons = !isCurrentPlan && (isUpgrade || (currentTier === 'free' && key !== 'free')) && key !== 'free';
                            // Default to monthly if billing_cycle is null/undefined
                            const currentBillingCycle = currentSubscription?.subscription?.billing_cycle || 'monthly';
                            
                            if (!shouldShowPlan) return null;
                            
                            return (
                                <div
                                    key={key}
                                    className={`border rounded-lg p-5 ${
                                        isCurrentPlan
                                            ? 'border-blue-400 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:shadow-sm transition-shadow'
                                    }`}
                                >
                                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                                    {key === 'premium' && trialEligible && (
                                        <div className="mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                                            Start a {trialDays}-day Premium trial.
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <span className="text-2xl font-bold">${plan.price_monthly}</span>
                                        <span className="text-gray-600">/month</span>
                                    </div>
                                    {plan.price_yearly > 0 && (
                                        <div className="mb-3 text-sm text-gray-600">
                                            or ${plan.price_yearly}/year (save 17%)
                                        </div>
                                    )}
                                    <ul className="space-y-2 mb-5 min-h-[180px]">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start">
                                                <span className="text-green-500 mr-2 mt-1">✓</span>
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {!isCurrentPlan && canShowUpgradeButtons && (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleSubscribe(key, 'monthly')}
                                                disabled={loading}
                                                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {key === 'premium' && trialEligible
                                                    ? `Start ${trialDays}-day trial`
                                                    : `${isUpgrade ? 'Upgrade' : 'Subscribe'} Monthly`}
                                            </button>
                                            <button
                                                onClick={() => handleSubscribe(key, 'yearly')}
                                                disabled={loading}
                                                className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {key === 'premium' && trialEligible
                                                    ? `Start ${trialDays}-day trial (Yearly)`
                                                    : `${isUpgrade ? 'Upgrade' : 'Subscribe'} Yearly (Save 17%)`}
                                            </button>
                                        </div>
                                    )}
                                    {isCurrentPlan && (
                                        <div className="space-y-2">
                                            <div className="p-3 bg-blue-100 border border-blue-200 rounded text-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-blue-700 font-medium">Current plan</span>
                                                    <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-800 text-xs">
                                                        {isTrialing ? 'Trial' : 'Active'}
                                                    </span>
                                                </div>
                                                {currentSubscription?.subscription?.billing_cycle && (
                                                    <p><span className="font-medium">Billing:</span> {currentSubscription.subscription.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}</p>
                                                )}
                                                {isTrialing && currentSubscription?.subscription?.trial_ends_at && (
                                                    <p><span className="font-medium">Trial ends:</span> {new Date(currentSubscription.subscription.trial_ends_at).toLocaleDateString()}</p>
                                                )}
                                                {!isTrialing && currentSubscription?.subscription?.ends_at && (
                                                    <p><span className="font-medium">Renews:</span> {new Date(currentSubscription.subscription.ends_at).toLocaleDateString()}</p>
                                                )}
                                                {/* Hide cancel/resume for free tier */}
                                                {currentTier !== 'free' && (
                                                    isCancelled ? (
                                                        <div className="mt-2">
                                                            <p className="text-red-600 font-medium">Subscription will end at period end</p>
                                                            <button
                                                                onClick={handleResume}
                                                                disabled={loading}
                                                                className="mt-2 w-full px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Resume Subscription
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={handleCancel}
                                                            disabled={loading}
                                                            className="mt-2 w-full px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Cancel Subscription
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                            {currentBillingCycle === 'monthly' && plan.price_yearly > 0 && (
                                                <button
                                                    onClick={() => handleSubscribe(key, 'yearly')}
                                                    disabled={loading}
                                                    className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Change to Yearly (Save 17%)
                                                </button>
                                            )}
                                            {currentBillingCycle === 'yearly' && (
                                                <button
                                                    onClick={() => handleSubscribe(key, 'monthly')}
                                                    disabled={loading}
                                                    className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Change to Monthly
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

