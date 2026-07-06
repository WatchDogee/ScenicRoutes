import React, { useState } from 'react';
import { FaRoute, FaUsers, FaMap, FaSearch, FaFilter, FaCompass } from 'react-icons/fa';

export default function ExplorePage({ auth, onOpenLogin }) {
    const [searchQuery, setSearchQuery] = useState('');

    const exploreCards = [
        {
            id: 'curvy-roads',
            title: 'Find Curvy Roads',
            description: 'Discover the most scenic and winding routes',
            icon: FaRoute,
            color: '#6750A4',
            gradient: 'linear-gradient(135deg, #667eea15, #764ba225)',
            action: () => {
                const event = new CustomEvent('mobile-find-roads');
                window.dispatchEvent(event);
            }
        },
        {
            id: 'community',
            title: 'Community Roads',
            description: 'Explore roads shared by other riders',
            icon: FaUsers,
            color: '#10B981',
            gradient: 'linear-gradient(135deg, #10B98115, #05966925)',
            requiresAuth: true,
            action: () => {
                if (auth?.user) {
                    const event = new CustomEvent('mobile-open-community');
                    window.dispatchEvent(event);
                } else {
                    onOpenLogin?.();
                }
            }
        },
        {
            id: 'collections',
            title: 'Collections',
            description: 'Browse curated road collections',
            icon: FaMap,
            color: '#EC4899',
            gradient: 'linear-gradient(135deg, #EC489915, #DB277725)',
            requiresAuth: true,
            action: () => {
                if (auth?.user) {
                    const event = new CustomEvent('mobile-open-collections');
                    window.dispatchEvent(event);
                } else {
                    onOpenLogin?.();
                }
            }
        }
    ];

    return (
        <div className="mobile-page">
            <div className="mobile-page-header">
                <h1 className="mobile-page-title">Explore</h1>
                <p className="mobile-page-subtitle">Discover amazing roads and routes</p>
            </div>

            <div className="mobile-page-content">
                {/* Large, Prominent Search Bar */}
                <div className="mobile-search-bar">
                    <FaSearch className="mobile-search-icon" />
                    <input
                        type="text"
                        className="mobile-search-input"
                        placeholder="Search roads, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="mobile-filter-button" aria-label="Filter">
                        <FaFilter />
                    </button>
                </div>

                {/* Large Action Cards - Full Width, Easy to Tap */}
                <div className="mobile-explore-grid">
                    {exploreCards.map((card) => {
                        const Icon = card.icon;
                        const isDisabled = card.requiresAuth && !auth?.user;
                        
                        return (
                            <button
                                key={card.id}
                                className={`mobile-explore-card ${isDisabled ? 'disabled' : ''}`}
                                onClick={card.action}
                                disabled={isDisabled}
                                style={{
                                    border: `1px solid ${card.color}20`,
                                    background: isDisabled ? 'var(--md-surface-variant)' : 'var(--md-surface)'
                                }}
                            >
                                <div 
                                    className="mobile-explore-card-icon"
                                    style={{ 
                                        background: card.gradient,
                                        width: '64px',
                                        height: '64px'
                                    }}
                                >
                                    <Icon style={{ color: card.color, fontSize: '32px' }} />
                                </div>
                                <div className="mobile-explore-card-content">
                                    <h3 className="mobile-explore-card-title" style={{ fontSize: '18px', fontWeight: '600' }}>
                                        {card.title}
                                    </h3>
                                    <p className="mobile-explore-card-description">
                                        {card.description}
                                    </p>
                                </div>
                                {isDisabled && (
                                    <div className="mobile-explore-card-badge">Sign in required</div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Popular Section */}
                <div className="mobile-section">
                    <h2 className="mobile-section-title">Popular This Week</h2>
                    <div className="mobile-empty-state">
                        <FaCompass style={{ fontSize: '64px', color: 'var(--md-outline-variant)', marginBottom: '16px' }} />
                        <p style={{ color: 'var(--md-on-surface-variant)', fontSize: '16px', fontWeight: '500' }}>
                            No popular roads yet
                        </p>
                        <p style={{ color: 'var(--md-on-surface-variant)', fontSize: '14px', marginTop: '8px' }}>
                            Check back later for trending routes
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
