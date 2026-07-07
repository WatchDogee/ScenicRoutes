import React, { useState } from 'react';
import apiClient from '../utils/apiClient';

export default function DeleteAccountPanel({ onDeleted }) {
    const [confirmText, setConfirmText] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleDelete = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (confirmText.trim() !== 'DELETE') {
            setError('Type DELETE to confirm account deletion.');
            return;
        }
        if (!login.trim()) {
            setError('Enter your email or username to confirm deletion.');
            return;
        }

        setIsDeleting(true);
        try {
            const response = await apiClient.delete('/account', {
                data: { login: login.trim(), password: password || null },
            });
            const scheduledAt = response.data?.scheduled_at;
            const graceDays = response.data?.grace_days;
            const dateLabel = scheduledAt ? new Date(scheduledAt).toLocaleDateString() : 'the scheduled date';
            const graceLabel = graceDays ? ` (grace period: ${graceDays} days)` : '';
            setSuccess(`Account deletion scheduled. Your data will be permanently deleted on ${dateLabel}.${graceLabel}`);
            localStorage.removeItem('token');
            onDeleted?.();
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to schedule account deletion.';
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="text-lg font-semibold text-red-700 mb-2">Delete Account</h3>
            <p className="text-sm text-red-700 mb-4">
                This schedules account deletion. All data will be permanently deleted after the grace period.
            </p>
            <form onSubmit={handleDelete} className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Type DELETE to confirm</label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full rounded border border-red-300 p-2"
                        placeholder="DELETE"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Email or Username</label>
                    <input
                        type="text"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        className="w-full rounded border border-red-300 p-2"
                        placeholder="email@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded border border-red-300 p-2"
                        placeholder="Enter your password"
                    />
                </div>
                {error && <div className="text-sm text-red-700">{error}</div>}
                {success && <div className="text-sm text-green-700">{success}</div>}
                <button
                    type="submit"
                    disabled={isDeleting}
                    className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                >
                    {isDeleting ? 'Scheduling...' : 'Schedule Account Deletion'}
                </button>
            </form>
        </div>
    );
}
