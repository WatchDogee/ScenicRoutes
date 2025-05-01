import React from 'react';

export default function ProfilePicture({ user, size = 'md', className = '' }) {
    // Size classes
    const sizeClasses = {
        'sm': 'w-8 h-8',
        'md': 'w-10 h-10',
        'lg': 'w-12 h-12',
    };
    
    const sizeClass = sizeClasses[size] || sizeClasses.md;
    
    return (
        <div className={`rounded-full bg-gray-200 overflow-hidden flex items-center justify-center ${sizeClass} ${className}`}>
            {user?.profile_picture_url ? (
                <img
                    src={user.profile_picture_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-medium">
                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
            )}
        </div>
    );
}
