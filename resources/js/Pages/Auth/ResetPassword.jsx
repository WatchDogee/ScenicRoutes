import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ResetPassword({ token, email, status }) {
    const [formData, setFormData] = useState({
        token: token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Check if the password was reset successfully
    useEffect(() => {
        if (status === 'passwords.reset') {
            // Redirect to map page after successful password reset
            window.location.href = '/map';
        }
    }, [status]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await axios.post('/api/reset-password', formData);
            setMessage('Password reset successful! Redirecting to map...');
            // Redirect to map page after successful password reset
            setTimeout(() => {
                window.location.href = '/map';
            }, 2000);
        } catch (error) {
            console.error('Password reset error:', error);
            setError(
                error.response?.data?.message ||
                error.message ||
                'Failed to reset password. Please try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />
            {message && (
                <div className="mb-4 font-medium text-sm text-green-600">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 font-medium text-sm text-red-600">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={handleChange}
                    />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={formData.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        isFocused={true}
                        onChange={handleChange}
                    />
                </div>
                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />
                    <TextInput
                        type="password"
                        id="password_confirmation"
                        name="password_confirmation"
                        value={formData.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={handleChange}
                    />
                </div>
                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton className="ms-4" disabled={isLoading}>
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
