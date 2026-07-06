import React from 'react';
import { Link } from '@inertiajs/react';
import DeleteAccountPanel from '../Components/DeleteAccountPanel';

export default function AccountDeletionRequest({ auth }) {
    const isAuthenticated = !!auth?.user;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-xl bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">Account Deletion</h1>
                <p className="text-sm text-gray-600 mb-6">
                    You can request account deletion here. Deletion is scheduled and will permanently remove your data after the grace period.
                </p>

                {isAuthenticated ? (
                    <DeleteAccountPanel onDeleted={() => window.location.href = '/'} />
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-700">
                            Please sign in to schedule account deletion.
                        </p>
                        <Link
                            href="/map"
                            className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        >
                            Go to Sign In
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
