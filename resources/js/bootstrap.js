import axios from 'axios';

window.axios = axios;

// Ensure cookies are sent with every request
window.axios.defaults.withCredentials = true;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';
window.axios.defaults.headers.common['Content-Type'] = 'application/json';

// Always use the current origin as the base URL
const getBaseUrl = () => {
    return window.location.origin;
};

window.axios.defaults.baseURL = getBaseUrl();

// Function to get CSRF token from cookie with better error handling
const getCSRFToken = () => {
    try {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN') {
                return decodeURIComponent(value);
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting CSRF token from cookie:', error);
        return null;
    }
};

// Add interceptor to include CSRF token in all requests
axios.interceptors.request.use(
    config => {
        const token = getCSRFToken();
        if (token) {
            config.headers['X-XSRF-TOKEN'] = token;
        }
        return config;
    },
    error => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor to handle common errors
axios.interceptors.response.use(
    response => response,
    async error => {
        // Handle 419 (CSRF token mismatch) errors
        if (error.response && error.response.status === 419) {
            console.warn('CSRF token mismatch detected, refreshing token...');

            // Try to refresh the CSRF token
            await refreshCSRFToken();

            // Retry the original request
            const originalRequest = error.config;
            const token = getCSRFToken();
            if (token) {
                originalRequest.headers['X-XSRF-TOKEN'] = token;
            }

            return axios(originalRequest);
        }

        return Promise.reject(error);
    }
);

// Function to refresh CSRF token
const refreshCSRFToken = async () => {
    try {
        // Clear any existing CSRF token from headers
        delete axios.defaults.headers.common['X-XSRF-TOKEN'];

        // Make a direct fetch request to get a fresh CSRF token
        // This avoids using axios which might have interceptors that could cause issues
        const response = await fetch('/sanctum/csrf-cookie', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        console.log('CSRF cookie request completed');

        // Wait longer for cookies to be set (1000ms instead of 500ms)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the token from cookies
        const token = getCSRFToken();

        if (token) {
            // Set the token in axios defaults
            axios.defaults.headers.common['X-XSRF-TOKEN'] = token;
            console.log('CSRF token refreshed successfully');
            return true;
        } else {
            // Try one more time with an even longer delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            const retryToken = getCSRFToken();

            if (retryToken) {
                axios.defaults.headers.common['X-XSRF-TOKEN'] = retryToken;
                console.log('CSRF token refreshed successfully on retry');
                return true;
            }

            // Log more detailed information about cookies
            console.warn('CSRF token not found in cookies after refresh attempt');
            console.log('Available cookies:', document.cookie);
            return false;
        }
    } catch (error) {
        console.error('Error refreshing CSRF token:', error);
        return false;
    }
};

// Initialize CSRF protection
(async function initializeCSRF() {
    await refreshCSRFToken();
})();

// Export the refresh function for use in components
window.refreshCSRFToken = refreshCSRFToken;

// Add a global axios error handler
window.addEventListener('unhandledrejection', event => {
    if (event.reason && event.reason.isAxiosError) {
        console.error('Unhandled Axios error:', event.reason);
    }
});
