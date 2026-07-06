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
            const response = await axios.post('/api/forgot-password', { 
                email 
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.status === 200) {
                setMessage('Password reset link has been sent to your email address.');
                setEmail('');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            setError(
                error.response?.data?.message || 
                'Failed to send reset link.'
            );
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
                </div>
                <div className="flex justify-end space-x-3">
                    {onSwitchToLogin && (
                        <button
                            type="button"
                            onClick={onSwitchToLogin}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Back to Login
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </div>
            </form>
        </div>
    );
}
