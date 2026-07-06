import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaCrown, FaChartLine, FaCog, FaSignOutAlt } from 'react-icons/fa';

export default function ProfilePage({ auth, onLogout, onOpenLogin }) {
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

    const getSubscriptionBadge = (subscription) => {
        if (!subscription) return { text: 'Free', color: '#64748B', bg: '#F1F5F9' };
        if (subscription.plan === 'premium') return { text: 'Premium', color: '#6750A4', bg: '#EADDFF' };
        if (subscription.plan === 'pro') return { text: 'Pro', color: '#EC4899', bg: '#FDF2F8' };
        return { text: 'Free', color: '#64748B', bg: '#F1F5F9' };
    };

    const subscriptionBadge = auth?.user ? getSubscriptionBadge(auth.user.subscription) : null;

    const menuItems = auth?.user ? [
        {
            id: 'subscription',
            label: 'Subscription',
            icon: FaCrown,
            color: '#F59E0B',
            action: () => navigate('/subscription')
        },
        {
            id: 'usage',
            label: 'Usage Stats',
            icon: FaChartLine,
            color: '#6750A4',
            action: () => navigate('/usage-stats')
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: FaCog,
            color: '#64748B',
            action: () => {
                const event = new CustomEvent('mobile-open-settings');
                window.dispatchEvent(event);
            }
        },
        {
            id: 'logout',
            label: 'Log Out',
            icon: FaSignOutAlt,
            color: '#BA1A1A',
            action: () => {
                if (onLogout) onLogout();
            }
        }
    ] : [];

    if (!auth?.user) {
        return (
            <div className="mobile-page">
                <div className="mobile-page-header">
                    <h1 className="mobile-page-title">Profile</h1>
                    <p className="mobile-page-subtitle">Sign in to access your profile</p>
                </div>

                <div className="mobile-page-content">
                    <div className="mobile-empty-state" style={{ paddingTop: '80px' }}>
                        <div 
                            style={{
                                width: '96px',
                                height: '96px',
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '48px',
                                marginBottom: '24px',
                                margin: '0 auto 24px',
                                boxShadow: 'var(--md-elevation-3)'
                            }}
                        >
                            👤
                        </div>
                        <h2 style={{ 
                            fontSize: '24px', 
                            fontWeight: '600', 
                            color: 'var(--md-on-surface)', 
                            marginBottom: '8px',
                            textAlign: 'center'
                        }}>
                            Welcome to ScenicRoutes
                        </h2>
                        <p style={{ 
                            color: 'var(--md-on-surface-variant)', 
                            fontSize: '16px', 
                            marginBottom: '32px',
                            textAlign: 'center',
                            padding: '0 24px',
                            lineHeight: '1.5'
                        }}>
                            Sign in to save routes, track your rides, and unlock premium features
                        </p>
                        <button
                            className="mobile-button mobile-button-primary"
                            onClick={() => onOpenLogin?.()}
                            style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}
                        >
                            <FaUser style={{ marginRight: '8px' }} />
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mobile-page">
            <div className="mobile-page-header" style={{ textAlign: 'center' }}>
                <div 
                    style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: '700',
                        color: 'white',
                        marginBottom: '16px',
                        margin: '0 auto 16px',
                        boxShadow: 'var(--md-elevation-3)'
                    }}
                >
                    {getInitials(auth.user.name)}
                </div>
                <h1 className="mobile-page-title" style={{ textAlign: 'center' }}>{auth.user.name}</h1>
                <p className="mobile-page-subtitle" style={{ textAlign: 'center' }}>{auth.user.email}</p>
                {subscriptionBadge && (
                    <div 
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: subscriptionBadge.bg,
                            color: subscriptionBadge.color,
                            fontSize: '14px',
                            fontWeight: '600',
                            marginTop: '12px'
                        }}
                    >
                        <FaCrown style={{ fontSize: '14px' }} />
                        {subscriptionBadge.text}
                    </div>
                )}
            </div>

            <div className="mobile-page-content">
                <div className="mobile-section">
                    <button
                        className="mobile-button mobile-button-secondary"
                        onClick={() => navigate('/subscription')}
                        style={{ width: '100%', marginBottom: '16px' }}
                    >
                        <FaCrown style={{ marginRight: '8px', color: '#F59E0B' }} />
                        Manage Subscription
                    </button>
                </div>

                <div className="mobile-section">
                    <h2 className="mobile-section-title">Account</h2>
                    <div className="mobile-menu-list">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    className="mobile-menu-item"
                                    onClick={item.action}
                                    style={item.id === 'logout' ? { 
                                        color: item.color,
                                        border: `1px solid ${item.color}30`
                                    } : {}}
                                >
                                    <Icon 
                                        className="mobile-menu-item-icon" 
                                        style={{ color: item.color }}
                                    />
                                    <span className="mobile-menu-item-label">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
