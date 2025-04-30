import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';

export default function VerifyEmailPage({ id, hash, email }) {
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                // Add a query parameter to ensure we're using a fresh request
                const response = await apiClient.get(`/email/verify/${id}/${hash}?_=${new Date().getTime()}`);
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');

                // If verification was successful, update the UI immediately
                if (response.data.message === 'Email verified successfully') {
                    console.log('Email verified successfully!');

                    // Store verification status in localStorage
                    localStorage.setItem('email_verified', 'true');
                    localStorage.setItem('verified_email', email);

                    // Wait a moment to show the success message, then redirect to the login page
                    setTimeout(() => {
                        window.location.href = '/'; // Redirect to home page instead
                    }, 3000); // 3 seconds delay
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Failed to verify email. The link may be invalid or expired.');
                console.error('Email verification error:', error);
            }
        };

        if (id && hash) {
            verifyEmail();
        } else {
            setStatus('error');
            setMessage('Invalid verification link.');
        }
    }, [id, hash, email]);

    const resendVerificationEmail = async () => {
        if (!email) return;

        setIsResending(true);
        setResendMessage('');

        try {
            const response = await apiClient.post('/email/verification-notification', { email });
            setResendMessage(response.data.message || 'Verification link sent successfully!');
        } catch (error) {
            setResendMessage('Failed to send verification email. Please try again.');
            console.error('Error resending verification email:', error);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <>
            <Head title="Email Verification" />

            <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
                <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
                    <h2 className="text-2xl font-bold text-center mb-6">Email Verification</h2>

                    {status === 'verifying' && (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Verifying your email address...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center py-4">
                            <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6">
                                {message}
                            </div>
                            <p className="mb-6 text-gray-600">
                                Your email has been verified. You will be redirected to the home page in a few seconds.
                            </p>
                            <div className="flex flex-col space-y-4">
                                <Link
                                    href={route('login')}
                                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                                >
                                    Go to Login
                                </Link>
                                <Link
                                    href="/"
                                    className="inline-block text-blue-500 hover:text-blue-700"
                                >
                                    Go to Home Page
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center py-4">
                            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                                {message}
                            </div>

                            {email && (
                                <div className="mb-6">
                                    <p className="mb-4 text-gray-600">
                                        If your verification link has expired, you can request a new one:
                                    </p>

                                    <button
                                        onClick={resendVerificationEmail}
                                        disabled={isResending}
                                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
                                    >
                                        {isResending ? 'Sending...' : 'Resend Verification Email'}
                                    </button>

                                    {resendMessage && (
                                        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
                                            {resendMessage}
                                        </div>
                                    )}
                                </div>
                            )}

                            <Link
                                href={route('login')}
                                className="inline-block text-blue-500 hover:text-blue-700"
                            >
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
