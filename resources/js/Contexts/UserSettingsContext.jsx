import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserSettingsContext = createContext();

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
    
    const loadUserSettings = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await axios.get('/api/settings', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.settings) {
                    setUserSettings(response.data.settings);
                    return response.data.settings;
                }
            } catch (error) {
                
            }
        }
        return null;
    };
    
    useEffect(() => {
        loadUserSettings();
    }, []);
    
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
            
        }
    };
    return (
        <UserSettingsContext.Provider value={{ userSettings, updateUserSettings, loadUserSettings }}>
            {children}
        </UserSettingsContext.Provider>
    );
};
