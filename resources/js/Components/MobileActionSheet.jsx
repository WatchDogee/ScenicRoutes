import React from 'react';
import { FaRoute, FaVideo, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';

export default function MobileActionSheet({ isOpen, onClose, onPlanRoute, onRecordRide, onSaveLocation }) {
    if (!isOpen) return null;

    const actions = [
        {
            id: 'plan-route',
            label: 'Plan Scenic Route',
            description: 'Create a custom route with waypoints',
            icon: FaRoute,
            color: '#6366F1',
            action: () => {
                onPlanRoute?.();
                onClose();
            }
        },
        {
            id: 'record-ride',
            label: 'Record Ride',
            description: 'Coming soon - Track your ride in real-time',
            icon: FaVideo,
            color: '#10B981',
            action: () => {
                onRecordRide?.();
                onClose();
            },
            disabled: true
        },
        {
            id: 'save-location',
            label: 'Save Current Location',
            description: 'Coming soon - Bookmark your current position',
            icon: FaMapMarkerAlt,
            color: '#EC4899',
            action: () => {
                onSaveLocation?.();
                onClose();
            },
            disabled: true
        }
    ];

    return (
        <>
            <div 
                className="mobile-action-sheet-overlay"
                onClick={onClose}
            />
            <div className="mobile-action-sheet">
                <div className="mobile-action-sheet-header">
                    <h3 className="mobile-action-sheet-title">What would you like to do?</h3>
                    <button 
                        className="mobile-action-sheet-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <FaTimes />
                    </button>
                </div>
                <div className="mobile-action-sheet-content">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.id}
                                className={`mobile-action-item ${action.disabled ? 'disabled' : ''}`}
                                onClick={action.action}
                                disabled={action.disabled}
                            >
                                <div 
                                    className="mobile-action-item-icon"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${action.color}15, ${action.color}25)`,
                                        color: action.color
                                    }}
                                >
                                    <Icon />
                                </div>
                                <div className="mobile-action-item-content">
                                    <div className="mobile-action-item-label">{action.label}</div>
                                    <div className="mobile-action-item-description">{action.description}</div>
                                </div>
                                {action.disabled && (
                                    <div className="mobile-action-item-badge">Soon</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}


































