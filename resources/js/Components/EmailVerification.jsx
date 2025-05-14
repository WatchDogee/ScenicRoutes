import React, { useState } from 'react';
import apiClient from '../utils/apiClient';
export default function EmailVerification({ email, onClose }) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const resendVerificationEmail = async () => {
        setIsLoading(true);
        setMessage('');
        setError('');
        try {
            const response = await apiClient.post('/email/verification-notification', { email });
            setMessage(response.data.message || 'Verification link sent successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Email Verification Required</h2>
            <p className="mb-4 text-gray-700">
                Your email address needs to be verified before you can access your account. 
                Please check your email for a verification link.
            </p>
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
            <div className="flex flex-col space-y-3">
                <button
                    onClick={resendVerificationEmail}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
                <button
                    onClick={onClose}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
