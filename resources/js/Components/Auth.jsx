import React, { useState, useEffect } from 'react';
import apiClient, { setAuthToken } from '../utils/apiClient';
export default function Auth({ onAuthSuccess }) {
    const [formType, setFormType] = useState('login');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    setAuthToken(token);
                    const response = await apiClient.get('/user');
                    onAuthSuccess(response.data);
                } catch (error) {
                    localStorage.removeItem('token');
                    setAuthToken(null);
                }
            }
            setIsLoading(false);
        };
        initializeAuth();
    }, []);
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = formType === 'login' ? '/login' : '/register';
            const response = await apiClient.post(endpoint, formData);
            if (formType === 'login') {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                setAuthToken(token);
                
                const userResponse = await apiClient.get('/user');
                onAuthSuccess(userResponse.data);
            } else {
                alert('Registration successful! You can now log in.');
                setFormType('login');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An error occurred.';
            alert(errorMessage);
        }
    };
    if (isLoading) {
        return <div>Loading...</div>;
    }
    return (
        <div>
            <h1>{formType === 'login' ? 'Login' : 'Sign Up'}</h1>
            <form onSubmit={handleSubmit}>
                {formType === 'signup' && (
                    <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                    />
                )}
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                />
                <button type="submit">{formType === 'login' ? 'Login' : 'Sign Up'}</button>
            </form>
            <button onClick={() => setFormType(formType === 'login' ? 'signup' : 'login')}>
                Switch to {formType === 'login' ? 'Sign Up' : 'Login'}
            </button>
        </div>
    );
}