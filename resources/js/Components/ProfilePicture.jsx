import React from 'react';

export default function ProfilePicture({ user, size = 'md', className = '' }) {
    // Size classes
    const sizeClasses = {
        'xs': 'w-6 h-6 text-xs',
        'sm': 'w-8 h-8 text-sm',
        'md': 'w-10 h-10 text-base',
        'lg': 'w-12 h-12 text-lg',
        'xl': 'w-20 h-20 text-xl',
        '2xl': 'w-24 h-24 text-2xl',
    };

    const sizeClass = sizeClasses[size] || sizeClasses.md;

    // Generate a consistent color based on the user's name
    const getColorClass = (name) => {
        if (!name) return 'bg-blue-500';

        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500',
            'bg-red-500', 'bg-yellow-500', 'bg-pink-500',
            'bg-indigo-500', 'bg-teal-500'
        ];

        // Simple hash function to get a consistent color
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    // Get the profile picture URL, handling different formats
    const getProfilePictureUrl = () => {
        if (!user) return null;

        // Check different possible properties for the profile picture
        return user.profile_picture_url ||
               user.profile_picture ||
               (user.profile_picture_path ? `/storage/${user.profile_picture_path}` : null);
    };

    const profilePictureUrl = getProfilePictureUrl();
    const colorClass = getColorClass(user?.name);

    return (
        <div className={`rounded-full bg-gray-200 overflow-hidden flex items-center justify-center ${sizeClass} ${className}`}>
            {profilePictureUrl ? (
                <img
                    src={profilePictureUrl}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // If image fails to load, show the fallback
                        e.target.style.display = 'none';
                        e.target.parentNode.classList.add(colorClass);
                    }}
                />
            ) : (
                <div className={`w-full h-full flex items-center justify-center ${colorClass} text-white font-medium`}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
            )}
        </div>
    );
}
