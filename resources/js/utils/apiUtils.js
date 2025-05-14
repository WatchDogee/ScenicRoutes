import axios from 'axios';
$1
const apiClient = axios.create({
    baseURL: '/',
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
$1
export const fetchSavedRoads = async () => {
    try {
        const response = await apiClient.get('/api/saved-roads');
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const fetchRoadById = async (id) => {
    try {
        const response = await apiClient.get(`/api/saved-roads/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const saveRoad = async (roadData) => {
    try {
        const response = await apiClient.post('/api/saved-roads', roadData);
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const updateRoad = async (id, roadData) => {
    try {
        const response = await apiClient.put(`/api/saved-roads/${id}`, roadData);
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const deleteRoad = async (id) => {
    try {
        const response = await apiClient.delete(`/api/saved-roads/${id}`);
        return response.data;
    } catch (error) {
        let errorMessage = 'Failed to delete road. Please try again.';
        if (error.response) {
            if (error.response.status === 404) {
                errorMessage = 'Road not found or you don\'t have permission to delete it.';
            } else if (error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
        }
        const enhancedError = new Error(errorMessage);
        enhancedError.originalError = error;
        throw enhancedError;
    }
};
$1
export const toggleRoadPublic = async (id) => {
    try {
        const response = await apiClient.post(`/api/saved-roads/${id}/toggle-public`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const addReview = async (roadId, rating, comment) => {
    try {
        const response = await apiClient.post(`/api/saved-roads/${roadId}/review`, {
            rating,
            comment
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const addComment = async (roadId, comment) => {
    try {
        const response = await apiClient.post(`/api/saved-roads/${roadId}/comment`, {
            comment
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const fetchPublicRoads = async (params = {}) => {
    try {
        const response = await apiClient.get('/api/public-roads', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};
$1
export const updateProfilePicture = async (file) => {
    try {
        const formData = new FormData();
        formData.append('profile_picture', file);
        const response = await apiClient.post('/api/profile/picture', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
export default apiClient;
