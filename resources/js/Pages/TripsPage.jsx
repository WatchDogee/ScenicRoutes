import React, { useState } from 'react';
import { FaRoute, FaHistory, FaMap, FaPlus, FaClock } from 'react-icons/fa';

export default function TripsPage({ auth, onOpenLogin }) {
    const [activeTab, setActiveTab] = useState('saved');

    const mobileFeatures = [
        {
            id: 'route-recording',
            title: 'Route Recording',
            description: 'Record your rides and save them for later',
            icon: FaRoute,
            status: 'coming-soon',
            color: '#6750A4',
            gradient: 'linear-gradient(135deg, #667eea15, #764ba225)'
        },
        {
            id: 'ride-logbook',
            title: 'Ride Logbook',
            description: 'View your ride history and statistics',
            icon: FaHistory,
            status: 'coming-soon',
            color: '#EC4899',
            gradient: 'linear-gradient(135deg, #EC489915, #DB277725)'
        }
    ];

    return (
        <div className="mobile-page">
            <div className="mobile-page-header">
                <h1 className="mobile-page-title">Trips</h1>
                <p className="mobile-page-subtitle">Your saved routes and recordings</p>
            </div>

            {/* Swipeable Tabs */}
            <div className="mobile-tabs">
                <button
                    className={`mobile-tab ${activeTab === 'saved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('saved')}
                >
                    Saved Routes
                </button>
                <button
                    className={`mobile-tab ${activeTab === 'recordings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recordings')}
                >
                    Recordings
                </button>
            </div>

            <div className="mobile-page-content">
                {activeTab === 'saved' && (
                    <div className="mobile-section">
                        <div className="mobile-empty-state">
                            <FaMap style={{ fontSize: '64px', color: 'var(--md-outline-variant)', marginBottom: '16px' }} />
                            <h2 style={{ 
                                fontSize: '20px', 
                                fontWeight: '600', 
                                color: 'var(--md-on-surface)', 
                                marginBottom: '8px' 
                            }}>
                                No saved routes yet
                            </h2>
                            <p style={{ 
                                color: 'var(--md-on-surface-variant)', 
                                fontSize: '14px', 
                                marginBottom: '24px',
                                textAlign: 'center',
                                padding: '0 24px'
                            }}>
                                Plan a route and save it to see it here
                            </p>
                            <button
                                className="mobile-button mobile-button-primary"
                                onClick={() => {
                                    const event = new CustomEvent('mobile-plan-route');
                                    window.dispatchEvent(event);
                                }}
                                style={{ minWidth: '200px' }}
                            >
                                <FaPlus style={{ marginRight: '8px' }} />
                                Plan Your First Route
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'recordings' && (
                    <div className="mobile-section">
                        <div className="mobile-feature-grid">
                            {mobileFeatures.map((feature) => {
                                const Icon = feature.icon;
                                return (
                                    <div 
                                        key={feature.id} 
                                        className="mobile-feature-card"
                                        style={{
                                            border: `1px solid ${feature.color}20`,
                                            background: 'var(--md-surface)'
                                        }}
                                    >
                                        <div 
                                            className="mobile-feature-icon"
                                            style={{ 
                                                background: feature.gradient,
                                                width: '56px',
                                                height: '56px'
                                            }}
                                        >
                                            <Icon style={{ color: feature.color, fontSize: '28px' }} />
                                        </div>
                                        <div className="mobile-feature-content">
                                            <h3 className="mobile-feature-title" style={{ fontSize: '18px', fontWeight: '600' }}>
                                                {feature.title}
                                            </h3>
                                            <p className="mobile-feature-text">
                                                {feature.description}
                                            </p>
                                        </div>
                                        <button className="mobile-feature-pill" disabled>
                                            Coming Soon
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
