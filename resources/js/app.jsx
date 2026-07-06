import './bootstrap';
import '../css/app.css';
import '../css/common.css';
import '../css/map.css';
import '../css/community.css';
import '../css/rating-modal.css';
import '../css/poi.css';
import '../css/fix-scrolling.css';
import '../css/tags.css';
import '../css/modal-fixes.css';
import '../css/road-scaling.css';
import '../css/map-buttons-fix.css';
import '../css/fixed-buttons.css';
import '../css/desktop-ui-improvements.css';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { AuthProvider } from './Contexts/AuthContext';
import { UserSettingsProvider } from './Contexts/UserSettingsContext';
import { NotificationProvider } from './Contexts/NotificationContext';
import { ToastProvider } from './Components/ToastContainer';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: false });
        const pagePath = `./Pages/${name}.jsx`;
        
        if (!pages[pagePath]) {
            throw new Error(`Page ${name} not found`);
        }

        return pages[pagePath]();
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <AuthProvider>
                <UserSettingsProvider>
                    <NotificationProvider>
                        <ToastProvider>
                            <App {...props} />
                        </ToastProvider>
                    </NotificationProvider>
                </UserSettingsProvider>
            </AuthProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
