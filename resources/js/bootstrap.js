import axios from 'axios';
window.axios = axios;


window.axios.defaults.withCredentials = window.location.origin.includes(window.location.hostname);
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';
window.axios.defaults.headers.common['Content-Type'] = 'application/json';

const getBaseUrl = () => {
    return window.location.origin;
};
window.axios.defaults.baseURL = getBaseUrl();


const getCSRFToken = () => {
    try {
        if (!document.cookie) {
            return null;
        }
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN') {
                const decodedValue = decodeURIComponent(value);
                return decodedValue;
            }
        }
        
        const hasLaravelSession = cookies.some(cookie => cookie.trim().startsWith('laravel_session='));
        return null;
    } catch (error) {
        return null;
    }
};

axios.interceptors.request.use(
    config => {
        const token = getCSRFToken();
        if (token) {
            config.headers['X-XSRF-TOKEN'] = token;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    response => response,
    async error => {
        
        if (error.response && error.response.status === 419) {
            
            await refreshCSRFToken();
            
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

const refreshCSRFToken = async () => {
    try {
        
        delete axios.defaults.headers.common['X-XSRF-TOKEN'];
        
        
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
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const token = getCSRFToken();
        if (token) {
            
            axios.defaults.headers.common['X-XSRF-TOKEN'] = token;
            return true;
        } else {
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            const retryToken = getCSRFToken();
            if (retryToken) {
                axios.defaults.headers.common['X-XSRF-TOKEN'] = retryToken;
                return true;
            }
            
            await fetch(window.location.origin, {
                method: 'GET',
                credentials: 'include'
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
            const lastChanceToken = getCSRFToken();
            if (lastChanceToken) {
                axios.defaults.headers.common['X-XSRF-TOKEN'] = lastChanceToken;
                return true;
            }
            
            try {
                await fetch(`${window.location.origin}/api/health`, {
                    method: 'GET',
                    credentials: 'include'
                });
                await new Promise(resolve => setTimeout(resolve, 1500));
                const apiHealthToken = getCSRFToken();
                if (apiHealthToken) {
                    axios.defaults.headers.common['X-XSRF-TOKEN'] = apiHealthToken;
                    return true;
                }
            } catch (healthError) {
                
            }
            return false;
        }
    } catch (error) {
        return false;
    }
};

(async function initializeCSRF() {
    await refreshCSRFToken();
})();

window.refreshCSRFToken = refreshCSRFToken;

window.addEventListener('unhandledrejection', event => {
    
});
