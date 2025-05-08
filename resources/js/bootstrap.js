import axios from 'axios';

window.axios = axios;

window.axios.defaults.withCredentials = true; // Ensure cookies are sent
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';

// Always use the current origin as the base URL
const getBaseUrl = () => {
    return window.location.origin;
};

window.axios.defaults.baseURL = getBaseUrl();

// Add interceptor to include CSRF token in all requests
axios.interceptors.request.use(config => {
    // Get CSRF token from cookie
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN'))
        ?.split('=')[1];

    if (token) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
    }

    return config;
});

// Initialize CSRF protection
axios.get('/sanctum/csrf-cookie')
    .then(() => {
        console.log('CSRF cookie set');

        // Get CSRF token from cookie after it's set
        const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('XSRF-TOKEN'))
            ?.split('=')[1];

        if (token) {
            // Set the token in axios defaults
            axios.defaults.headers.common['X-XSRF-TOKEN'] = decodeURIComponent(token);
            console.log('CSRF token set in axios defaults');
        } else {
            console.warn('CSRF token not found in cookies after /sanctum/csrf-cookie request');
        }
    })
    .catch(error => {
        console.error('Error setting CSRF cookie:', error);
    });
