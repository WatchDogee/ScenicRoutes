import React, { useState, useEffect } from 'react';
import axios from 'axios';
export default function DirectForgotPassword({ onClose, onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            
            axios.get('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => {
                if (response.data) {
                    setIsLoggedIn(true);
                    setEmail(response.data.email || '');
                }
            })
            .catch(() => {
                
                localStorage.removeItem('token');
                setIsLoggedIn(false);
            });
        }
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');
        try {
            
            const response = await axios.post('/api/forgot-password', { email });
            if (response.status === 200) {
                setMessage(response.data.message || 'Password reset link sent to your email!');
                setEmail(''); 
            } else {
                throw new Error('Request failed');
            }
        } catch (error) {
            setError(error.response?.data?.message || error.message || 'Failed to send reset link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
            {isLoggedIn ? (
                <p className="mb-4 text-gray-700">
                    You are currently logged in as <strong>{email}</strong>. We'll send a password reset link to this email address.
                </p>
            ) : (
                <p className="mb-4 text-gray-700">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
            )}
            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        readOnly={isLoggedIn}
                    />
                    {isLoggedIn && (
                        <p className="text-xs text-gray-500 mt-1">
                            To use a different email, please log out first.
                        </p>
                    )}
                </div>
                <div className="flex flex-col space-y-3">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    {isLoggedIn ? (
                        <a
                            href="/map"
                            className="text-center bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
                        >
                            Back to Map
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={onSwitchToLogin}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                            Back to Login
                        </button>
                    )}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
