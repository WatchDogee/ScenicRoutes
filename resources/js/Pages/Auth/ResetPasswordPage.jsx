import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ResetPassword from '@/Components/ResetPassword';
export default function ResetPasswordPage({ token, email }) {
    const [resetComplete, setResetComplete] = useState(false);
    const handleResetSuccess = () => {
        setResetComplete(true);
    };
    return (
        <>
            <Head title="Reset Password" />
            <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
                <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
                    {resetComplete ? (
                        <div className="text-center py-8">
                            <h2 className="text-2xl font-bold text-green-600 mb-4">Password Reset Complete!</h2>
                            <p className="mb-6 text-gray-600">
                                Your password has been reset successfully. You have been automatically logged in.
                            </p>
                            <div className="flex flex-col space-y-3">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                                <div className="text-center text-blue-500">
                                    Redirecting to map page...
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ResetPassword
                            token={token}
                            email={email}
                            onSuccess={handleResetSuccess}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
