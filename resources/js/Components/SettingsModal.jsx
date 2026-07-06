import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaCog, FaUser, FaMap, FaInfoCircle, FaCreditCard, FaCheckCircle, FaTimesCircle, FaSpinner, FaMobile } from 'react-icons/fa';
import { Tab } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import apiClient from '../utils/apiClient';
import { useNotification } from '../Contexts/NotificationContext';
import { formatSavingsMessage, calculateYearlySavings, PRICING } from '../utils/subscriptionPricing';
import DeleteAccountPanel from './DeleteAccountPanel';

export default function SettingsModal({ isOpen, onClose, auth }) {
    const { addNotification } = useNotification();
    const [user, setUser] = useState(auth?.user || null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profileForm, setProfileForm] = useState({
        name: auth?.user?.name || '',
        email: auth?.user?.email || '',
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [userSettings, setUserSettings] = useState({
        measurement_units: 'metric',
        default_map_view: 'terrain',
        default_search_radius: 10,
        default_search_type: 'town',
        theme: 'light',
        notifications_enabled: true,
        default_navigation_app: 'google_maps',
    });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState({ type: '', text: '' });

    const subscription = subscriptionData?.subscription;
    const isTrialing = subscription?.status === 'trialing' || !!subscription?.trial_ends_at;
    const dateLabel = isTrialing
        ? 'Trial ends on:'
        : subscription?.cancel_at_period_end
            ? 'Ends on:'
            : 'Renews on:';
    const dateValue = isTrialing ? subscription?.trial_ends_at : subscription?.ends_at;

    useEffect(() => {
        if (isOpen && auth?.user) {
            fetchUserData();
            fetchUserSettings();
            fetchSubscriptionData();
        }
    }, [isOpen, auth]);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userData = response.data;
            setUser(userData);
            setProfileForm(prev => ({
                ...prev,
                name: userData.name || '',
                email: userData.email || ''
            }));
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    const fetchUserSettings = async () => {
        try {
            setSettingsLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.settings) {
                setUserSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setSettingsLoading(false);
        }
    };

    const fetchSubscriptionData = async () => {
        try {
            setSubscriptionLoading(true);
            const response = await apiClient.get('/subscriptions/current');
            setSubscriptionData(response.data);
        } catch (error) {
            console.error('Failed to fetch subscription data:', error);
        } finally {
            setSubscriptionLoading(false);
        }
    };

    const handleUpgrade = async (plan, billingCycle) => {
        setUpgradeLoading(true);
        setUpgradeMessage({ type: '', text: '' });
        addNotification('Creating checkout session...', { type: 'info', duration: 3000 });
        
        try {
            const response = await apiClient.post('/subscriptions/checkout', {
                plan_id: plan,
                billing_cycle: billingCycle,
            });
            
            // Redirect directly to Stripe checkout URL
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
            setUpgradeMessage({ 
                type: 'error', 
                text: errorMsg
            });
            addNotification(errorMsg, { type: 'error', duration: 6000 });
            setUpgradeLoading(false);
        }
    };

    const handleChangeBillingCycle = async (billingCycle) => {
        if (!subscriptionData?.subscription) return;
        
        setUpgradeLoading(true);
        setUpgradeMessage({ type: '', text: '' });
        addNotification('Updating billing cycle...', { type: 'info', duration: 3000 });
        
        try {
            // For changing billing cycle, we need to upgrade to the same plan with different cycle
            const currentPlan = subscriptionData.tier;
            const response = await apiClient.post('/subscriptions/checkout', {
                plan_id: currentPlan,
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
            setUpgradeMessage({ 
                type: 'error', 
                text: errorMsg
            });
            addNotification(errorMsg, { type: 'error', duration: 6000 });
            setUpgradeLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('name', profileForm.name);
            formData.append('email', profileForm.email);
            if (profileForm.current_password) {
                formData.append('current_password', profileForm.current_password);
                formData.append('new_password', profileForm.new_password);
                formData.append('new_password_confirmation', profileForm.new_password_confirmation);
            }
            if (selectedImage) {
                formData.append('profile_picture', selectedImage);
            }
            const response = await axios.post('/api/profile', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setUser(response.data.user);
            if (selectedImage) {
                setSelectedImage(null);
                setImagePreview(null);
            }
            setProfileForm(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                new_password_confirmation: ''
            }));
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsUpdate = async () => {
        setSettingsLoading(true);
        setSettingsMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/settings/batch', { settings: userSettings }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettingsMessage({ type: 'success', text: 'Settings saved successfully!' });
            setTimeout(() => setSettingsMessage({ type: '', text: '' }), 3000);
            // Reload page to apply settings
            window.location.reload();
        } catch (error) {
            setSettingsMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to save settings'
            });
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[30000] p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FaCog />
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <FaTimes size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <Tab.Group>
                        <Tab.List className="flex space-x-1 rounded-xl bg-blue-100 p-1 mb-6">
                            <Tab className={({ selected }) =>
                                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                                    selected
                                        ? 'bg-white text-blue-700 shadow'
                                        : 'text-blue-600 hover:bg-white/[0.12]'
                                }`
                            }>
                                <FaUser className="inline mr-2" />
                                Profile
                            </Tab>
                            <Tab className={({ selected }) =>
                                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                                    selected
                                        ? 'bg-white text-blue-700 shadow'
                                        : 'text-blue-600 hover:bg-white/[0.12]'
                                }`
                            }>
                                <FaMap className="inline mr-2" />
                                Preferences
                            </Tab>
                            <Tab className={({ selected }) =>
                                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                                    selected
                                        ? 'bg-white text-blue-700 shadow'
                                        : 'text-blue-600 hover:bg-white/[0.12]'
                                }`
                            }>
                                <FaCreditCard className="inline mr-2" />
                                Subscription
                            </Tab>
                        </Tab.List>

                        <Tab.Panels>
                            {/* Profile Tab */}
                            <Tab.Panel>
                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    {message.text && (
                                        <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {message.text}
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Profile Picture
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : user?.profile_picture_url ? (
                                                    <img src={user.profile_picture_url} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl text-gray-500">{user?.name?.charAt(0)?.toUpperCase()}</span>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Current Password
                                                </label>
                                                <input
                                                    type="password"
                                                    value={profileForm.current_password}
                                                    onChange={(e) => setProfileForm({ ...profileForm, current_password: e.target.value })}
                                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    value={profileForm.new_password}
                                                    onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Confirm New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    value={profileForm.new_password_confirmation}
                                                    onChange={(e) => setProfileForm({ ...profileForm, new_password_confirmation: e.target.value })}
                                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            </Tab.Panel>

                            {/* Preferences Tab */}
                            <Tab.Panel>
                                <div className="space-y-6">
                                    {settingsMessage.text && (
                                        <div className={`p-3 rounded ${settingsMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {settingsMessage.text}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Measurement Units
                                        </label>
                                        <select
                                            value={userSettings.measurement_units}
                                            onChange={(e) => setUserSettings({ ...userSettings, measurement_units: e.target.value })}
                                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="metric">Metric (km, °C)</option>
                                            <option value="imperial">Imperial (miles, °F)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Map View
                                        </label>
                                        <select
                                            value={userSettings.default_map_view}
                                            onChange={(e) => setUserSettings({ ...userSettings, default_map_view: e.target.value })}
                                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="standard">Standard</option>
                                            <option value="satellite">Satellite</option>
                                            <option value="terrain">Terrain</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.notifications_enabled}
                                                onChange={(e) => setUserSettings({ ...userSettings, notifications_enabled: e.target.checked })}
                                                className="rounded"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Enable Notifications</span>
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleSettingsUpdate}
                                        disabled={settingsLoading}
                                        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        {settingsLoading ? 'Saving...' : 'Save Settings'}
                                    </button>

                                    <DeleteAccountPanel onDeleted={() => window.location.href = '/'} />
                                </div>
                            </Tab.Panel>

                            {/* Subscription Tab */}
                            <Tab.Panel>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
                                        
                                        {subscriptionLoading ? (
                                            <div className="text-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                                <p className="mt-2 text-gray-600">Loading subscription...</p>
                                            </div>
                                        ) : subscriptionData ? (
                                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-xl font-bold text-gray-900 capitalize">
                                                            {subscriptionData.tier || 'Free'} Plan
                                                        </h4>
                                                        {subscriptionData.subscription && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                Status: <span className={`font-semibold ${
                                                                    subscriptionData.subscription.status === 'active' 
                                                                        ? 'text-green-600' 
                                                                        : 'text-red-600'
                                                                }`}>
                                                                    {subscriptionData.subscription.status === 'active' ? (
                                                                        <><FaCheckCircle className="inline mr-1" /> Active</>
                                                                    ) : (
                                                                        <><FaTimesCircle className="inline mr-1" /> {subscriptionData.subscription.status}</>
                                                                    )}
                                                                </span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    {subscriptionData.tier !== 'free' && (
                                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                                            subscriptionData.tier === 'premium' 
                                                                ? 'bg-blue-100 text-blue-800' 
                                                                : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                            {subscriptionData.tier === 'premium' ? 'Premium' : 'Pro'}
                                                        </span>
                                                    )}
                                                </div>

                                                {subscriptionData.tier === 'free' && subscriptionData.can_start_premium_trial && (
                                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                        <p className="text-sm text-blue-800 mb-3">
                                                            Start a {subscriptionData.premium_trial_days || 7}-day Premium trial.
                                                        </p>
                                                        <button
                                                            onClick={() => handleUpgrade('premium', 'monthly')}
                                                            disabled={upgradeLoading}
                                                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {upgradeLoading ? 'Starting trial...' : 'Start Premium Trial'}
                                                        </button>
                                                    </div>
                                                )}

                                                {subscriptionData.subscription && (
                                                    <div className="space-y-3 border-t pt-4">
                                                        {subscriptionData.subscription.billing_cycle && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Billing Cycle:</span>
                                                                <span className="font-semibold capitalize">
                                                                    {subscriptionData.subscription.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {dateValue && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">{dateLabel}</span>
                                                                <span className="font-semibold">
                                                                    {new Date(dateValue).toLocaleDateString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric'
                                                                    })}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {subscriptionData.subscription.cancel_at_period_end && (
                                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                <p className="text-yellow-800 text-sm">
                                                                    <FaInfoCircle className="inline mr-1" />
                                                                    Your subscription will end at the end of the current billing period.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {subscriptionData.limits && (
                                                    <div className="mt-6 border-t pt-4">
                                                        <h5 className="font-semibold text-gray-900 mb-3">Your Limits</h5>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-gray-600">Routes per day:</span>
                                                                <span className="ml-2 font-semibold">
                                                                    {subscriptionData.limits.routes_per_day === 9223372036854776000 
                                                                        ? 'Unlimited' 
                                                                        : subscriptionData.limits.routes_per_day}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">Saved roads:</span>
                                                                <span className="ml-2 font-semibold">
                                                                    {subscriptionData.limits.saved_roads === 9223372036854776000 
                                                                        ? 'Unlimited' 
                                                                        : subscriptionData.limits.saved_roads}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-6 pt-4 border-t space-y-4">
                                                    {upgradeMessage.text && (
                                                        <div className={`p-3 rounded-lg text-sm ${
                                                            upgradeMessage.type === 'error' 
                                                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                                                : 'bg-green-50 text-green-700 border border-green-200'
                                                        }`}>
                                                            {upgradeMessage.text}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Change Billing Cycle */}
                                                    {subscriptionData.tier !== 'free' && (
                                                        <div className="mb-4">
                                                            <h5 className="font-semibold text-gray-900 mb-2">Change Billing Cycle</h5>
                                                            {((subscriptionData.subscription?.billing_cycle || 'monthly') === 'monthly') && (() => {
                                                                const savings = calculateYearlySavings(subscriptionData.tier);
                                                                return savings ? (
                                                                    <p className="text-sm text-gray-600 mb-2">
                                                                        Current: ${PRICING[subscriptionData.tier].monthly}/month × 12 = ${(PRICING[subscriptionData.tier].monthly * 12).toFixed(2)}/year
                                                                        <br />
                                                                        Yearly: ${PRICING[subscriptionData.tier].yearly}/year
                                                                        <span className="text-green-600 font-semibold ml-1">(Save ${savings.amount.toFixed(2)}/year)</span>
                                                                    </p>
                                                                ) : null;
                                                            })()}
                                                            <div className="flex gap-2">
                                                                {((subscriptionData.subscription?.billing_cycle || 'monthly') === 'monthly') ? (
                                                                    <button
                                                                        onClick={() => handleChangeBillingCycle('yearly')}
                                                                        disabled={upgradeLoading}
                                                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        {upgradeLoading ? (
                                                                            <>
                                                                                <FaSpinner className="animate-spin" />
                                                                                <span>Processing...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span>Switch to Yearly</span>
                                                                                {(() => {
                                                                                    const savings = calculateYearlySavings(subscriptionData.tier);
                                                                                    return savings ? (
                                                                                        <span className="text-xs bg-green-700 px-2 py-0.5 rounded">Save ${savings.amount.toFixed(2)}/year</span>
                                                                                    ) : null;
                                                                                })()}
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleChangeBillingCycle('monthly')}
                                                                        disabled={upgradeLoading}
                                                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
                                                        </div>
                                                    )}
                                                    
                                                    {/* Upgrade Options */}
                                                    {subscriptionData.tier !== 'pro' && (() => {
                                                        const targetPlan = subscriptionData.tier === 'free' ? 'premium' : 'pro';
                                                        const savings = calculateYearlySavings(targetPlan);
                                                        return (
                                                            <div className="mb-4">
                                                                <h5 className="font-semibold text-gray-900 mb-2">
                                                                    {subscriptionData.tier === 'free' ? 'Upgrade Plan' : 'Upgrade to Pro'}
                                                                </h5>
                                                                {savings && (
                                                                    <p className="text-sm text-gray-600 mb-2">
                                                                        <span className="text-green-600 font-semibold">Save ${savings.amount.toFixed(2)}/year</span> with yearly billing
                                                                    </p>
                                                                )}
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleUpgrade(targetPlan, 'monthly')}
                                                                        disabled={upgradeLoading}
                                                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        {upgradeLoading ? (
                                                                            <>
                                                                                <FaSpinner className="animate-spin" />
                                                                                <span>Processing...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {subscriptionData.tier === 'free' ? 'Upgrade to Premium' : 'Upgrade to Pro'} (Monthly)
                                                                                <span className="text-xs opacity-90">${PRICING[targetPlan].monthly}/mo</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpgrade(targetPlan, 'yearly')}
                                                                        disabled={upgradeLoading}
                                                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        {upgradeLoading ? (
                                                                            <>
                                                                                <FaSpinner className="animate-spin" />
                                                                                <span>Processing...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {subscriptionData.tier === 'free' ? 'Upgrade to Premium' : 'Upgrade to Pro'} (Yearly)
                                                                                <span className="text-xs bg-green-700 px-2 py-0.5 rounded">Save ${savings.amount.toFixed(2)}</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    
                                                    {/* Cancel Subscription Button */}
                                                    {subscriptionData.subscription && subscriptionData.tier !== 'free' && !subscriptionData.subscription.cancel_at_period_end && (
                                                        <div className="mb-4">
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
                                                                        // Call cancel API
                                                                        apiClient.post('/subscriptions/cancel')
                                                                            .then(() => {
                                                                                setUpgradeMessage({ type: 'success', text: 'Subscription will be cancelled at the end of your billing period' });
                                                                                // Reload subscription data
                                                                                fetchSubscriptionData();
                                                                            })
                                                                            .catch(error => {
                                                                                setUpgradeMessage({ type: 'error', text: error.response?.data?.message || 'Failed to cancel subscription' });
                                                                            });
                                                                    }
                                                                }}
                                                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <FaTimesCircle className="mr-1" />
                                                                Cancel Subscription
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Manage Subscription Link */}
                                                    <div className="pt-2 border-t border-gray-200">
                                                        <Link
                                                            href="/subscription"
                                                            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                                        >
                                                            <FaCreditCard className="mr-2" />
                                                            View All Plans & Manage Subscription
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                                <p className="text-gray-600 mb-4">You're currently on the Free plan.</p>
                                                <Link
                                                    href="/subscription"
                                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    <FaCreditCard className="mr-2" />
                                                    View Plans & Upgrade
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Tab.Panel>

                        </Tab.Panels>
                    </Tab.Group>
                </div>
            </div>
        </div>
    );
}


