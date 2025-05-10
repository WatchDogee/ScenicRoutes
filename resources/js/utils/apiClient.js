import axios from 'axios';

// Always use the current origin + /api as the base URL
const getApiBaseUrl = () => {
    // Make sure we don't have double slashes in the URL
    const origin = window.location.origin;
    return `${origin}/api`;
};

// Log the API base URL for debugging
console.log('API client base URL:', getApiBaseUrl());

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
        let token = null;

        // Log all cookies for debugging
        console.log('All cookies in apiClient:', document.cookie);

        if (document.cookie) {
            const tokenCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('XSRF-TOKEN'));

            if (tokenCookie) {
                token = tokenCookie.split('=')[1];
                console.log('Found XSRF-TOKEN in cookie:', token.substring(0, 10) + '...');
            } else {
                console.log('No XSRF-TOKEN found in cookies');
            }
        } else {
            console.log('No cookies available in apiClient');
        }

        if (!token) {
            // If no CSRF token, try to get one
            try {
                console.log('Requesting new CSRF token');

                // Use fetch with explicit CORS mode and credentials
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

                console.log('CSRF cookie response status:', response.status);

                // Wait for cookies to be set
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('Cookies after CSRF request:', document.cookie);

                if (document.cookie) {
                    const newTokenCookie = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('XSRF-TOKEN'));

                    if (newTokenCookie) {
                        token = newTokenCookie.split('=')[1];
                        console.log('Found new XSRF-TOKEN:', token.substring(0, 10) + '...');
                    } else {
                        console.log('No XSRF-TOKEN found after request');
                    }
                }
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

        // Fix URL handling - don't modify URLs that already have /api prefix
        // This was causing issues with the login endpoint

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
                console.log('Trying to refresh CSRF token after error:', error.response?.status);

                // Try to refresh the CSRF token using fetch instead of axios
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

                console.log('CSRF refresh response status:', response.status);

                // Wait for cookies to be set
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('Cookies after CSRF refresh:', document.cookie);

                // Get the new token
                let newToken = null;
                if (document.cookie) {
                    const tokenCookie = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('XSRF-TOKEN'));

                    if (tokenCookie) {
                        newToken = tokenCookie.split('=')[1];
                        console.log('Found new XSRF-TOKEN after refresh:', newToken.substring(0, 10) + '...');

                        // Update the original request with the new token
                        originalRequest.headers['X-XSRF-TOKEN'] = decodeURIComponent(newToken);
                    }
                }

                // Check if we have a valid auth token
                const authToken = localStorage.getItem('token');
                if (!authToken) {
                    console.log('No auth token found, redirecting to login');
                    // Don't redirect for now, just log the issue
                    // window.location.href = '/login';
                    return Promise.reject(error);
                }

                // Update auth token in the original request
                originalRequest.headers['Authorization'] = `Bearer ${authToken}`;

                // Retry the original request
                console.log('Retrying original request with new tokens');
                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error('Failed to refresh tokens:', refreshError);
                // Don't remove token or redirect for now, just log the issue
                // localStorage.removeItem('token');
                // delete apiClient.defaults.headers.common['Authorization'];
                // window.location.href = '/login';
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