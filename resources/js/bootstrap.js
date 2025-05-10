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

// Log the base URL for debugging
console.log('Axios base URL:', window.axios.defaults.baseURL);

// Function to get CSRF token from cookie with better error handling
const getCSRFToken = () => {
    try {
        if (!document.cookie) {
            console.warn('No cookies available');
            return null;
        }

        const cookies = document.cookie.split(';');
        console.log('All cookies:', cookies);

        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN') {
                const decodedValue = decodeURIComponent(value);
                console.log('Found XSRF-TOKEN:', decodedValue.substring(0, 10) + '...');
                return decodedValue;
            }
        }

        // Also check for laravel_session cookie as a sanity check
        const hasLaravelSession = cookies.some(cookie => cookie.trim().startsWith('laravel_session='));
        if (hasLaravelSession) {
            console.log('Laravel session cookie found, but no XSRF-TOKEN');
        } else {
            console.warn('Laravel session cookie not found');
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

        // Log the current cookies before making the request
        console.log('Cookies before CSRF request:', document.cookie);

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

        console.log('CSRF cookie request completed with status:', response.status);

        // Wait longer for cookies to be set (2000ms instead of 1500ms)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Log cookies after the initial wait
        console.log('Cookies after initial wait:', document.cookie);

        // Get the token from cookies
        const token = getCSRFToken();

        if (token) {
            // Set the token in axios defaults
            axios.defaults.headers.common['X-XSRF-TOKEN'] = token;
            console.log('CSRF token refreshed successfully:', token);
            return true;
        } else {
            // Try one more time with an even longer delay
            console.log('Token not found, waiting longer...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Log cookies after the longer wait
            console.log('Cookies after extended wait:', document.cookie);

            const retryToken = getCSRFToken();

            if (retryToken) {
                axios.defaults.headers.common['X-XSRF-TOKEN'] = retryToken;
                console.log('CSRF token refreshed successfully on retry:', retryToken);
                return true;
            }

            // Try a direct request to the root path to ensure cookies are set
            console.log('Still no token, trying a direct request to root path...');
            await fetch(window.location.origin, {
                method: 'GET',
                credentials: 'include'
            });

            await new Promise(resolve => setTimeout(resolve, 1500));
            const lastChanceToken = getCSRFToken();

            if (lastChanceToken) {
                axios.defaults.headers.common['X-XSRF-TOKEN'] = lastChanceToken;
                console.log('CSRF token obtained after root request:', lastChanceToken);
                return true;
            }

            // Try a direct request to the API health endpoint
            console.log('Still no token, trying API health endpoint...');
            try {
                await fetch(`${window.location.origin}/api/health`, {
                    method: 'GET',
                    credentials: 'include'
                });

                await new Promise(resolve => setTimeout(resolve, 1500));
                const apiHealthToken = getCSRFToken();

                if (apiHealthToken) {
                    axios.defaults.headers.common['X-XSRF-TOKEN'] = apiHealthToken;
                    console.log('CSRF token obtained after API health request:', apiHealthToken);
                    return true;
                }
            } catch (healthError) {
                console.error('API health endpoint request failed:', healthError);
            }

            // Log more detailed information about cookies
            console.warn('CSRF token not found in cookies after all attempts');
            console.log('Available cookies:', document.cookie);

            // Check if SameSite cookie issues might be the problem
            console.log('This might be a SameSite cookie issue. Check your session.php configuration.');
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
