import axios from 'axios';

window.axios = axios;

window.axios.defaults.withCredentials = true; // Ensure cookies are sent
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';

// Dynamically determine the base URL
const getBaseUrl = () => {
    // In production, use the current origin
    if (window.location.hostname !== 'localhost') {
        return window.location.origin;
    }
    // In development, use localhost:8000
    return 'http://localhost:8000';
};

window.axios.defaults.baseURL = getBaseUrl();

// Initialize CSRF protection
axios.get('/sanctum/csrf-cookie')
    .then(() => {
        console.log('CSRF cookie set');
    })
    .catch(error => {
        console.error('Error setting CSRF cookie:', error);
    });
