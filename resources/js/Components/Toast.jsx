import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <FaCheckCircle className="text-green-500" />,
        error: <FaExclamationCircle className="text-red-500" />,
        warning: <FaExclamationCircle className="text-yellow-500" />,
        info: <FaInfoCircle className="text-blue-500" />
    };

    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    return (
        <div
            className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
            } ${colors[type]}`}
            role="alert"
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    {icons[type]}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium">{message}</p>
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(() => onClose?.(), 300);
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                >
                    <FaTimes className="text-sm" />
                </button>
            </div>
        </div>
    );
};

export default Toast;

// Toast Manager Hook
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        const newToast = { id, message, type, duration };
        setToasts(prev => [...prev, newToast]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const ToastContainer = () => (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );

    return { showToast, ToastContainer };
};
