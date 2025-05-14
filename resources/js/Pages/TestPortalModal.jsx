import React, { useState } from 'react';
import CollectionModal from '../Components/CollectionModal';
export default function TestPortalModal() {
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Portal Modal Test Page</h1>
            <button
                onClick={() => {
                    setShowCollectionModal(true);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded"
            >
                Open Collection Modal
            </button>
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-2">Test Instructions:</h2>
                <ol className="list-decimal pl-6 space-y-2">
                    <li>Click "Open Collection Modal" to open the modal</li>
                    <li>Try typing in the collection name field</li>
                    <li>The modal should stay open and accept your input</li>
                </ol>
            </div>
            <CollectionModal
                isOpen={showCollectionModal}
                onClose={() => {
                    setShowCollectionModal(false);
                }}
                onSuccess={() => {
                    alert('Collection created successfully!');
                    setShowCollectionModal(false);
                }}
            />
        </div>
    );
}
