import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';
import MapAuthenticatedLayout from '@/Layouts/MapAuthenticatedLayout';
import axios from 'axios';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        // Fetch user data when component mounts
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const response = await apiClient.get('/user');
                const userData = response.data;
                setUser(userData);
                setProfileForm(prev => ({
                    ...prev,
                    name: userData.name || '',
                    email: userData.email || ''
                }));
            } catch (error) {
                console.error('Error fetching user data:', error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        // Cleanup preview URL when component unmounts
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type and size
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
            const maxSize = 2 * 1024 * 1024; // 2MB

            if (!allowedTypes.includes(file.type)) {
                setMessage({
                    type: 'error',
                    text: 'Invalid file type. Please upload a JPEG, PNG, or GIF image.'
                });
                return;
            }

            if (file.size > maxSize) {
                setMessage({
                    type: 'error',
                    text: 'File is too large. Maximum size is 2MB.'
                });
                return;
            }

            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            setMessage({ type: '', text: '' });
        }
    };

    const handleProfilePictureUpload = async () => {
        if (!selectedImage) {
            setMessage({
                type: 'error',
                text: 'Please select an image to upload.'
            });
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('profile_picture', selectedImage);

            const response = await apiClient.post('/profile/picture', formData);
            
            setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
            setUser(prevUser => ({
                ...prevUser,
                profile_picture_url: response.data.profile_picture_url
            }));
            
            setSelectedImage(null);
            setImagePreview(null);
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            
            let errorMessage = 'Failed to update profile picture.';
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
                
            setMessage({ 
                type: 'error', 
                text: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await apiClient.post('/profile', profileForm);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setUser(response.data.user);
            
            // Clear password fields after successful update
            setProfileForm(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                new_password_confirmation: ''
            }));
        } catch (error) {
            console.error('Error updating profile:', error);
            let errorMessage = 'Failed to update profile.';
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            setMessage({ 
                type: 'error', 
                text: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <MapAuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Settings</h2>}
        >
            <Head title="Settings" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold mb-4">Profile Settings</h3>
                                <Link
                                    href={route('map')}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                    Back to Map
                                </Link>
                            </div>

                            {message.text && (
                                <div className={`p-4 mb-6 rounded ${
                                    message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Profile Picture Section */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
                                <div className="flex items-center space-x-6">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                                        {imagePreview ? (
                                            <img 
                                                src={imagePreview} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : user?.profile_picture_url ? (
                                            <img 
                                                src={user.profile_picture_url} 
                                                alt="Profile" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                <span className="text-gray-500">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="profile-picture-input"
                                        />
                                        <label
                                            htmlFor="profile-picture-input"
                                            className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition-colors"
                                        >
                                            Choose Image
                                        </label>
                                        {selectedImage && (
                                            <button
                                                onClick={handleProfilePictureUpload}
                                                disabled={loading}
                                                className="ml-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-green-300"
                                            >
                                                {loading ? 'Uploading...' : 'Upload'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Profile Form */}
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={profileForm.name}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={profileForm.email}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">Current Password</label>
                                    <input
                                        type="password"
                                        id="current_password"
                                        name="current_password"
                                        value={profileForm.current_password}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">New Password</label>
                                    <input
                                        type="password"
                                        id="new_password"
                                        name="new_password"
                                        value={profileForm.new_password}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="new_password_confirmation" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                                    <input
                                        type="password"
                                        id="new_password_confirmation"
                                        name="new_password_confirmation"
                                        value={profileForm.new_password_confirmation}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </MapAuthenticatedLayout>
    );
} 