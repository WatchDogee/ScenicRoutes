import React, { createContext, useState, useContext, useCallback } from 'react';
import CustomNotification from '../Components/CustomNotification';
import { processNotification } from '../utils/notificationHelper';

const NotificationContext = createContext();
export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    
    const addNotification = useCallback((message, options = {}) => {
        
        const processedNotification = processNotification(message, options);
        
        if (!processedNotification) {
            return null;
        }
        const id = Date.now();
        const { type = 'info', duration = 5000, isImportant = false } = processedNotification;
        
        if (isImportant) {
            alert(message);
        }
        setNotifications(prev => [
            ...prev,
            { id, message, type, duration, isImportant }
        ]);
        return id;
    }, []);
    
    const removeNotification = useCallback(id => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);
    
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);
    
    const value = {
        notifications,
        addNotification,
        removeNotification,
        clearNotifications
    };
    return (
        <NotificationContext.Provider value={value}>
            {children}
            {$1}
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

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
