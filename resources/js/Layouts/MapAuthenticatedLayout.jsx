import React from 'react';
import { Head, usePage } from '@inertiajs/react';
export default function MapAuthenticatedLayout({ children, header }) {
    const { component } = usePage();
    
    const isSettingsPage = component === 'Settings';
    
    const containerClasses = isSettingsPage
        ? "min-h-screen bg-gray-100 settings-container"
        : "min-h-screen bg-gray-100";
    return (
        <div className={containerClasses}>
            <Head>
                <title>ScenicRoutes</title>
            </Head>
            <main className={isSettingsPage ? "settings-main" : ""}>
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