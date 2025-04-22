import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api', // Adjust to match your Laravel API URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Function to set the authorization token for subsequent requests
export const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.Authorization = `Bearer ${token}`;
        localStorage.setItem('token', token); // Store token for persistence
    } else {
        delete apiClient.defaults.headers.Authorization;
        localStorage.removeItem('token');
    }
};

export default apiClient;