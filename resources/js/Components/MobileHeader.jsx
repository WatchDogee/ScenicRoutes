import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUser, FaCog, FaSignOutAlt, FaMap, FaRoute } from 'react-icons/fa';

export default function MobileHeader({ auth, onOpenDrawer, onLogout, onOpenLogin }) {
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <header className="mobile-header">
            <button 
                className="mobile-header-button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[MobileHeader] Hamburger clicked - opening drawer');
                    if (onOpenDrawer) {
                        onOpenDrawer();
                    }
                }}
                aria-label="Open menu"
            >
                <FaBars />
            </button>
            
            <div className="mobile-header-title">
                <span style={{ 
                    fontSize: '28px',
                    display: 'inline-block',
                    transform: 'rotate(-15deg)',
                    marginRight: '8px'
                }}>🗺️</span>
                <span>ScenicRoutes</span>
            </div>

            <div className="mobile-header-actions">
                {auth?.user ? (
                    <>
                        <button
                            className="mobile-header-button"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            aria-label="User menu"
                        >
                            <FaUser />
                        </button>
                        {showUserMenu && (
                            <>
                                <div 
                                    className="mobile-drawer-overlay open"
                                    onClick={() => setShowUserMenu(false)}
                                />
                                <div 
                                    className="mobile-card"
                                    style={{
                                        position: 'fixed',
                                        top: '64px',
                                        right: '16px',
                                        zIndex: 1201,
                                        minWidth: '200px',
                                        padding: '8px 0'
                                    }}
                                >
                                    <button
                                        className="mobile-drawer-item"
                                        onClick={() => {
                                            navigate('/profile');
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <FaUser className="mobile-drawer-item-icon" />
                                        <span className="mobile-drawer-item-label">Profile</span>
                                    </button>
                                    <button
                                        className="mobile-drawer-item"
                                        onClick={() => {
                                            navigate('/subscription');
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <FaRoute className="mobile-drawer-item-icon" />
                                        <span className="mobile-drawer-item-label">Subscription</span>
                                    </button>
                                    <button
                                        className="mobile-drawer-item"
                                        onClick={() => {
                                            navigate('/usage-stats');
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <FaMap className="mobile-drawer-item-icon" />
                                        <span className="mobile-drawer-item-label">Usage Stats</span>
                                    </button>
                                    <button
                                        className="mobile-drawer-item"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            // Open settings - you'll need to pass this handler
                                        }}
                                    >
                                        <FaCog className="mobile-drawer-item-icon" />
                                        <span className="mobile-drawer-item-label">Settings</span>
                                    </button>
                                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', margin: '8px 0' }} />
                                    <button
                                        className="mobile-drawer-item"
                                        onClick={() => {
                                            if (onLogout) onLogout();
                                            setShowUserMenu(false);
                                        }}
                                        style={{ color: 'var(--md-error)' }}
                                    >
                                        <FaSignOutAlt className="mobile-drawer-item-icon" />
                                        <span className="mobile-drawer-item-label">Logout</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <button
                        className="mobile-header-button"
                        onClick={() => {
                            if (onOpenLogin) onOpenLogin();
                        }}
                        aria-label="Sign in"
                    >
                        <FaUser />
                    </button>
                )}
            </div>
        </header>
    );
}

