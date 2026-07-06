import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaTimes, FaRoute, FaUsers, FaTrophy, FaFolder, 
    FaMap, FaCog, FaUser, FaChartLine, FaSignOutAlt 
} from 'react-icons/fa';

export default function MobileDrawer({ 
    isOpen, 
    onClose, 
    auth, 
    onLogout,
    onOpenCommunity,
    onOpenCollections,
    onOpenLeaderboard,
    onOpenSettings,
    onOpenLoginModal
}) {
    const navigate = useNavigate();

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // ABSOLUTELY do not render if not open
    // This is a critical check - drawer should NEVER show unless explicitly opened
    if (!isOpen) {
        return null;
    }

    // Double-check - if isOpen is somehow true but we shouldn't render, return null
    // This prevents any accidental rendering
    console.log('[MobileDrawer] Rendering drawer - isOpen:', isOpen);

    return (
        <>
            <div 
                className="mobile-drawer-overlay open"
                onClick={onClose}
            />
            <div 
                className="mobile-drawer open"
            >
                <div className="mobile-drawer-header">
                    <button
                        className="mobile-header-button"
                        onClick={onClose}
                        style={{ position: 'absolute', top: '8px', right: '8px' }}
                        aria-label="Close menu"
                    >
                        <FaTimes />
                    </button>
                    
                    {auth?.user ? (
                        <div className="mobile-drawer-user">
                            <div className="mobile-drawer-avatar" style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                fontSize: '22px'
                            }}>
                                {getInitials(auth.user.name)}
                            </div>
                            <div className="mobile-drawer-user-info">
                                <div className="mobile-drawer-user-name">
                                    {auth.user.name}
                                </div>
                                <div className="mobile-drawer-user-email">
                                    {auth.user.email}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mobile-drawer-user">
                            <div className="mobile-drawer-avatar" style={{
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                fontSize: '28px'
                            }}>👤</div>
                            <div className="mobile-drawer-user-info">
                                <div className="mobile-drawer-user-name">Welcome!</div>
                                <div className="mobile-drawer-user-email">Sign in to unlock all features</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mobile-drawer-menu">
                    <button
                        className="mobile-drawer-item"
                        onClick={() => {
                            navigate('/map');
                            onClose();
                        }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(103, 80, 164, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            borderLeft: '4px solid var(--md-primary)'
                        }}
                    >
                        <FaMap className="mobile-drawer-item-icon" style={{ color: 'var(--md-primary)' }} />
                        <span className="mobile-drawer-item-label" style={{ fontWeight: '600' }}>Map</span>
                    </button>

                    {!auth?.user && (
                        <>
                            <div style={{ 
                                borderTop: '1px solid rgba(0,0,0,0.08)', 
                                margin: '20px 16px',
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--md-surface)',
                                    padding: '0 16px',
                                    color: 'var(--md-on-surface-variant)',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    GET STARTED
                                </div>
                            </div>
                            <div style={{ padding: '0 16px', marginBottom: '12px' }}>
                                <button
                                    className="mobile-button mobile-button-primary"
                                    onClick={() => {
                                        if (onOpenLoginModal) {
                                            onOpenLoginModal('login');
                                        } else {
                                            const event = new CustomEvent('mobile-open-login');
                                            window.dispatchEvent(event);
                                        }
                                        onClose();
                                    }}
                                    style={{ 
                                        width: '100%',
                                        background: 'var(--gradient-primary)',
                                        fontSize: '16px',
                                        fontWeight: '700'
                                    }}
                                >
                                    <FaUser style={{ marginRight: '8px', fontSize: '18px' }} />
                                    Sign In
                                </button>
                            </div>
                            <div style={{ padding: '0 16px', textAlign: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onOpenLoginModal) {
                                            onOpenLoginModal('register');
                                        } else {
                                            const event = new CustomEvent('mobile-open-login', { detail: { mode: 'register' } });
                                            window.dispatchEvent(event);
                                        }
                                        onClose();
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--md-primary)',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        padding: '12px',
                                        textDecoration: 'underline',
                                        textUnderlineOffset: '4px'
                                    }}
                                >
                                    Create New Account
                                </button>
                            </div>
                        </>
                    )}

                    {auth?.user && (
                        <>
                            <button
                                className="mobile-drawer-item"
                                onClick={() => {
                                    if (onOpenLeaderboard) onOpenLeaderboard();
                                    onClose();
                                }}
                            >
                                <FaTrophy className="mobile-drawer-item-icon" style={{ color: '#F59E0B' }} />
                                <span className="mobile-drawer-item-label">Leaderboard</span>
                            </button>

                            <button
                                className="mobile-drawer-item"
                                onClick={() => {
                                    if (onOpenCollections) onOpenCollections();
                                    onClose();
                                }}
                            >
                                <FaFolder className="mobile-drawer-item-icon" style={{ color: '#EC4899' }} />
                                <span className="mobile-drawer-item-label">Collections</span>
                            </button>

                            <button
                                className="mobile-drawer-item"
                                onClick={() => {
                                    if (onOpenCommunity) onOpenCommunity();
                                    onClose();
                                }}
                            >
                                <FaUsers className="mobile-drawer-item-icon" style={{ color: '#10B981' }} />
                                <span className="mobile-drawer-item-label">Community</span>
                            </button>

                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', margin: '8px 0' }} />

                            <button
                                className="mobile-drawer-item"
                                onClick={() => {
                                    navigate('/profile');
                                    onClose();
                                }}
                            >
                                <FaUser className="mobile-drawer-item-icon" />
                                <span className="mobile-drawer-item-label">Profile</span>
                            </button>

                            <button
                                className="mobile-drawer-item"
                                onClick={() => {
                                    navigate('/subscription');
                                    onClose();
                                }}
                            >
                                <FaRoute className="mobile-drawer-item-icon" />
                                <span className="mobile-drawer-item-label">Subscription</span>
                            </button>

                            <button
                                className="mobile-drawer-item"
                                onClick={() => {
                                    navigate('/usage-stats');
                                    onClose();
                                }}
                            >
                                <FaChartLine className="mobile-drawer-item-icon" />
                                <span className="mobile-drawer-item-label">Usage Stats</span>
                            </button>

                            <button
                                className="mobile-drawer-item"
                                onClick={() => {
                                    if (onOpenSettings) onOpenSettings();
                                    onClose();
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
                                    onClose();
                                }}
                                style={{ color: 'var(--md-error)' }}
                            >
                                <FaSignOutAlt className="mobile-drawer-item-icon" />
                                <span className="mobile-drawer-item-label">Logout</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
