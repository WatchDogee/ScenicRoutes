import React, { useState } from 'react';
import axios from 'axios';
export default function ResetPassword({ token, email, onSuccess, onClose }) {
    const [formData, setFormData] = useState({
        token,
        email: email || '',
        password: '',
        password_confirmation: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');
        try {
            
            const resetFormData = new FormData();
            resetFormData.append('token', formData.token);
            resetFormData.append('email', formData.email);
            resetFormData.append('password', formData.password);
            resetFormData.append('password_confirmation', formData.password_confirmation);
            
            const response = await fetch('/reset-password', {
                method: 'POST',
                body: resetFormData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            if (response.ok) {
                setMessage('Password has been reset successfully!');
                
                setFormData(prev => ({
                    ...prev,
                    password: '',
                    password_confirmation: ''
                }));
                
                setTimeout(() => {
                    window.location.href = '/map';
                }, 1500);
            } else {
                
                try {
                    const apiResponse = await fetch('/api/reset-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify(formData),
                        credentials: 'same-origin'
                    });
                    if (apiResponse.ok) {
                        const data = await apiResponse.json();
                        setMessage(data.message || 'Password has been reset successfully!');
                        
                        if (data.token) {
                            localStorage.setItem('token', data.token);
                            
                            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                            
                            if (data.user) {
                                localStorage.setItem('user', JSON.stringify(data.user));
                            }
                        }
                        
                        setFormData(prev => ({
                            ...prev,
                            password: '',
                            password_confirmation: ''
                        }));
                        
                        setTimeout(() => {
                            window.location.href = '/map';
                        }, 1500);
                    } else {
                        throw new Error('API request failed');
                    }
                } catch (apiError) {
                    throw apiError;
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Reset Your Password</h2>
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
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        readOnly={!!email}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength="8"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Password must be at least 8 characters long
                    </p>
                </div>
                <div>
                    <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                    </label>
                    <input
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        value={formData.password_confirmation}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div className="flex flex-col space-y-3">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
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
