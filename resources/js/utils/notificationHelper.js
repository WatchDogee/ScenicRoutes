/**
 * Helper functions for handling notifications
 */

// List of important notification types that should always show as alerts
export const IMPORTANT_NOTIFICATION_TYPES = [
    'verification',
    'password-reset',
    'security',
    'account-locked',
    'payment-failed'
];

// List of notification types that should be suppressed (not shown at all)
export const SUPPRESSED_NOTIFICATION_TYPES = [
    'login-success',
    'logout-success',
    'form-saved',
    'minor-update'
];

/**
 * Determine if a notification is important based on its type or content
 * @param {string} type - The notification type
 * @param {string} message - The notification message
 * @returns {boolean} - Whether the notification is important
 */
export const isImportantNotification = (type, message) => {
    // Check if it's an important type
    if (IMPORTANT_NOTIFICATION_TYPES.includes(type)) {
        return true;
    }
    
    // Check for important keywords in the message
    const importantKeywords = [
        'verify', 
        'verification', 
        'password reset', 
        'security', 
        'warning', 
        'important', 
        'required'
    ];
    
    return importantKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
    );
};

/**
 * Determine if a notification should be suppressed
 * @param {string} type - The notification type
 * @param {string} message - The notification message
 * @returns {boolean} - Whether the notification should be suppressed
 */
export const shouldSuppressNotification = (type, message) => {
    // Check if it's a suppressed type
    if (SUPPRESSED_NOTIFICATION_TYPES.includes(type)) {
        return true;
    }
    
    // Check for suppressed keywords in the message
    const suppressedKeywords = [
        'logged in', 
        'logged out', 
        'saved', 
        'updated'
    ];
    
    return suppressedKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
    );
};

/**
 * Process a notification before displaying it
 * @param {string} message - The notification message
 * @param {Object} options - Notification options
 * @returns {Object|null} - Processed notification or null if it should be suppressed
 */
export const processNotification = (message, options = {}) => {
    const type = options.type || 'info';
    
    // Check if notification should be suppressed
    if (shouldSuppressNotification(type, message)) {
        return null;
    }
    
    // Check if notification is important
    const isImportant = options.isImportant || isImportantNotification(type, message);
    
    return {
        message,
        ...options,
        isImportant
    };
};
