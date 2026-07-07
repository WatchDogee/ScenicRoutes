import React from 'react';
import BottomSheet from './BottomSheet';

export default function ActionMenu({ isOpen, onClose, onFindRoads, onPlanRoute, onRecordRide }) {
    const actions = [
        {
            id: 'find-roads',
            icon: '🗺️',
            title: 'Find Curved Roads',
            description: 'Discover scenic routes near you',
            onClick: () => {
                onFindRoads?.();
                onClose();
            }
        },
        {
            id: 'plan-route',
            icon: '📍',
            title: 'Plan Route',
            description: 'Create a custom route with waypoints',
            onClick: () => {
                onPlanRoute?.();
                onClose();
            }
        },
        {
            id: 'record-ride',
            icon: '📹',
            title: 'Record Ride',
            description: 'Track your journey (Coming soon)',
            onClick: () => {
                onRecordRide?.();
                onClose();
            },
            disabled: true
        }
    ];

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="What would you like to do?">
            <div className="mobile-section">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        className="mobile-action-item"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        style={{
                            opacity: action.disabled ? 0.5 : 1,
                            cursor: action.disabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <div className="mobile-action-item-icon">
                            {action.icon}
                        </div>
                        <div className="mobile-action-item-content">
                            <div className="mobile-action-item-title">{action.title}</div>
                            <div className="mobile-action-item-description">{action.description}</div>
                        </div>
                    </button>
                ))}
            </div>
        </BottomSheet>
    );
}


































