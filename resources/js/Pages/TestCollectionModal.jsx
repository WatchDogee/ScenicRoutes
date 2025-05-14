import React, { useState } from 'react';
import SocialModal from '../Components/SocialModal';
import CollectionModal from '../Components/CollectionModal';
export default function TestCollectionModal() {
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Collection Modal Test Page</h1>
            <div className="flex space-x-4">
                <button
                    onClick={() => setShowSocialModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Open Social Hub
                </button>
                <button
                    onClick={() => setShowCollectionModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                >
                    Open Collection Modal Directly
                </button>
            </div>
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-2">Test Instructions:</h2>
                <ol className="list-decimal pl-6 space-y-2">
                    <li>Click "Open Social Hub" to open the social modal</li>
                    <li>Click on the "Collections" tab</li>
                    <li>Click "New Collection" or "Create Collection" button</li>
                    <li>Try typing in the collection name field</li>
                    <li>The modal should stay open and accept your input</li>
                </ol>
            </div>
            <SocialModal
                isOpen={showSocialModal}
                onClose={() => setShowSocialModal(false)}
                onViewRoad={() => {}}
            />
            <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                onSuccess={() => alert('Collection created successfully!')}
            />
        </div>
    );
}
