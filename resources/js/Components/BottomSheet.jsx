import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function BottomSheet({ 
    isOpen, 
    onClose, 
    title, 
    children,
    maxHeight = '90vh'
}) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div 
                className="mobile-bottom-sheet-overlay open"
                onClick={onClose}
            />
            <div 
                className="mobile-bottom-sheet open"
                style={{ maxHeight }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mobile-bottom-sheet-handle" />
                {title && (
                    <div className="mobile-bottom-sheet-header">
                        <h2 className="mobile-bottom-sheet-title">{title}</h2>
                        <button
                            className="mobile-bottom-sheet-close"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}
                <div className="mobile-bottom-sheet-content">
                    {children}
                </div>
            </div>
        </>
    );
}


































