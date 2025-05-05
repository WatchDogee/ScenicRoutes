import axios from 'axios';

// Dynamically determine the base URL
const getApiBaseUrl = () => {
    // In production, use the current origin + /api
    if (window.location.hostname !== 'localhost') {
        return `${window.location.origin}/api`;
    }
    // In development, use localhost:8000/api
    return 'http://localhost:8000/api';
};

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    withCredentials: true, // Important for cookies
});

// Initialize auth token from localStorage if it exists
const token = localStorage.getItem('token');
if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptor to handle CSRF token and auth
apiClient.interceptors.request.use(
    async (config) => {
        // Get CSRF token from cookie
        let token = document.cookie
            .split('; ')
            .find(row => row.startsWith('XSRF-TOKEN'))
            ?.split('=')[1];

        if (!token) {
            // If no CSRF token, try to get one
            try {
                await axios.get('/sanctum/csrf-cookie');
                token = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('XSRF-TOKEN'))
                    ?.split('=')[1];
            } catch (error) {
                console.error('Failed to get CSRF token:', error);
            }
        }

        if (token) {
            config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
        }

        // Get auth token from localStorage
        const authToken = localStorage.getItem('token');
        if (authToken) {
            config.headers['Authorization'] = `Bearer ${authToken}`;
        }

        // Remove any duplicate /api prefixes from the URL
        if (config.url.startsWith('/api/')) {
            config.url = config.url.replace('/api/', '/');
        }

        // Handle FormData
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

// Intercept responses to handle auth errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle CSRF token mismatch (419) or token expiration (401)
        if ((error.response?.status === 419 || error.response?.status === 401) && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh the CSRF token
                await axios.get('/sanctum/csrf-cookie');

                // Check if we have a valid auth token
                const authToken = localStorage.getItem('token');
                if (!authToken) {
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                // Retry the original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error('Failed to refresh tokens:', refreshError);
                localStorage.removeItem('token');
                delete apiClient.defaults.headers.common['Authorization'];
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // Enhanced error handling for validation errors
        if (error.response?.status === 422) {
            const validationErrors = error.response.data.errors || {};
            const message = error.response.data.message || 'Validation failed';
            return Promise.reject({
                ...error,
                validationErrors,
                message
            });
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

// Add auth state check function
export const checkAuthState = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }

        const response = await apiClient.get('/user');
        return !!response.data;
    } catch (error) {
        console.error('Auth state check failed:', error);
        return false;
    }
};

export default apiClient;