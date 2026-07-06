import React, { useState, useEffect } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';
import EmailVerification from '@/Components/EmailVerification';
export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        username: '',
        password: '',
        password_confirmation: '',
    });
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [apiError, setApiError] = useState('');
    // IMPORTANT: Only use one registration endpoint (API or web) to avoid double verification emails.
    // Clear any existing token before registration to prevent 403 errors.
    useEffect(() => {
        localStorage.removeItem('token');
    }, []);
    const submit = async (e) => {
        e.preventDefault();
        setApiError('');
        try {
            // First try the API registration to get the verification email sent
            const response = await apiClient.post('/register', {
                name: data.name,
                email: data.email,
                username: data.username,
                password: data.password,
                password_confirmation: data.password_confirmation
            });
            // If successful, show verification message
            setRegistrationComplete(true);
        } catch (error) {
            // Handle registration errors
            const errorData = error.response?.data;
            if (errorData?.errors) {
                // If there are field-specific errors, show the first one
                const firstError = Object.values(errorData.errors)[0];
                setApiError(Array.isArray(firstError) ? firstError[0] : firstError);
            } else {
                setApiError(errorData?.message || 'Registration failed. Please try again.');
            }
        }
    };
    return (
        <>
            <Head title="Register" />
            <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100 relative">
                {/* Close button - always visible */}
                <button
                    onClick={() => router.visit(route('map'))}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close and return to map"
                    title="Back to Map"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                {registrationComplete ? (
                    <div className="w-full sm:max-w-md mt-6 px-6 py-8 bg-white shadow-md overflow-hidden sm:rounded-lg text-center">
                        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h2 className="text-2xl font-bold mb-4">Registration Successful!</h2>
                        <p className="mb-6 text-gray-600">
                            Thank you for registering! We've sent a verification link to your email address.
                            Please check your inbox and click the link to verify your account.
                        </p>
                        <div className="mb-6">
                            <EmailVerification
                                email={data.email}
                                onClose={() => {}}
                            />
                        </div>
                        <div className="flex flex-col space-y-3">
                            <Link
                                href={route('map')}
                                className="inline-block bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors"
                            >
                                Back to Map
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg relative">
                        <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
                        {apiError && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                                {apiError}
                            </div>
                        )}
                        <form onSubmit={submit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    name="username"
                                    value={data.username}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    onChange={(e) => setData('username', e.target.value)}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Other users will find and follow you by this username</p>
                                {errors.username && <div className="text-red-500 text-xs mt-1">{errors.username}</div>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                                    Display Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    value={data.name}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">Your full name or preferred display name (optional)</p>
                                {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    minLength="8"
                                />
                                {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                                <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password_confirmation">
                                    Confirm Password
                                </label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-4">
                                <button
                                    type="submit"
                                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    disabled={processing}
                                >
                                    Register
                                </button>
                                <div className="text-center space-y-2">
                                    <Link
                                        href={route('map')}
                                        className="block text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        ← Back to Map
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}
