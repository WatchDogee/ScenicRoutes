import React, { createContext, useState, useContext, useCallback } from 'react';
import CustomNotification from '../Components/CustomNotification';
import { processNotification } from '../utils/notificationHelper';

// Create the context
const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);

    // Add a new notification
    const addNotification = useCallback((message, options = {}) => {
        // Process the notification to determine if it should be shown
        const processedNotification = processNotification(message, options);

        // If the notification should be suppressed, return null
        if (!processedNotification) {
            return null;
        }

        const id = Date.now();
        const { type = 'info', duration = 5000, isImportant = false } = processedNotification;

        // For important notifications, also show a browser alert
        if (isImportant) {
            alert(message);
        }

        setNotifications(prev => [
            ...prev,
            { id, message, type, duration, isImportant }
        ]);

        return id;
    }, []);

    // Remove a notification by ID
    const removeNotification = useCallback(id => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Context value
    const value = {
        notifications,
        addNotification,
        removeNotification,
        clearNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}

            {/* Render notifications */}
            <div className="notification-container">
                {notifications.map(notification => (
                    <CustomNotification
                        key={notification.id}
                        message={notification.message}
                        type={notification.type}
                        duration={notification.duration}
                        isImportant={notification.isImportant}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

// Custom hook to use the notification context
export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
