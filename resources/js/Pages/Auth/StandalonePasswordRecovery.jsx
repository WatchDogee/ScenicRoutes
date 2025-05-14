import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
export default function StandalonePasswordRecovery() {
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
            
            const formData = new FormData();
            formData.append('email', email);
            
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            if (response.ok) {
                const data = await response.json();
                setMessage(data.message || 'Password reset link sent to your email!');
                setEmail(''); 
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to send reset link');
            }
        } catch (error) {
            setError(
                error.message ||
                'Failed to send reset link. Please try again or contact support.'
            );
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <>
            <Head title="Reset Your Password - ScenicRoutes" />
            <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
                <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Reset Your Password</h2>
                    {isLoggedIn ? (
                        <p className="mb-4 text-gray-700">
                            You are currently logged in as <strong>{email}</strong>. We'll send a password reset link to this email address.
                        </p>
                    ) : (
                        <p className="mb-4 text-gray-700">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    )}
                    {message ? (
                        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg border border-green-300 text-center">
                            <div className="flex items-center justify-center mb-2">
                                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span className="font-semibold">Success!</span>
                            </div>
                            <p>{message}</p>
                            <p className="mt-2 text-sm">Check your inbox for the password reset link.</p>
                            <div className="mt-4">
                                <a
                                    href="/map"
                                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors text-center block"
                                >
                                    Back to Map
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
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
                                        {isLoading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending...
                                            </span>
                                        ) : 'Send Reset Link'}
                                    </button>
                                    <a
                                        href="/map"
                                        className="text-center bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
                                    >
                                        Back to Map
                                    </a>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
