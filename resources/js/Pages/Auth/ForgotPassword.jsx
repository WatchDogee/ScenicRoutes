import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    
    useEffect(() => {
        
        fetch('/api/user')
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Not authenticated');
            })
            .then(userData => {
                if (userData) {
                    setIsLoggedIn(true);
                    setUserEmail(userData.email || '');
                    setData('email', userData.email || '');
                }
            })
            .catch(() => {
                setIsLoggedIn(false);
            });
    }, []);
    const submit = async (e) => {
        e.preventDefault();
        
        if (window.refreshCSRFToken) {
            await window.refreshCSRFToken();
        }
        post(route('password.email')); 
    };
    return (
        <GuestLayout>
            <Head title="Forgot Password" />
            <div className="mb-4 text-sm text-gray-600">
                {isLoggedIn ? (
                    <>
                        You are currently logged in as <strong>{userEmail}</strong>.
                        You can still request a password reset link for this account.
                    </>
                ) : (
                    <>
                        Forgot your password? No problem. Just let us know your email
                        address and we will email you a password reset link that will
                        allow you to choose a new one.
                    </>
                )}
            </div>
            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
            <form onSubmit={submit}>
                <TextInput
                    id="email"
                    type="email"
                    name="email"
                    value={data.email}
                    className="mt-1 block w-full"
                    isFocused={!isLoggedIn}
                    onChange={(e) => setData('email', e.target.value)}
                    readOnly={isLoggedIn}
                />
                {isLoggedIn && (
                    <p className="mt-1 text-xs text-gray-500">
                        To use a different email, please log out first.
                    </p>
                )}
                <InputError message={errors.email} className="mt-2" />
                <div className="mt-4 flex items-center justify-end">
                    {isLoggedIn && (
                        <Link
                            href={route('map')}
                            className="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Back to Map
                        </Link>
                    )}
                    <PrimaryButton className="ms-4" disabled={processing}>
                        Email Password Reset Link
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
