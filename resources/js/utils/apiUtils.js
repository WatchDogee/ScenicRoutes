import axios from 'axios';

/**
 * API client with authentication handling
 */
const apiClient = axios.create({
    baseURL: '/',
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true
});

// Add a request interceptor to include the auth token
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

// Add a response interceptor to handle auth errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear token and redirect to login if unauthorized
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Fetch saved roads for the authenticated user
 * @returns {Promise} - Promise with saved roads data
 */
export const fetchSavedRoads = async () => {
    try {
        const response = await apiClient.get('/api/saved-roads');
        return response.data;
    } catch (error) {
        console.error('Error fetching saved roads:', error);
        throw error;
    }
};

/**
 * Fetch a specific saved road by ID
 * @param {number} id - Road ID
 * @returns {Promise} - Promise with road data
 */
export const fetchRoadById = async (id) => {
    try {
        const response = await apiClient.get(`/api/saved-roads/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching road details:', error);
        throw error;
    }
};

/**
 * Save a new road
 * @param {Object} roadData - Road data to save
 * @returns {Promise} - Promise with saved road data
 */
export const saveRoad = async (roadData) => {
    try {
        const response = await apiClient.post('/api/saved-roads', roadData);
        return response.data;
    } catch (error) {
        console.error('Error saving road:', error);
        throw error;
    }
};

/**
 * Update an existing road
 * @param {number} id - Road ID
 * @param {Object} roadData - Updated road data
 * @returns {Promise} - Promise with updated road data
 */
export const updateRoad = async (id, roadData) => {
    try {
        const response = await apiClient.put(`/api/saved-roads/${id}`, roadData);
        return response.data;
    } catch (error) {
        console.error('Error updating road:', error);
        throw error;
    }
};

/**
 * Delete a road
 * @param {number} id - Road ID
 * @returns {Promise} - Promise with deletion result
 */
export const deleteRoad = async (id) => {
    try {
        const response = await apiClient.delete(`/api/saved-roads/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting road:', error);
        throw error;
    }
};

/**
 * Toggle a road's public status
 * @param {number} id - Road ID
 * @returns {Promise} - Promise with updated public status
 */
export const toggleRoadPublic = async (id) => {
    try {
        const response = await apiClient.post(`/api/saved-roads/${id}/toggle-public`);
        return response.data;
    } catch (error) {
        console.error('Error toggling road public status:', error);
        throw error;
    }
};

/**
 * Add or update a review for a road
 * @param {number} roadId - Road ID
 * @param {number} rating - Rating value (1-5)
 * @param {string} comment - Review comment
 * @returns {Promise} - Promise with review result
 */
export const addReview = async (roadId, rating, comment) => {
    try {
        const response = await apiClient.post(`/api/saved-roads/${roadId}/review`, {
            rating,
            comment
        });
        return response.data;
    } catch (error) {
        console.error('Error submitting review:', error);
        throw error;
    }
};

/**
 * Add a comment to a road
 * @param {number} roadId - Road ID
 * @param {string} comment - Comment text
 * @returns {Promise} - Promise with comment result
 */
export const addComment = async (roadId, comment) => {
    try {
        const response = await apiClient.post(`/api/saved-roads/${roadId}/comment`, {
            comment
        });
        return response.data;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

/**
 * Fetch public roads
 * @param {Object} params - Search parameters
 * @returns {Promise} - Promise with public roads data
 */
export const fetchPublicRoads = async (params = {}) => {
    try {
        const response = await apiClient.get('/api/public-roads', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching public roads:', error);
        throw error;
    }
};

/**
 * Update user profile picture
 * @param {File} file - Profile picture file
 * @returns {Promise} - Promise with update result
 */
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
        console.error('Error updating profile picture:', error);
        throw error;
    }
};

export default apiClient;
