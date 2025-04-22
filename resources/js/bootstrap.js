import axios from 'axios';

window.axios = axios;

window.axios.defaults.withCredentials = true; // Ensure cookies are sent
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
