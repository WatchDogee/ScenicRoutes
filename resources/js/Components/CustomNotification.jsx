import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
export default function CustomNotification({ 
    message, 
    type = 'info', 
    duration = 5000, 
    onClose,
    isImportant = false
}) {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        if (!isImportant && duration > 0) {
            const timer = setTimeout(() => {
                setVisible(false);
                if (onClose) setTimeout(onClose, 300); 
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose, isImportant]);
    const handleClose = () => {
        setVisible(false);
        if (onClose) setTimeout(onClose, 300); 
    };
    
    if (!isImportant && !visible) return null;
    
    let Icon, bgColor, textColor, borderColor;
    switch (type) {
        case 'success':
            Icon = FaCheckCircle;
            bgColor = 'bg-green-100';
            textColor = 'text-green-800';
            borderColor = 'border-green-400';
            break;
        case 'error':
            Icon = FaExclamationCircle;
            bgColor = 'bg-red-100';
            textColor = 'text-red-800';
            borderColor = 'border-red-400';
            break;
        case 'warning':
            Icon = FaExclamationCircle;
            bgColor = 'bg-yellow-100';
            textColor = 'text-yellow-800';
            borderColor = 'border-yellow-400';
            break;
        case 'info':
        default:
            Icon = FaInfoCircle;
            bgColor = 'bg-blue-100';
            textColor = 'text-blue-800';
            borderColor = 'border-blue-400';
    }
    return (
        <div 
            className={`fixed bottom-4 right-4 max-w-md ${bgColor} ${textColor} ${borderColor} border-l-4 p-4 rounded shadow-lg transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} z-[9999]`}
            role="alert"
        >
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        type="button"
                        className={`inline-flex ${textColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        onClick={handleClose}
                    >
                        <span className="sr-only">Close</span>
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
