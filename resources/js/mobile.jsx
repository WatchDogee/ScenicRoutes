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
import '../css/mobile-android.css';
import '../css/mobile-new-ui.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MobileApp from './MobileApp';
import { AuthProvider } from './Contexts/AuthContext';
import { UserSettingsProvider } from './Contexts/UserSettingsContext';
import { NotificationProvider } from './Contexts/NotificationContext';
import { ToastProvider } from './Components/ToastContainer';

const appName = import.meta.env.VITE_APP_NAME || 'ScenicRoutes';

// Initialize app
const rootElement = document.getElementById('app');
if (!rootElement) {
    throw new Error('Root element #app not found');
}

// Remove loading screen once React is ready to render
const removeLoadingScreen = () => {
    console.log('Removing loading screen...');
    const loading = document.querySelector('.app-loading');
    if (loading) {
        loading.style.display = 'none';
        console.log('Loading screen removed');
    }
    // Also call global function if it exists
    if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
    }
};

// Error boundary component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error:', error, errorInfo);
        removeLoadingScreen();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-white p-4">
                    <div className="text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-gray-600 mb-4">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

try {
    console.log('Creating React root...');
    
    // Add mobile class to body for mobile-specific styles
    document.body.classList.add('mobile-app');
    
    const root = createRoot(rootElement);
    console.log('Rendering React app...');
    
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <BrowserRouter>
                    <AuthProvider>
                        <UserSettingsProvider>
                            <NotificationProvider>
                                <ToastProvider>
                                    <MobileApp />
                                </ToastProvider>
                            </NotificationProvider>
                        </UserSettingsProvider>
                    </AuthProvider>
                </BrowserRouter>
            </ErrorBoundary>
        </React.StrictMode>
    );

    console.log('React app rendered, removing loading screen...');
    
    // Remove loading screen after React renders
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
        setTimeout(removeLoadingScreen, 100);
    });
    
    // Set page title
    document.title = appName;
    console.log('App initialization complete');
} catch (error) {
    console.error('Failed to initialize app:', error);
    removeLoadingScreen();
    rootElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center;">
            <div>
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Failed to Load App</h1>
                <p style="color: #666; margin-bottom: 16px;">${error.message || 'An error occurred while loading the application'}</p>
                <button onclick="window.location.reload()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Reload
                </button>
            </div>
        </div>
    `;
}



