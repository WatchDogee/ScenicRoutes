import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';
import MapAuthenticatedLayout from '@/Layouts/MapAuthenticatedLayout';
import axios from 'axios';
import { Tab } from '@headlessui/react';

export default function Settings({ auth }) {
    // Use the auth prop if available (session auth) or fetch it (token auth)
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
        show_community_by_default: false,
        default_search_radius: 10,
        default_search_type: 'town',
        theme: 'light',
        notifications_enabled: true,
        default_navigation_app: 'google_maps',
    });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        // Fetch user data when component mounts (only if not already provided via auth prop)
        const fetchUserData = async () => {
            // If we already have user data from the auth prop, just fetch settings
            if (auth?.user) {
                await fetchUserSettings();
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const response = await apiClient.get('/user');
                const userData = response.data;
                setUser(userData);
                setProfileForm(prev => ({
                    ...prev,
                    name: userData.name || '',
                    email: userData.email || ''
                }));

                // Fetch user settings
                await fetchUserSettings();
            } catch (error) {
                console.error('Error fetching user data:', error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
            }
        };

        fetchUserData();
    }, [auth]);

    /**
     * Fetch user settings from the API
     */
    const fetchUserSettings = async () => {
        try {
            setSettingsLoading(true);
            const response = await apiClient.get('/settings');
            setUserSettings(response.data.settings);
        } catch (error) {
            console.error('Error fetching user settings:', error);
            setSettingsMessage({
                type: 'error',
                text: 'Failed to load settings. Please try again.'
            });
        } finally {
            setSettingsLoading(false);
        }
    };

    useEffect(() => {
        // Cleanup preview URL when component unmounts
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    /**
     * Handle changes to settings form inputs
     */
    const handleSettingChange = (key, value) => {
        setUserSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    /**
     * Update a single setting
     */
    const updateSetting = async (key, value) => {
        try {
            setSettingsLoading(true);
            await apiClient.post('/settings', { key, value });

            setSettingsMessage({
                type: 'success',
                text: 'Setting updated successfully!'
            });

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSettingsMessage({ type: '', text: '' });
            }, 3000);
        } catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            setSettingsMessage({
                type: 'error',
                text: 'Failed to update setting. Please try again.'
            });
        } finally {
            setSettingsLoading(false);
        }
    };

    /**
     * Save all settings at once
     */
    const saveAllSettings = async () => {
        try {
            setSettingsLoading(true);
            await apiClient.post('/settings/batch', { settings: userSettings });

            setSettingsMessage({
                type: 'success',
                text: 'All settings updated successfully!'
            });

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSettingsMessage({ type: '', text: '' });
            }, 3000);
        } catch (error) {
            console.error('Error updating settings:', error);
            setSettingsMessage({
                type: 'error',
                text: 'Failed to update settings. Please try again.'
            });
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type and size
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
            const maxSize = 2 * 1024 * 1024; // 2MB

            if (!allowedTypes.includes(file.type)) {
                setMessage({
                    type: 'error',
                    text: 'Invalid file type. Please upload a JPEG, PNG, or GIF image.'
                });
                return;
            }

            if (file.size > maxSize) {
                setMessage({
                    type: 'error',
                    text: 'File is too large. Maximum size is 2MB.'
                });
                return;
            }

            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            setMessage({ type: '', text: '' });
        }
    };

    const handleProfilePictureUpload = async () => {
        if (!selectedImage) {
            setMessage({
                type: 'error',
                text: 'Please select an image to upload.'
            });
            return;
        }

        try {
            setLoading(true);

            // If we're using token auth, make sure we have a token
            if (!auth?.user) {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }
            }

            const formData = new FormData();
            formData.append('profile_picture', selectedImage);

            const response = await apiClient.post('/profile/picture', formData);

            setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
            setUser(prevUser => ({
                ...prevUser,
                profile_picture_url: response.data.profile_picture_url
            }));

            setSelectedImage(null);
            setImagePreview(null);
        } catch (error) {
            console.error('Error uploading profile picture:', error);

            let errorMessage = 'Failed to update profile picture.';

            if (error.response?.status === 401) {
                // If using token auth, clear the token
                if (!auth?.user) {
                    localStorage.removeItem('token');
                }
                window.location.href = '/login';
                return;
            }

            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            setMessage({
                type: 'error',
                text: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            // If we're using token auth, make sure we have a token
            if (!auth?.user) {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }
            }

            const response = await apiClient.post('/profile', profileForm);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setUser(response.data.user);

            // Clear password fields after successful update
            setProfileForm(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                new_password_confirmation: ''
            }));
        } catch (error) {
            console.error('Error updating profile:', error);
            let errorMessage = 'Failed to update profile.';

            if (error.response?.status === 401) {
                // If using token auth, clear the token
                if (!auth?.user) {
                    localStorage.removeItem('token');
                }
                window.location.href = '/login';
                return;
            }

            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            setMessage({
                type: 'error',
                text: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <MapAuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Settings</h2>}
        >
            <Head title="Settings" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold">User Settings</h3>
                                <Link
                                    href={route('map')}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                    Back to Map
                                </Link>
                            </div>

                            <Tab.Group>
                                <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/10 p-1 mb-6">
                                    <Tab
                                        className={({ selected }) =>
                                            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                                            ${selected
                                                ? 'bg-white text-blue-700 shadow'
                                                : 'text-gray-600 hover:bg-white/[0.12] hover:text-blue-600'
                                            }`
                                        }
                                    >
                                        Profile
                                    </Tab>
                                    <Tab
                                        className={({ selected }) =>
                                            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                                            ${selected
                                                ? 'bg-white text-blue-700 shadow'
                                                : 'text-gray-600 hover:bg-white/[0.12] hover:text-blue-600'
                                            }`
                                        }
                                    >
                                        Map Preferences
                                    </Tab>
                                    <Tab
                                        className={({ selected }) =>
                                            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                                            ${selected
                                                ? 'bg-white text-blue-700 shadow'
                                                : 'text-gray-600 hover:bg-white/[0.12] hover:text-blue-600'
                                            }`
                                        }
                                    >
                                        Appearance
                                    </Tab>
                                    <Tab
                                        className={({ selected }) =>
                                            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                                            ${selected
                                                ? 'bg-white text-blue-700 shadow'
                                                : 'text-gray-600 hover:bg-white/[0.12] hover:text-blue-600'
                                            }`
                                        }
                                    >
                                        Notifications
                                    </Tab>
                                </Tab.List>

                                <Tab.Panels>
                                    {/* Profile Tab */}
                                    <Tab.Panel className="rounded-xl bg-white p-3">
                                        {message.text && (
                                            <div className={`p-4 mb-6 rounded ${
                                                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {message.text}
                                            </div>
                                        )}

                                        {/* Profile Picture Section */}
                                        <div className="mb-8">
                                            <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
                                            <div className="flex items-center space-x-6">
                                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                                                    {imagePreview ? (
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : user?.profile_picture_url ? (
                                                        <img
                                                            src={user.profile_picture_url}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                            <span className="text-gray-500">No Image</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="hidden"
                                                        id="profile-picture-input"
                                                    />
                                                    <label
                                                        htmlFor="profile-picture-input"
                                                        className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition-colors"
                                                    >
                                                        Choose Image
                                                    </label>
                                                    {selectedImage && (
                                                        <button
                                                            onClick={handleProfilePictureUpload}
                                                            disabled={loading}
                                                            className="ml-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-green-300"
                                                        >
                                                            {loading ? 'Uploading...' : 'Upload'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Profile Form */}
                                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={profileForm.name}
                                                    onChange={handleInputChange}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={profileForm.email}
                                                    onChange={handleInputChange}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">Current Password</label>
                                                <input
                                                    type="password"
                                                    id="current_password"
                                                    name="current_password"
                                                    value={profileForm.current_password}
                                                    onChange={handleInputChange}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">New Password</label>
                                                <input
                                                    type="password"
                                                    id="new_password"
                                                    name="new_password"
                                                    value={profileForm.new_password}
                                                    onChange={handleInputChange}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="new_password_confirmation" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    id="new_password_confirmation"
                                                    name="new_password_confirmation"
                                                    value={profileForm.new_password_confirmation}
                                                    onChange={handleInputChange}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                                                >
                                                    {loading ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    </Tab.Panel>

                                    {/* Map Preferences Tab */}
                                    <Tab.Panel className="rounded-xl bg-white p-3">
                                        {settingsMessage.text && (
                                            <div className={`p-4 mb-6 rounded ${
                                                settingsMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {settingsMessage.text}
                                            </div>
                                        )}

                                        <div className="space-y-6">
                                            <h3 className="text-lg font-semibold mb-4">Map Preferences</h3>

                                            {/* Measurement Units */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Measurement Units</label>
                                                <div className="flex gap-4">
                                                    <label className="inline-flex items-center">
                                                        <input
                                                            type="radio"
                                                            name="measurement_units"
                                                            value="metric"
                                                            checked={userSettings.measurement_units === 'metric'}
                                                            onChange={() => handleSettingChange('measurement_units', 'metric')}
                                                            className="form-radio h-4 w-4 text-blue-600"
                                                        />
                                                        <span className="ml-2">Metric (km)</span>
                                                    </label>
                                                    <label className="inline-flex items-center">
                                                        <input
                                                            type="radio"
                                                            name="measurement_units"
                                                            value="imperial"
                                                            checked={userSettings.measurement_units === 'imperial'}
                                                            onChange={() => handleSettingChange('measurement_units', 'imperial')}
                                                            className="form-radio h-4 w-4 text-blue-600"
                                                        />
                                                        <span className="ml-2">Imperial (miles)</span>
                                                    </label>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Choose how distances are displayed throughout the app.
                                                </p>
                                            </div>

                                            {/* Default Map View */}
                                            <div>
                                                <label htmlFor="default_map_view" className="block text-sm font-medium text-gray-700 mb-2">Default Map View</label>
                                                <select
                                                    id="default_map_view"
                                                    value={userSettings.default_map_view}
                                                    onChange={(e) => handleSettingChange('default_map_view', e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                >
                                                    <option value="terrain">Terrain</option>
                                                    <option value="satellite">Satellite</option>
                                                    <option value="standard">Standard</option>
                                                </select>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Select the default map style when opening the app.
                                                </p>
                                            </div>

                                            {/* Default Search Radius */}
                                            <div>
                                                <label htmlFor="default_search_radius" className="block text-sm font-medium text-gray-700 mb-2">
                                                    Default Search Radius: {userSettings.default_search_radius} {userSettings.measurement_units === 'metric' ? 'km' : 'miles'}
                                                </label>
                                                <input
                                                    type="range"
                                                    id="default_search_radius"
                                                    min="5"
                                                    max="50"
                                                    step="5"
                                                    value={userSettings.default_search_radius}
                                                    onChange={(e) => {
                                                        const newValue = parseInt(e.target.value);
                                                        handleSettingChange('default_search_radius', newValue);
                                                        // Update the range progress CSS variable
                                                        const percentage = ((newValue - 5) / (50 - 5)) * 100;
                                                        e.target.style.setProperty('--range-progress', `${percentage}%`);
                                                    }}
                                                    className="w-full h-2 rounded-lg cursor-pointer blue-range"
                                                    ref={(el) => {
                                                        if (el) {
                                                            // Set the CSS variable for the range progress
                                                            const percentage = ((userSettings.default_search_radius - 5) / (50 - 5)) * 100;
                                                            el.style.setProperty('--range-progress', `${percentage}%`);
                                                        }
                                                    }}
                                                />
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Set the default search radius when looking for roads.
                                                </p>
                                            </div>

                                            {/* Default Search Type */}
                                            <div>
                                                <label htmlFor="default_search_type" className="block text-sm font-medium text-gray-700 mb-2">Default Search Area</label>
                                                <select
                                                    id="default_search_type"
                                                    value={userSettings.default_search_type}
                                                    onChange={(e) => handleSettingChange('default_search_type', e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                >
                                                    <option value="town">Town/City</option>
                                                    <option value="region">Region/County</option>
                                                    <option value="country">Country</option>
                                                </select>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Choose the default search area type.
                                                </p>
                                            </div>

                                            {/* Default Navigation App */}
                                            <div>
                                                <label htmlFor="default_navigation_app" className="block text-sm font-medium text-gray-700 mb-2">Default Navigation App</label>
                                                <select
                                                    id="default_navigation_app"
                                                    value={userSettings.default_navigation_app}
                                                    onChange={(e) => handleSettingChange('default_navigation_app', e.target.value)}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                >
                                                    <option value="google_maps">Google Maps</option>
                                                    <option value="waze">Waze</option>
                                                    <option value="apple_maps">Apple Maps</option>
                                                    <option value="osmand">OsmAnd</option>
                                                </select>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Select your preferred navigation app for directions.
                                                </p>
                                            </div>

                                            {/* Show Community by Default */}
                                            <div>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={userSettings.show_community_by_default}
                                                        onChange={(e) => handleSettingChange('show_community_by_default', e.target.checked)}
                                                        className="form-checkbox h-5 w-5 text-blue-600"
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700">Show Community Panel by Default</span>
                                                </label>
                                                <p className="text-sm text-gray-500 mt-1 ml-7">
                                                    Automatically show the community panel when opening the map.
                                                </p>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={saveAllSettings}
                                                    disabled={settingsLoading}
                                                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                                                >
                                                    {settingsLoading ? 'Saving...' : 'Save Map Preferences'}
                                                </button>
                                            </div>
                                        </div>
                                    </Tab.Panel>

                                    {/* Appearance Tab */}
                                    <Tab.Panel className="rounded-xl bg-white p-3">
                                        {settingsMessage.text && (
                                            <div className={`p-4 mb-6 rounded ${
                                                settingsMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {settingsMessage.text}
                                            </div>
                                        )}

                                        <div className="space-y-6">
                                            <h3 className="text-lg font-semibold mb-4">Appearance Settings</h3>

                                            {/* Theme Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div
                                                        className={`p-4 border rounded-lg cursor-pointer ${
                                                            userSettings.theme === 'light'
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                        onClick={() => handleSettingChange('theme', 'light')}
                                                    >
                                                        <div className="h-24 bg-white border border-gray-200 rounded-md mb-2"></div>
                                                        <div className="text-center font-medium">Light</div>
                                                    </div>
                                                    <div
                                                        className={`p-4 border rounded-lg cursor-pointer ${
                                                            userSettings.theme === 'dark'
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                        onClick={() => handleSettingChange('theme', 'dark')}
                                                    >
                                                        <div className="h-24 bg-gray-800 border border-gray-700 rounded-md mb-2"></div>
                                                        <div className="text-center font-medium">Dark</div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    Choose between light and dark theme for the application.
                                                </p>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => saveAllSettings()}
                                                    disabled={settingsLoading}
                                                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                                                >
                                                    {settingsLoading ? 'Saving...' : 'Save Appearance Settings'}
                                                </button>
                                            </div>
                                        </div>
                                    </Tab.Panel>

                                    {/* Notifications Tab */}
                                    <Tab.Panel className="rounded-xl bg-white p-3">
                                        {settingsMessage.text && (
                                            <div className={`p-4 mb-6 rounded ${
                                                settingsMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {settingsMessage.text}
                                            </div>
                                        )}

                                        <div className="space-y-6">
                                            <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>

                                            {/* Notifications Toggle */}
                                            <div>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={userSettings.notifications_enabled}
                                                        onChange={(e) => handleSettingChange('notifications_enabled', e.target.checked)}
                                                        className="form-checkbox h-5 w-5 text-blue-600"
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700">Enable Notifications</span>
                                                </label>
                                                <p className="text-sm text-gray-500 mt-1 ml-7">
                                                    Receive notifications about new comments, reviews, and other updates.
                                                </p>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => saveAllSettings()}
                                                    disabled={settingsLoading}
                                                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                                                >
                                                    {settingsLoading ? 'Saving...' : 'Save Notification Settings'}
                                                </button>
                                            </div>
                                        </div>
                                    </Tab.Panel>
                                </Tab.Panels>
                            </Tab.Group>
                        </div>
                    </div>
                </div>
            </div>
        </MapAuthenticatedLayout>
    );
}