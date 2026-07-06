import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaMap, FaCompass, FaRoute, FaUser } from 'react-icons/fa';

export default function MobileBottomNav({ auth }) {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/map' || path === '/') {
            return location.pathname === '/map' || location.pathname === '/';
        }
        return location.pathname === path;
    };

    const navItems = [
        {
            path: '/map',
            label: 'Map',
            icon: FaMap
        },
        {
            path: '/explore',
            label: 'Explore',
            icon: FaCompass
        },
        {
            path: '/trips',
            label: 'Trips',
            icon: FaRoute
        },
        {
            path: '/profile',
            label: auth?.user ? 'Profile' : 'Sign In',
            icon: FaUser
        }
    ];

    const handleNavClick = (path) => {
        if (path === '/profile' && !auth?.user) {
            const event = new CustomEvent('mobile-open-login');
            window.dispatchEvent(event);
        } else {
            navigate(path);
        }
    };

    return (
        <nav className="mobile-bottom-nav">
            {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                    <button
                        key={item.path}
                        className={`mobile-nav-item ${active ? 'active' : ''}`}
                        onClick={() => handleNavClick(item.path)}
                    >
                        <Icon className="mobile-nav-item-icon" />
                        <span className="mobile-nav-item-label">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

