import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';
export default function VerifyEmailPage({ status = 'verifying', message = '', email, token, user }) {
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    useEffect(() => {
        
        if (status === 'success' && message === 'Email verified successfully') {
            
            localStorage.setItem('email_verified', 'true');
            localStorage.setItem('verified_email', email);
            
            if (token && user) {
                localStorage.setItem('token', token);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            
            setTimeout(() => {
                window.location.href = '/map'; 
            }, 3000); 
        }
    }, [status, message, email, token, user]);
    const resendVerificationEmail = async () => {
        if (!email) return;
        setIsResending(true);
        setResendMessage('');
        try {
            const response = await apiClient.post('/email/verification-notification', { email });
            setResendMessage(response.data.message || 'Verification link sent successfully!');
        } catch (error) {
            setResendMessage('Failed to send verification email. Please try again.');
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
                                Your email has been verified and you have been automatically logged in. You will be redirected to the map page in a few seconds.
                            </p>
                            <div className="flex flex-col space-y-4">
                                <Link
                                    href={route('map')}
                                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                                >
                                    Go to Map
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
