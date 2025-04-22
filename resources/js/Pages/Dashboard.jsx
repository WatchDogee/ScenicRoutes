import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import apiClient from '@/utils/apiClient';

export default function Dashboard() {
    const [savedRoads, setSavedRoads] = useState([]);

    useEffect(() => {
        apiClient.get('/saved-roads')
            .then((response) => setSavedRoads(response.data))
            .catch((error) => console.error('Failed to fetch saved roads:', error));
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            You're logged in!
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2>Saved Roads</h2>
                <ul>
                    {savedRoads.map((road) => (
                        <li key={road.id}>{road.name}</li>
                    ))}
                </ul>
            </div>
        </AuthenticatedLayout>
    );
}
