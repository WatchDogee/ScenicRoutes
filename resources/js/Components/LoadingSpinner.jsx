import React from 'react';
import { FaSpinner } from 'react-icons/fa';

export default function LoadingSpinner({ 
    size = 'md', 
    text = null, 
    fullScreen = false,
    overlay = false 
}) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    const spinner = (
        <div className={`flex flex-col items-center justify-center gap-3 ${fullScreen ? 'min-h-screen' : ''}`}>
            <FaSpinner 
                className={`${sizeClasses[size]} animate-spin text-blue-600`}
                aria-label="Loading"
            />
            {text && (
                <p className="text-sm text-gray-600">{text}</p>
            )}
        </div>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex items-center justify-center">
                {spinner}
            </div>
        );
    }

    return spinner;
}



