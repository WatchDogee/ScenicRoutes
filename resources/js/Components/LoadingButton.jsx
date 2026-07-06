import React from 'react';
import { FaSpinner } from 'react-icons/fa';

export default function LoadingButton({ 
    children, 
    loading = false, 
    disabled = false,
    className = '',
    ...props 
}) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={`
                ${className}
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
                relative
            `}
        >
            {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <FaSpinner className="animate-spin" size={16} />
                </span>
            )}
            <span className={loading ? 'opacity-0' : ''}>
                {children}
            </span>
        </button>
    );
}



