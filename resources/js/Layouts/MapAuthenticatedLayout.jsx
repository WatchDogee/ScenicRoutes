import React from 'react';
import { Head } from '@inertiajs/react';

export default function MapAuthenticatedLayout({ children, header }) {
    return (
        <div className="min-h-screen bg-gray-100">
            <Head>
                <title>ScenicRoutes</title>
            </Head>

            <main>
                {header && (
                    <header className="bg-white shadow">
                        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {children}
            </main>
        </div>
    );
} 