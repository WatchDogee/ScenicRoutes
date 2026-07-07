import { showToast } from '../Components/ToastContainer';

/**
 * Centralized error handler for the application
 */
export class ErrorHandler {
    /**
     * Handle API errors
     */
    static handleApiError(error, customMessage = null) {
        // Network error (no response)
        if (!error.response) {
            if (navigator.onLine === false) {
                return this.showError('No internet connection. Please check your network and try again.');
            }
            return this.showError(customMessage || 'Network error. Please try again.');
        }

        const status = error.response?.status;
        const data = error.response?.data;

        // Handle specific status codes
        switch (status) {
            case 400:
                return this.showError(
                    customMessage || data?.message || 'Invalid request. Please check your input.'
                );
            
            case 401:
                return this.showError(
                    customMessage || 'You are not authorized. Please log in again.'
                );
            
            case 403:
                return this.showError(
                    customMessage || data?.message || 'You do not have permission to perform this action.'
                );
            
            case 404:
                return this.showError(
                    customMessage || 'The requested resource was not found.'
                );
            
            case 419:
                return this.showError(
                    'Session expired. Please refresh the page and try again.'
                );
            
            case 422:
                // Validation errors
                const validationErrors = data?.errors || {};
                const firstError = Object.values(validationErrors).flat()[0];
                return this.showError(
                    customMessage || firstError || 'Validation failed. Please check your input.'
                );
            
            case 429:
                return this.showError(
                    'Too many requests. Please wait a moment and try again.'
                );
            
            case 500:
            case 503:
                return this.showError(
                    customMessage || 'Server error. Please try again later.'
                );
            
            default:
                return this.showError(
                    customMessage || data?.message || 'An error occurred. Please try again.'
                );
        }
    }

    /**
     * Handle route calculation errors
     */
    static handleRouteError(error) {
        if (error.response?.data?.message) {
            return this.showError(error.response.data.message);
        }
        return this.handleApiError(error, 'Failed to calculate route. Please try again.');
    }

    /**
     * Handle subscription errors
     */
    static handleSubscriptionError(error) {
        if (error.response?.data?.message) {
            return this.showError(error.response.data.message);
        }
        return this.handleApiError(error, 'Subscription operation failed. Please try again.');
    }

    /**
     * Show success message
     */
    static showSuccess(message) {
        showToast(message, 'success', 4000);
    }

    /**
     * Show error message
     */
    static showError(message) {
        showToast(message, 'error', 6000);
    }

    /**
     * Show warning message
     */
    static showWarning(message) {
        showToast(message, 'warning', 5000);
    }

    /**
     * Show info message
     */
    static showInfo(message) {
        showToast(message, 'info', 4000);
    }

    /**
     * Check if error is a network error
     */
    static isNetworkError(error) {
        return !error.response && (error.code === 'ERR_NETWORK' || !navigator.onLine);
    }

    /**
     * Check if error is retryable
     */
    static isRetryable(error) {
        if (!error.response) {
            return true; // Network errors are retryable
        }
        
        const status = error.response.status;
        // Retry on server errors and rate limits
        return status >= 500 || status === 429;
    }
}

export default ErrorHandler;



