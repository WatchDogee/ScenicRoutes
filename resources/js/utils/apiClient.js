import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true,
});

// Initialize auth token from localStorage if it exists
const token = localStorage.getItem('token');
if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Intercept responses to handle 401 (Unauthorized)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token and auth state on unauthorized
            localStorage.removeItem('token');
            delete apiClient.defaults.headers.common['Authorization'];
            
            // Optionally redirect to login or trigger a global auth state update
            window.dispatchEvent(new CustomEvent('auth:failed'));
        }
        return Promise.reject(error);
    }
);

export const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('token', token);
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
    }
};

export default apiClient;