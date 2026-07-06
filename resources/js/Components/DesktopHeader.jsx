import React, { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { FaRoute, FaUsers, FaFolder, FaTrophy, FaCog, FaUser, FaSignOutAlt, FaChartLine } from 'react-icons/fa';
import axios from 'axios';
import ProfilePicture from './ProfilePicture';
import SubscriptionBadge from './SubscriptionBadge';
import apiClient from '@/utils/apiClient';

export default function DesktopHeader({ 
    auth,
    currentPage = 'map',
    onOpenCommunity,
    onOpenCollections,
    onOpenLeaderboard,
    onOpenProfile,
    onOpenSettings,
    onLogout
}) {
    // Try to get page props from Inertia, but don't fail if not available (mobile app)
    let pageProps = null;
    let csrf_token = null;
    try {
        if (typeof usePage === 'function') {
            pageProps = usePage();
            csrf_token = pageProps?.props?.csrf_token;
        }
    } catch (e) {
        // Not in Inertia context (mobile app), continue without it
        console.log('DesktopHeader: Not in Inertia context, using mobile mode');
    }
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLoginDropdown, setShowLoginDropdown] = useState(false);
    const [loginForm, setLoginForm] = useState({ login: '', password: '', remember: false });
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [unverified, setUnverified] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [resendError, setResendError] = useState('');
    const [subscriptionOverride, setSubscriptionOverride] = useState(auth?.user?.subscription || null);
    const loginDropdownRef = useRef(null);
    const userMenuRef = useRef(null);

    const navTabs = [
        { id: 'leaderboard', label: 'Leaderboard', icon: FaTrophy, onClick: onOpenLeaderboard },
        { id: 'collections', label: 'Collections', icon: FaFolder, onClick: onOpenCollections },
        { id: 'community', label: 'Community', icon: FaUsers, onClick: onOpenCommunity },
    ];

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            // If onLogout callback is provided (mobile app), use it
            if (onLogout) {
                onLogout();
            } else {
                // Use API endpoint directly (avoids CSRF issues)
                await apiClient.post('/logout');
                // Clear any local storage tokens
                localStorage.removeItem('token');
                // Reload page to clear session
                window.location.href = '/map';
            }
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if API call fails, try to clear local state and reload
            localStorage.removeItem('token');
            window.location.href = '/map';
        }
    };

    const handleNavClick = (e, tab) => {
        e.preventDefault();
        if (tab.onClick) {
            tab.onClick();
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target)) {
                setShowLoginDropdown(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        if (showLoginDropdown || showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLoginDropdown, showUserMenu]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setUnverified(false);
        setUnverifiedEmail('');
        setResendMessage('');
        setResendError('');
        setLoginLoading(true);

        try {
            // Use shared apiClient (/api base) and expect verification_needed flag for unverified users
            const response = await apiClient.post('/login', {
                login: loginForm.login,
                password: loginForm.password
            });

            if (response.data && response.data.user && response.data.token) {
                const authToken = response.data.token;
                localStorage.setItem('token', authToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

                setShowLoginDropdown(false);
                setLoginForm({ login: '', password: '', remember: false });
                window.location.reload();
                return;
            }

            throw new Error(response.data?.message || 'Login successful but user data is missing');
        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;

            if (status === 403 && data?.verification_needed) {
                setUnverified(true);
                setUnverifiedEmail(data?.email || loginForm.login || '');
                setLoginError('');
            } else if (status === 401 || status === 422) {
                setLoginError(data?.message || 'Invalid credentials');
            } else {
                setLoginError(error.message || 'An error occurred. Please try again.');
            }
        } finally {
            setLoginLoading(false);
        }
    };

    const handleResendVerification = async () => {
        const emailToUse = unverifiedEmail || loginForm.login;
        if (!emailToUse) return;
        setResendLoading(true);
        setResendMessage('');
        setResendError('');
        try {
            const response = await apiClient.post('/email/resend-verification', { email: emailToUse });
            setResendMessage(response.data?.message || 'Verification link sent successfully!');
        } catch (err) {
            setResendError(err.response?.data?.message || 'Failed to send verification email. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    // Refresh subscription status so the header reflects the current plan (webhook sync fallback)
    useEffect(() => {
        let isMounted = true;
        if (!auth?.user) {
            setSubscriptionOverride(null);
            return () => { isMounted = false; };
        }

        const existing = auth.user.subscription;
        const hasPaid = existing && existing.plan && existing.plan !== 'free';
        if (hasPaid) {
            setSubscriptionOverride(existing);
            return () => { isMounted = false; };
        }

        const fetchSubscription = async () => {
            try {
                const { data } = await apiClient.get('/subscriptions/current');
                if (!isMounted) return;
                const nextSub = data?.subscription || (data?.tier ? {
                    plan: data.tier,
                    status: data.has_active_subscription ? 'active' : 'inactive',
                    billing_cycle: data.subscription?.billing_cycle || 'monthly',
                } : null);
                setSubscriptionOverride(nextSub);
            } catch (error) {
                console.error('Failed to refresh subscription status:', error);
            }
        };

        fetchSubscription();

        return () => {
            isMounted = false;
        };
    }, [auth?.user?.id]);

    const effectiveSubscription = subscriptionOverride || auth?.user?.subscription || null;
    const hasPaidSubscription = !!effectiveSubscription && effectiveSubscription.plan && effectiveSubscription.plan !== 'free';
    const userForBadge = auth?.user ? { ...auth.user, subscription: effectiveSubscription } : null;

    return (
        <header className="desktop-header">
            <div className="header-left">
                <div className="header-logo">
                    <FaRoute className="text-xl" />
                    <span>ScenicRoutes</span>
                </div>
                <nav className="nav-tabs">
                    {navTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = currentPage === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={(e) => handleNavClick(e, tab)}
                                className={`nav-tab ${isActive ? 'active' : ''}`}
                            >
                                <Icon className="mr-1" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>
            <div className="header-right">
                {auth?.user ? (
                    <>
                        {/* Free User Upgrade Banner */}
                        {!hasPaidSubscription && (
                            <a
                                href="/subscription"
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
                            >
                                Upgrade to Premium
                            </a>
                        )}
                        <SubscriptionBadge user={userForBadge || auth.user} onOpenSettings={onOpenSettings} />
                        <div className="relative" ref={userMenuRef}>
                            <div
                                className="user-menu-header"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                            >
                                <ProfilePicture
                                    user={auth.user}
                                    size={32}
                                />
                                <span>{auth.user.name}</span>
                            </div>
                            {showUserMenu && (
                                <div 
                                    className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border border-gray-200 py-1 z-[1500] user-menu-dropdown"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        backgroundColor: '#667eea',
                                        borderColor: 'rgba(255, 255, 255, 0.2)'
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            if (onOpenProfile) onOpenProfile();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 user-menu-item"
                                        style={{ color: 'white' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        <FaUser />
                                        My Profile
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            if (onOpenSettings) onOpenSettings();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 user-menu-item"
                                        style={{ color: 'white' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        <FaCog />
                                        Settings
                                    </button>
                                    <a
                                        href="/subscription"
                                        onClick={() => setShowUserMenu(false)}
                                        className="w-full text-left px-4 py-2 text-sm flex items-center justify-between user-menu-item"
                                        style={{ color: 'white' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FaRoute />
                                            <span>Subscription</span>
                                        </div>
                                        {auth.user?.subscription && auth.user.subscription.plan !== 'free' && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                auth.user.subscription.plan === 'premium' 
                                                    ? 'bg-blue-500' 
                                                    : 'bg-purple-500'
                                            }`}>
                                                {auth.user.subscription.plan === 'premium' ? 'Premium' : 'Pro'}
                                            </span>
                                        )}
                                    </a>
                                    {(auth.user?.subscription?.plan === 'premium' || auth.user?.subscription?.plan === 'pro') && (
                                        <a
                                            href="/usage-stats"
                                            onClick={() => setShowUserMenu(false)}
                                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 user-menu-item"
                                            style={{ color: 'white' }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            <FaChartLine />
                                            Usage Statistics
                                        </a>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 user-menu-item"
                                        style={{ color: 'white' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        <FaSignOutAlt />
                                        Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="header-right-item" ref={loginDropdownRef}>
                        <button
                            onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                            className="sign-in-button px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                        >
                            <FaUser style={{ color: 'white' }} />
                            <span style={{ color: 'white' }}>Sign In</span>
                        </button>
                        {showLoginDropdown && (
                            <div className="login-dropdown">
                                <div 
                                    className="login-dropdown-content"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        backgroundColor: '#667eea',
                                        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white'
                                    }}
                                >
                                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'white' }}>Sign In</h3>
                                    {loginError && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm break-words">
                                            {loginError}
                                        </div>
                                    )}
                                    {unverified && (
                                        <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm break-words">
                                            <div className="mb-2">Your email is not verified. Please check your inbox or resend the link.</div>
                                            {resendMessage && (
                                                <div className="mb-2 p-2 bg-green-100 text-green-700 rounded">{resendMessage}</div>
                                            )}
                                            {resendError && (
                                                <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{resendError}</div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleResendVerification}
                                                disabled={resendLoading}
                                                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                                            >
                                                {resendLoading ? 'Sending…' : 'Resend Verification Email'}
                                            </button>
                                        </div>
                                    )}
                                    <form onSubmit={handleLogin}>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-2" htmlFor="header-login" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                                                Email or Username
                                            </label>
                                            <input
                                                id="header-login"
                                                type="text"
                                                value={loginForm.login}
                                                onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent box-border"
                                                placeholder="Enter your email or username"
                                                required
                                                autoComplete="username"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium mb-2" htmlFor="header-password" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                                                Password
                                            </label>
                                            <input
                                                id="header-password"
                                                type="password"
                                                value={loginForm.password}
                                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent box-border"
                                                placeholder="Enter your password"
                                                required
                                                autoComplete="current-password"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                            <label className="flex items-center flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={loginForm.remember}
                                                    onChange={(e) => setLoginForm({ ...loginForm, remember: e.target.checked })}
                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="ml-2 text-sm whitespace-nowrap" style={{ color: 'white' }}>Remember me</span>
                                            </label>
                                            <a
                                                href="/recover-password"
                                                className="text-sm whitespace-nowrap flex-shrink-0"
                                                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                                                onMouseEnter={(e) => e.target.style.color = 'white'}
                                                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}
                                                onClick={() => setShowLoginDropdown(false)}
                                            >
                                                Forgot password?
                                            </a>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loginLoading}
                                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loginLoading ? 'Signing in...' : 'Sign In'}
                                        </button>
                                    </form>
                                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                                        <p className="text-sm text-center break-words" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                            Don't have an account?{' '}
                                            <a
                                                href="/register"
                                                className="font-medium inline-block"
                                                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                                                onMouseEnter={(e) => e.target.style.color = 'white'}
                                                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}
                                                onClick={() => setShowLoginDropdown(false)}
                                            >
                                                Register
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

