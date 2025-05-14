import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import DirectForgotPassword from '@/Components/DirectForgotPassword';
import axios from 'axios';
export default function ForgotPasswordPage() {
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
                }
            })
            .catch(() => {
                
                localStorage.removeItem('token');
                setIsLoggedIn(false);
            });
        }
    }, []);
    return (
        <>
            <Head title="Forgot Password" />
            <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
                <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
                    <DirectForgotPassword
                        onSwitchToLogin={() => window.location.href = route('login')}
                    />
                    <div className="mt-4 text-center">
                        {isLoggedIn ? (
                            <Link
                                href="/map"
                                className="text-sm text-gray-600 hover:text-gray-900"
                            >
                                Back to Map
                            </Link>
                        ) : (
                            <Link
                                href={route('login')}
                                className="text-sm text-gray-600 hover:text-gray-900"
                            >
                                Back to Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
