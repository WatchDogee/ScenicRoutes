import React from 'react';
import PropTypes from 'prop-types';

$1
export default function UserMention({ user, onViewUser, className = '', showAt = false, size = 'md' }) {
    if (!user) return null;
    
    
    const displayName = user.username || 
                        (user.name ? user.name.toLowerCase().replace(/\s+/g, '') : 'user');
    
    
    const sizeClasses = {
        'sm': 'text-sm',
        'md': 'text-base',
        'lg': 'text-lg',
    };
    
    const sizeClass = sizeClasses[size] || sizeClasses.md;
    
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onViewUser && user.id) {
            onViewUser(user);
        }
    };
    
    return (
        <span 
            className={`text-blue-600 font-medium hover:text-blue-800 cursor-pointer ${sizeClass} ${className}`}
            onClick={handleClick}
        >
            {showAt && '@'}{displayName}
        </span>
    );
}

UserMention.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        username: PropTypes.string
    }),
    onViewUser: PropTypes.func.isRequired,
    className: PropTypes.string,
    showAt: PropTypes.bool,
    size: PropTypes.string
};
