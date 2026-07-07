import axios from 'axios';
import ErrorHandler from './errorHandler';

const getApiBaseUrl = () => {
    // For Capacitor (mobile), use environment variable or default
    if (window.Capacitor) {
        // Check if we have an environment variable set
        let apiUrl = import.meta.env.VITE_API_URL;
        
        // If no env var, default to emulator IP (for development)
        // User can override by setting VITE_API_URL in .env file
        if (!apiUrl) {
            // Default to emulator IP - change this to production URL when deploying
            apiUrl = 'http://10.0.2.2:8000';
        }
        
        return `${apiUrl}/api`;
    }
    // For web, use same origin
    const origin = window.location.origin;
    return `${origin}/api`;
};

const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    withCredentials: true,
    timeout: 30000, // 30 second timeout
});
const token = localStorage.getItem('token');
if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
apiClient.interceptors.request.use(
    async (config) => {
        // Skip CSRF token for Capacitor (mobile) - we use Bearer token auth
        const isCapacitor = window.Capacitor;
        
        if (!isCapacitor) {
            // Web mode: handle CSRF tokens
            let token = null;
            if (document.cookie) {
                const tokenCookie = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('XSRF-TOKEN'));
                if (tokenCookie) {
                    token = tokenCookie.split('=')[1];
                }
            }
            if (!token) {
                try {
                    const response = await fetch(`${window.location.origin}/sanctum/csrf-cookie`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Origin': window.location.origin
                        },
                        mode: 'cors'
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (document.cookie) {
                        const newTokenCookie = document.cookie
                            .split('; ')
                            .find(row => row.startsWith('XSRF-TOKEN'));
                        if (newTokenCookie) {
                            token = newTokenCookie.split('=')[1];
                        }
                    }
                } catch (error) {
                    // Silently fail - CSRF might not be needed for API-only mode
                }
            }
            if (token) {
                config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
            }
        }
        
        // Always set Bearer token if available
        const authToken = localStorage.getItem('token');
        if (authToken) {
            config.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        } else {
            config.headers['Content-Type'] = 'application/json';
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetry = (error, retryCount) => {
    if (retryCount >= MAX_RETRIES) return false;
    
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.response?.status) {
        const status = error.response.status;
        // Retry on server errors (5xx) and rate limits (429)
        return status >= 500 || status === 429;
    }
    
    // Retry on network errors
    return !error.response && ErrorHandler.isNetworkError(error);
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config || {};
        
        // Handle CSRF token refresh (419/401) - only for web, not Capacitor
        const isCapacitor = window.Capacitor;
        if (!isCapacitor && (error.response?.status === 419 || error.response?.status === 401) && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const response = await fetch(`${window.location.origin}/sanctum/csrf-cookie`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Origin': window.location.origin
                    },
                    mode: 'cors'
                });
                await sleep(1000);
                let newToken = null;
                if (document.cookie) {
                    const tokenCookie = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('XSRF-TOKEN'));
                    if (tokenCookie) {
                        newToken = tokenCookie.split('=')[1];
                        originalRequest.headers['X-XSRF-TOKEN'] = decodeURIComponent(newToken);
                    }
                }
                const authToken = localStorage.getItem('token');
                if (!authToken) {
                    return Promise.reject(error);
                }
                originalRequest.headers['Authorization'] = `Bearer ${authToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        // Retry logic for retryable errors
        const retryCount = originalRequest._retryCount || 0;
        if (shouldRetry(error, retryCount)) {
            originalRequest._retryCount = retryCount + 1;
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            await sleep(delay);
            
            return apiClient(originalRequest);
        }

        // Handle validation errors (422)
        if (error.response?.status === 422) {
            const validationErrors = error.response.data.errors || {};
            const message = error.response.data.message || 'Validation failed';
            return Promise.reject({
                ...error,
                validationErrors,
                message
            });
        }

        // Auto-show error toast for non-retryable errors
        if (!originalRequest._skipErrorToast) {
            ErrorHandler.handleApiError(error);
        }

        return Promise.reject(error);
    }
);
export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('token', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        localStorage.removeItem('token');
        delete apiClient.defaults.headers.common['Authorization'];
    }
};
export const checkAuthState = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }
        const response = await apiClient.get('/user');
        return !!response.data;
    } catch (error) {
        return false;
    }
};
export default apiClient;