import React, { useState, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import EmailVerification from '@/Components/EmailVerification';
import ForgotPassword from '@/Components/ForgotPassword';
import apiClient from '@/utils/apiClient';
export default function Login({ status }) {
    
    const emailVerified = localStorage.getItem('email_verified') === 'true';
    const verifiedEmail = localStorage.getItem('verified_email') || '';
    const { data, setData, post, processing, errors, setError } = useForm({
        login: verifiedEmail || '',
        password: '',
        remember: false,
    });
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [apiError, setApiError] = useState('');
    const [verificationSuccess, setVerificationSuccess] = useState(emailVerified);
    
    useEffect(() => {
        if (emailVerified) {
            localStorage.removeItem('email_verified');
            localStorage.removeItem('verified_email');
            
            const timer = setTimeout(() => {
                setVerificationSuccess(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [emailVerified]);
    const submit = async (e) => {
        e.preventDefault();
        setApiError('');
        try {
            
            const response = await axios.post('/login-api', {
                login: data.login,
                password: data.password
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = route('login');
            
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (csrfToken) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = '_token';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);
            }
            
            const emailInput = document.createElement('input');
            emailInput.type = 'hidden';
            emailInput.name = 'email';
            emailInput.value = data.login;
            form.appendChild(emailInput);
            
            const passwordInput = document.createElement('input');
            passwordInput.type = 'hidden';
            passwordInput.name = 'password';
            passwordInput.value = data.password;
            form.appendChild(passwordInput);
            
            if (data.remember) {
                const rememberInput = document.createElement('input');
                rememberInput.type = 'hidden';
                rememberInput.name = 'remember';
                rememberInput.value = '1';
                form.appendChild(rememberInput);
            }
            
            document.body.appendChild(form);
            form.submit();
        } catch (error) {
            
            if (error.response?.status === 403 && error.response?.data?.verification_needed) {
                setShowEmailVerification(true);
            } else {
                
                const errorMessage = error.response?.data?.message || 'Invalid credentials';
                setApiError(errorMessage);
            }
        }
    };
    return (
        <>
            <Head title="Log in" />
            <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
                {showEmailVerification ? (
                    <div className="w-full sm:max-w-md mt-6">
                        <EmailVerification
                            email={data.login}
                            onClose={() => setShowEmailVerification(false)}
                        />
                    </div>
                ) : showForgotPassword ? (
                    <div className="w-full sm:max-w-md mt-6">
                        <ForgotPassword
                            onClose={() => setShowForgotPassword(false)}
                            onSwitchToLogin={() => setShowForgotPassword(false)}
                        />
                    </div>
                ) : (
                    <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
                        <h2 className="text-2xl font-bold text-center mb-6">Log in</h2>
                        {status && (
                            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                                {status}
                            </div>
                        )}
                        {verificationSuccess && (
                            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                                Your email has been verified successfully! You can now log in.
                            </div>
                        )}
                        {apiError && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                                {apiError}
                            </div>
                        )}
                        <form onSubmit={submit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="login">
                                    Email or Username
                                </label>
                                <input
                                    id="login"
                                    type="text"
                                    name="login"
                                    value={data.login}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    onChange={(e) => setData('login', e.target.value)}
                                    required
                                />
                                {errors.login && <div className="text-red-500 text-xs mt-1">{errors.login}</div>}
                            </div>
                            <div className="mb-6">
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
                                />
                                {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                                </label>
                                <a
                                    href="/recover-password"
                                    className="text-sm text-blue-500 hover:text-blue-700"
                                >
                                    Forgot password?
                                </a>
                            </div>
                            <div className="flex flex-col space-y-4">
                                <button
                                    type="submit"
                                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    disabled={processing}
                                >
                                    Log in
                                </button>
                                <div className="text-center space-y-2">
                                    <Link
                                        href={route('register')}
                                        className="text-sm text-gray-600 hover:text-gray-900"
                                    >
                                        Don't have an account? Register
                                    </Link>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => window.location.href = '/recover-password'}
                                            className="text-sm text-blue-500 hover:text-blue-700 mt-2"
                                        >
                                            Forgot your password? Use standalone recovery
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}
