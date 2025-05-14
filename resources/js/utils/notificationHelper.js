$1

export const IMPORTANT_NOTIFICATION_TYPES = [
    'verification',
    'password-reset',
    'security',
    'account-locked',
    'payment-failed'
];

export const SUPPRESSED_NOTIFICATION_TYPES = [
    'login-success',
    'logout-success',
    'form-saved',
    'minor-update'
];
$1
export const isImportantNotification = (type, message) => {
    
    if (IMPORTANT_NOTIFICATION_TYPES.includes(type)) {
        return true;
    }
    
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
$1
export const shouldSuppressNotification = (type, message) => {
    
    if (SUPPRESSED_NOTIFICATION_TYPES.includes(type)) {
        return true;
    }
    
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
$1
export const processNotification = (message, options = {}) => {
    const type = options.type || 'info';
    
    if (shouldSuppressNotification(type, message)) {
        return null;
    }
    
    const isImportant = options.isImportant || isImportantNotification(type, message);
    return {
        message,
        ...options,
        isImportant
    };
};
