import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import MobileActionSheet from './MobileActionSheet';

export default function MobileFAB({ onFindRoads, onPlanRoute }) {
    const [actionSheetOpen, setActionSheetOpen] = useState(false);

    const handlePlanRoute = () => {
        if (onPlanRoute) {
            onPlanRoute();
        } else {
            const event = new CustomEvent('mobile-plan-route');
            window.dispatchEvent(event);
        }
    };

    const handleRecordRide = () => {
        // Placeholder - will show coming soon message
        console.log('Record ride - coming soon');
    };

    const handleSaveLocation = () => {
        // Placeholder - will show coming soon message
        console.log('Save location - coming soon');
    };

    return (
        <>
            <button
                className="mobile-fab"
                onClick={() => setActionSheetOpen(true)}
                aria-label="Open actions"
            >
                <FaPlus />
            </button>
            <MobileActionSheet
                isOpen={actionSheetOpen}
                onClose={() => setActionSheetOpen(false)}
                onPlanRoute={handlePlanRoute}
                onRecordRide={handleRecordRide}
                onSaveLocation={handleSaveLocation}
            />
        </>
    );
}

