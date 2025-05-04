import axios from 'axios';

window.axios = axios;

window.axios.defaults.withCredentials = true; // Ensure cookies are sent
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';
window.axios.defaults.baseURL = 'http://localhost:8000';

// Initialize CSRF protection
axios.get('/sanctum/csrf-cookie')
    .then(() => {
        console.log('CSRF cookie set');
    })
    .catch(error => {
        console.error('Error setting CSRF cookie:', error);
    });
