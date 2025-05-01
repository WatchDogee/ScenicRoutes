import { useState, useEffect } from 'react';
import axios from 'axios';

export default function useAuth() {
    const [auth, setAuth] = useState({ user: null, token: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Initialize auth state from localStorage
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Set axios default authorization header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Fetch user data to verify token and restore session
            axios.get('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => {
                setAuth({ user: response.data, token });
                setLoading(false);
            })
            .catch(() => {
                // If token is invalid, clear it
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['Authorization'];
                setAuth({ user: null, token: null });
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []); // Run only once on component mount
    
    // Login function
    const login = async (email, password) => {
        setError(null);
        try {
            const response = await axios.post('/api/login', { email, password }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                withCredentials: true
            });
            
            if (response.data && response.data.user && response.data.token) {
                const { user, token } = response.data;
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setAuth({ user, token });
                return { success: true };
            }
            
            return { success: false, message: 'Invalid response from server' };
        } catch (error) {
            console.error("Login error:", error.response?.data || error.message);
            
            // Check if this is an email verification error
            if (error.response?.data?.verification_needed) {
                return { 
                    success: false, 
                    verification_needed: true, 
                    email,
                    message: `Please verify your email address before logging in. We've sent a verification link to ${email}.`
                };
            }
            
            setError(error.response?.data?.message || "Failed to log in.");
            return { success: false, message: error.response?.data?.message || "Failed to log in." };
        }
    };
    
    // Register function
    const register = async (name, email, password, password_confirmation) => {
        setError(null);
        try {
            const response = await axios.post('/api/register', 
                { name, email, password, password_confirmation }, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    withCredentials: true
                }
            );
            
            return { success: true, message: "Registration successful! Please check your email to verify your account before logging in." };
        } catch (error) {
            console.error("Registration error:", error.response?.data || error.message);
            
            if (error.response?.data?.errors) {
                const errorMessages = Object.values(error.response.data.errors).flat().join('\n');
                setError(errorMessages);
                return { success: false, message: errorMessages };
            }
            
            setError(error.response?.data?.message || "Failed to register.");
            return { success: false, message: error.response?.data?.message || "Failed to register." };
        }
    };
    
    // Logout function
    const logout = async () => {
        try {
            await axios.post('/api/logout', {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setAuth({ user: null, token: null });
            
            return { success: true, message: "Logged out successfully!" };
        } catch (error) {
            console.error("Logout error:", error);
            
            // Still clear local state even if the server request fails
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setAuth({ user: null, token: null });
            
            return { success: true, message: "Logged out successfully!" };
        }
    };
    
    // Resend verification email
    const resendVerificationEmail = async (email) => {
        try {
            await axios.post('/api/email/verification-notification', { email }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            return { 
                success: true, 
                message: "Verification email has been resent. Please check your inbox.\n\nIf you're having trouble with the verification link, please check your spam folder or contact support." 
            };
        } catch (error) {
            console.error("Error resending verification email:", error);
            return { 
                success: false, 
                message: "Failed to resend verification email. Please try again later." 
            };
        }
    };
    
    return {
        auth,
        setAuth,
        loading,
        error,
        login,
        register,
        logout,
        resendVerificationEmail
    };
}
