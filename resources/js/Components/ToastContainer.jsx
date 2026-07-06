import React from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

let toastContainer = null;
let toastIdCounter = 0;
let toastListeners = [];

const getToastContainer = () => {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-[9999] pointer-events-none';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
};

export const showToast = (message, type = 'info', duration = 5000) => {
    const id = ++toastIdCounter;
    const toast = { id, message, type, duration };
    
    toastListeners.forEach(listener => listener(toast));
    
    return id;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = React.useState([]);

    React.useEffect(() => {
        const listener = (toast) => {
            setToasts(prev => [...prev, toast]);
        };
        
        toastListeners.push(listener);
        
        return () => {
            toastListeners = toastListeners.filter(l => l !== listener);
        };
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const container = getToastContainer();

    return (
        <>
            {children}
            {createPortal(
                <div className="pointer-events-auto">
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={removeToast}
                        />
                    ))}
                </div>,
                container
            )}
        </>
    );
};

export default ToastProvider;



