import axios from 'axios';

const getApiBaseUrl = () => {
    
    const origin = window.location.origin;
    return `${origin}/api`;
};


const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    withCredentials: true, 
});

const token = localStorage.getItem('token');
if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

apiClient.interceptors.request.use(
    async (config) => {
        
        let token = null;
        
        if (document.cookie) {
            const tokenCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('XSRF-TOKEN'));
            if (tokenCookie) {
                token = tokenCookie.split('=')[1];
            } else {
            }
        } else {
        }
        if (!token) {
            
            try {
                
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
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (document.cookie) {
                    const newTokenCookie = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('XSRF-TOKEN'));
                    if (newTokenCookie) {
                        token = newTokenCookie.split('=')[1];
                    } else {
                    }
                }
            } catch (error) {
            }
        }
        if (token) {
            config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
        }
        
        const authToken = localStorage.getItem('token');
        if (authToken) {
            config.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        
        
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        } else {
            config.headers['Content-Type'] = 'application/json';
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if ((error.response?.status === 419 || error.response?.status === 401) && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                
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
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                let newToken = null;
                if (document.cookie) {
                    const tokenCookie = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('XSRF-TOKEN'));
                    if (tokenCookie) {
                        newToken = tokenCookie.split('=')[1];
                        
                        originalRequest.headers['X-XSRF-TOKEN'] = decodeURIComponent(newToken);
                    }
                }
                
                const authToken = localStorage.getItem('token');
                if (!authToken) {
                    
                    
                    return Promise.reject(error);
                }
                
                originalRequest.headers['Authorization'] = `Bearer ${authToken}`;
                
                return apiClient(originalRequest);
            } catch (refreshError) {
                
                
                
                
                return Promise.reject(refreshError);
            }
        }
        
        if (error.response?.status === 422) {
            const validationErrors = error.response.data.errors || {};
            const message = error.response.data.message || 'Validation failed';
            return Promise.reject({
                ...error,
                validationErrors,
                message
            });
        }
        return Promise.reject(error);
    }
);
export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('token', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        localStorage.removeItem('token');
        delete apiClient.defaults.headers.common['Authorization'];
    }
};

export const checkAuthState = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }
        const response = await apiClient.get('/user');
        return !!response.data;
    } catch (error) {
        return false;
    }
};
export default apiClient;