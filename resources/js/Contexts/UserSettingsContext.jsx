import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create the context
export const UserSettingsContext = createContext();

// Create a provider component
export const UserSettingsProvider = ({ children }) => {
    const [userSettings, setUserSettings] = useState({
        measurement_units: 'metric',
        default_map_view: 'standard',
        show_community_by_default: false,
        default_search_radius: 10,
        default_search_type: 'town',
        theme: 'light',
        notifications_enabled: true,
        default_navigation_app: 'google_maps',
    });

    // Function to load user settings from the API
    const loadUserSettings = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                console.log('Loading user settings from API...');
                const response = await axios.get('/api/settings', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data && response.data.settings) {
                    console.log('User settings loaded:', response.data.settings);
                    setUserSettings(response.data.settings);
                    return response.data.settings;
                }
            } catch (error) {
                console.error('Error loading user settings:', error);
            }
        }
        return null;
    };

    // Load user settings from the API when the component mounts
    useEffect(() => {
        loadUserSettings();
    }, []);

    // Function to update user settings
    const updateUserSettings = async (newSettings) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.post('/api/settings', newSettings, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.settings) {
                setUserSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Error updating user settings:', error);
        }
    };

    return (
        <UserSettingsContext.Provider value={{ userSettings, updateUserSettings, loadUserSettings }}>
            {children}
        </UserSettingsContext.Provider>
    );
};
