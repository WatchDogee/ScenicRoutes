import React, { useState, useEffect, useRef } from 'react';
import MobileDrawer from './MobileDrawer';
import MobileFAB from './MobileFAB';
import MobileLoginModal from './MobileLoginModal';
import Map from '../Pages/Map';

export default function MobileMapWrapper({ auth, onLogin, onLogout }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginModalMode, setLoginModalMode] = useState('login');
    const drawerRenderedRef = useRef(false);

    useEffect(() => {
        // Force drawer to be closed on mount - CRITICAL
        setDrawerOpen(false);
        drawerRenderedRef.current = false;
        console.log('[MobileMapWrapper] Mounted - drawer should be CLOSED');
        
        const handleOpenLogin = (event) => {
            setLoginModalOpen(true);
            if (event.detail?.mode) {
                setLoginModalMode(event.detail.mode);
            }
        };

        const handleOpenDrawer = (event) => {
            console.log('[MobileMapWrapper] Drawer open event received');
            event.stopPropagation(); // Prevent event bubbling
            setDrawerOpen(true);
        };

        window.addEventListener('mobile-open-login', handleOpenLogin);
        window.addEventListener('mobile-open-drawer', handleOpenDrawer);
        return () => {
            window.removeEventListener('mobile-open-login', handleOpenLogin);
            window.removeEventListener('mobile-open-drawer', handleOpenDrawer);
            // Ensure drawer is closed on unmount
            setDrawerOpen(false);
            drawerRenderedRef.current = false;
        };
    }, []);

    useEffect(() => {
        console.log('[MobileMapWrapper] Drawer state:', drawerOpen);
        if (drawerOpen) {
            drawerRenderedRef.current = true;
        }
    }, [drawerOpen]);

    // Absolutely ensure drawer is closed on initial render
    // Only show drawer if BOTH conditions are met:
    // 1. drawerOpen is explicitly true (user tapped hamburger)
    // 2. drawerRenderedRef is true (drawer has been opened at least once)
    const shouldShowDrawer = drawerOpen && drawerRenderedRef.current;
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
        console.log('[MobileMapWrapper] Render - drawerOpen:', drawerOpen, 'shouldShowDrawer:', shouldShowDrawer);
    }

    return (
        <div style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Drawer - ONLY renders when explicitly opened via hamburger menu */}
            {shouldShowDrawer ? (
                <MobileDrawer
                    isOpen={true}
                    onClose={() => {
                        console.log('[MobileMapWrapper] Closing drawer');
                        setDrawerOpen(false);
                        drawerRenderedRef.current = false;
                    }}
                    auth={auth}
                    onLogout={onLogout}
                    onOpenCommunity={() => {
                        const event = new CustomEvent('mobile-open-community');
                        window.dispatchEvent(event);
                        setDrawerOpen(false);
                        drawerRenderedRef.current = false;
                    }}
                    onOpenCollections={() => {
                        const event = new CustomEvent('mobile-open-collections');
                        window.dispatchEvent(event);
                        setDrawerOpen(false);
                        drawerRenderedRef.current = false;
                    }}
                    onOpenLeaderboard={() => {
                        const event = new CustomEvent('mobile-open-leaderboard');
                        window.dispatchEvent(event);
                        setDrawerOpen(false);
                        drawerRenderedRef.current = false;
                    }}
                    onOpenSettings={() => {
                        const event = new CustomEvent('mobile-open-settings');
                        window.dispatchEvent(event);
                        setDrawerOpen(false);
                        drawerRenderedRef.current = false;
                    }}
                    onOpenLoginModal={(mode) => {
                        setLoginModalMode(mode || 'login');
                        setLoginModalOpen(true);
                        setDrawerOpen(false);
                        drawerRenderedRef.current = false;
                    }}
                />
            ) : null}

            {/* Map Container - ALWAYS visible, takes full space */}
            <div 
                className="mobile-map-container" 
                style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1,
                    background: '#f0f0f0',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden'
                }}
            >
                <Map
                    auth={auth}
                    onLogin={onLogin}
                    onLogout={onLogout}
                    isMobile={true}
                    onOpenCommunity={() => {
                        const event = new CustomEvent('mobile-open-community');
                        window.dispatchEvent(event);
                    }}
                    onOpenCollections={() => {
                        const event = new CustomEvent('mobile-open-collections');
                        window.dispatchEvent(event);
                    }}
                    onOpenLeaderboard={() => {
                        const event = new CustomEvent('mobile-open-leaderboard');
                        window.dispatchEvent(event);
                    }}
                    onOpenSettings={() => {
                        const event = new CustomEvent('mobile-open-settings');
                        window.dispatchEvent(event);
                    }}
                />
            </div>

            {/* FAB - Always visible on map */}
            <MobileFAB />

            {/* Login Modal - Only shows when loginModalOpen is true */}
            {loginModalOpen && (
                <MobileLoginModal
                    isOpen={true}
                    onClose={() => {
                        setLoginModalOpen(false);
                        setLoginModalMode('login');
                    }}
                    onLogin={onLogin}
                    initialMode={loginModalMode}
                />
            )}
        </div>
    );
}
