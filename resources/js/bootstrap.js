import axios from 'axios';
window.axios = axios;
// Only send credentials with same-origin requests by default
// External API calls should explicitly set withCredentials: false
window.axios.defaults.withCredentials = window.location.origin.includes(window.location.hostname);
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';
window.axios.defaults.headers.common['Content-Type'] = 'application/json';
// Always use the current origin as the base URL
const getBaseUrl = () => {
    return window.location.origin;
};
window.axios.defaults.baseURL = getBaseUrl();
// Set the base URL for axios
// Function to get CSRF token from cookie with better error handling
const getCSRFToken = () => {
    try {
        if (!document.cookie) {
            return null;
        }
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN') {
                const decodedValue = decodeURIComponent(value);
                return decodedValue;
            }
        }
        // Also check for laravel_session cookie as a sanity check
        const hasLaravelSession = cookies.some(cookie => cookie.trim().startsWith('laravel_session='));
        return null;
    } catch (error) {
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
        return Promise.reject(error);
    }
);
// Add response interceptor to handle common errors
axios.interceptors.response.use(
    response => response,
    async error => {
        // Handle 419 (CSRF token mismatch) errors
        if (error.response && error.response.status === 419) {
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
        // Wait longer for cookies to be set (2000ms instead of 1500ms)
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Get the token from cookies
        const token = getCSRFToken();
        if (token) {
            // Set the token in axios defaults
            axios.defaults.headers.common['X-XSRF-TOKEN'] = token;
            return true;
        } else {
            // Try one more time with an even longer delay
            await new Promise(resolve => setTimeout(resolve, 3000));
            const retryToken = getCSRFToken();
            if (retryToken) {
                axios.defaults.headers.common['X-XSRF-TOKEN'] = retryToken;
                return true;
            }
            // Try a direct request to the root path to ensure cookies are set
            await fetch(window.location.origin, {
                method: 'GET',
                credentials: 'include'
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
            const lastChanceToken = getCSRFToken();
            if (lastChanceToken) {
                axios.defaults.headers.common['X-XSRF-TOKEN'] = lastChanceToken;
                return true;
            }
            // Try a direct request to the API health endpoint
            try {
                await fetch(`${window.location.origin}/api/health`, {
                    method: 'GET',
                    credentials: 'include'
                });
                await new Promise(resolve => setTimeout(resolve, 1500));
                const apiHealthToken = getCSRFToken();
                if (apiHealthToken) {
                    axios.defaults.headers.common['X-XSRF-TOKEN'] = apiHealthToken;
                    return true;
                }
            } catch (healthError) {
                // Health endpoint failed
            }
            return false;
        }
    } catch (error) {
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
    // Handle unhandled promise rejections
});
