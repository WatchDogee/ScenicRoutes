import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { setAuthToken } from '../utils/apiClient';

export default function Login({ onAuthSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setAuthToken(token);
            apiClient.get('/user') // Fetch user data to verify token
                .then((response) => onAuthSuccess(response.data))
                .catch(() => localStorage.removeItem('token')); // Clear invalid token
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.post('/login', { email, password });
            const { token, user } = response.data;

            localStorage.setItem('token', token); // Save token
            setAuthToken(token);
            onAuthSuccess(user);
            navigate('/map'); // Redirect to the map page after login
        } catch (error) {
            console.error('Login error:', error.response?.data || error.message);
            alert('Failed to log in');
        }
    };

    return (
        <div>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Login</button>
            </form>
        </div>
    );
}