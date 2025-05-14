import React, { useState } from 'react';
import SocialModal from '../Components/SocialModal';
export default function TestModal() {
    const [showSocialModal, setShowSocialModal] = useState(false);
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Modal Test Page</h1>
            <button
                onClick={() => setShowSocialModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
            >
                Open Social Hub
            </button>
            <SocialModal
                isOpen={showSocialModal}
                onClose={() => setShowSocialModal(false)}
                onViewRoad={() => {}}
            />
        </div>
    );
}
