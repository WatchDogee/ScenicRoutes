import './bootstrap';
import '../css/app.css';
import '../css/common.css';
import '../css/map.css';
import '../css/community.css';
import '../css/rating-modal.css';
import '../css/poi.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { AuthProvider } from './Contexts/AuthContext';
import { UserSettingsProvider } from './Contexts/UserSettingsContext';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        return pages[`./Pages/${name}.jsx`];
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <AuthProvider>
                <UserSettingsProvider>
                    <App {...props} />
                </UserSettingsProvider>
            </AuthProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

