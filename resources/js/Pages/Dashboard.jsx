import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';
export default function Dashboard() {
    const [savedRoads, setSavedRoads] = useState([]);
    useEffect(() => {
        
        window.location.href = '/map';
    }, []);
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <Head title="Redirecting..." />
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Redirecting to map...</p>
            </div>
        </div>
    );
}
