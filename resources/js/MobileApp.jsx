import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import apiClient from './utils/apiClient';
import { setAuthToken } from './utils/apiClient';
import ErrorHandler from './utils/errorHandler';

// Pages
import Map from './Pages/Map';
import ExplorePage from './Pages/ExplorePage';
import TripsPage from './Pages/TripsPage';
import ProfilePage from './Pages/ProfilePage';
import Subscription from './Pages/Subscription';
import UsageStats from './Pages/UsageStats';
import UserProfile from './Pages/UserProfile';
import MobileMapWrapper from './Components/MobileMapWrapper';
import MobileBottomNav from './Components/MobileBottomNav';
import MobileHeader from './Components/MobileHeader';
import NewMobileMapScreen from './Components/NewMobileMapScreen';
import NewBottomNav from './Components/NewBottomNav';
import MobileLoginModal from './Components/MobileLoginModal';

// Loading component
import LoadingSpinner from './Components/LoadingSpinner';

function MobileLayout({ children, auth, onLogin, onLogout }) {
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginModalMode, setLoginModalMode] = useState('login');
    const location = useLocation();

    // Only show header and bottom nav on main tabs
    const showNav = ['/map', '/explore', '/trips', '/profile', '/'].includes(location.pathname);
    
    // Use new UI for map page - no old header/drawer
    const useNewUI = location.pathname === '/map';

    // Handle login modal events
    useEffect(() => {
        const handleOpenLogin = (event) => {
            setLoginModalOpen(true);
            if (event.detail?.mode) {
                setLoginModalMode(event.detail.mode);
            }
        };

        window.addEventListener('mobile-open-login', handleOpenLogin);
        return () => {
            window.removeEventListener('mobile-open-login', handleOpenLogin);
        };
    }, []);

    return (
        <div className="mobile-app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Old header - only show for non-map pages */}
            {/* Map page uses NewMobileMapScreen which has its own header */}
            {showNav && !useNewUI && (
                <MobileHeader
                    auth={auth}
                    onOpenDrawer={() => {
                        const event = new CustomEvent('mobile-open-drawer');
                        window.dispatchEvent(event);
                    }}
                    onLogout={onLogout}
                    onOpenLogin={() => {
                        setLoginModalMode('login');
                        setLoginModalOpen(true);
                    }}
                />
            )}
            
            {/* Prevent old drawer from opening on map page */}
            {useNewUI && (
                <style>{`
                    .mobile-drawer,
                    .mobile-drawer-overlay,
                    .mobile-drawer.open {
                        display: none !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        opacity: 0 !important;
                        transform: translateX(-100%) !important;
                    }
                `}</style>
            )}
            
            <div className="mobile-content" style={{ 
                flex: 1, 
                overflow: 'hidden',
                marginTop: showNav && !useNewUI ? '64px' : '0',
                marginBottom: showNav && !useNewUI ? '64px' : '0',
                ...(useNewUI ? {
                    marginTop: 0,
                    marginBottom: 0,
                    padding: 0,
                    height: '100vh',
                    width: '100vw',
                    position: 'relative',
                    overflow: 'hidden'
                } : {})
            }}>
                {children}
            </div>

            {/* Bottom nav - only for non-map pages (map has its own) */}
            {showNav && !useNewUI && (
                <NewBottomNav auth={auth} />
            )}

            <MobileLoginModal
                isOpen={loginModalOpen}
                onClose={() => {
                    setLoginModalOpen(false);
                    setLoginModalMode('login');
                }}
                onLogin={onLogin}
                initialMode={loginModalMode}
            />
        </div>
    );
}

export default function MobileApp() {
    const [auth, setAuth] = useState({ user: null, loading: true });
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                setAuthToken(token);
                try {
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timeout')), 10000)
                    );
                    const response = await Promise.race([
                        apiClient.get('/user'),
                        timeoutPromise
                    ]);
                    // Add is_founder property for frontend logic
                    const user = response.data;
                    user.is_founder = user.subscription_tier === 'founder' || user.is_founder;
                    setAuth({ user, loading: false });
                } catch (error) {
                    console.warn('Auth check failed:', error.message);
                    localStorage.removeItem('token');
                    setAuthToken(null);
                    setAuth({ user: null, loading: false });
                }
            } else {
                setAuth({ user: null, loading: false });
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            setAuth({ user: null, loading: false });
        } finally {
            setInitialized(true);
        }
    };

    const handleLogin = (userData, token) => {
        localStorage.setItem('token', token);
        setAuthToken(token);
        setAuth({ user: userData, loading: false });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setAuthToken(null);
        setAuth({ user: null, loading: false });
    };

    if (!initialized || auth.loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading..." />
            </div>
        );
    }

    return (
        <MobileLayout auth={auth} onLogin={handleLogin} onLogout={handleLogout}>
            <Routes>
                {/* Main tabs */}
                <Route 
                    path="/" 
                    element={<Navigate to="/map" replace />} 
                />
                <Route 
                    path="/map" 
                    element={<NewMobileMapScreen auth={auth} onLogin={handleLogin} onLogout={handleLogout} />} 
                />
                <Route 
                    path="/explore" 
                    element={<ExplorePage auth={auth} onOpenLogin={() => {
                        const event = new CustomEvent('mobile-open-login');
                        window.dispatchEvent(event);
                    }} />} 
                />
                <Route 
                    path="/trips" 
                    element={<TripsPage auth={auth} onOpenLogin={() => {
                        const event = new CustomEvent('mobile-open-login');
                        window.dispatchEvent(event);
                    }} />} 
                />
                <Route 
                    path="/profile" 
                    element={<ProfilePage auth={auth} onLogout={handleLogout} onOpenLogin={() => {
                        const event = new CustomEvent('mobile-open-login');
                        window.dispatchEvent(event);
                    }} />} 
                />

                {/* Secondary pages (no nav) */}
                <Route 
                    path="/subscription" 
                    element={
                        auth.user ? (
                            <Subscription auth={auth} />
                        ) : (
                            <Navigate to="/profile" replace />
                        )
                    } 
                />
                <Route 
                    path="/usage-stats" 
                    element={
                        auth.user ? (
                            <UsageStats auth={auth} />
                        ) : (
                            <Navigate to="/profile" replace />
                        )
                    } 
                />
                <Route 
                    path="/user-profile" 
                    element={
                        auth.user ? (
                            <UserProfile auth={auth} />
                        ) : (
                            <Navigate to="/profile" replace />
                        )
                    } 
                />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/map" replace />} />
            </Routes>
        </MobileLayout>
    );
}



