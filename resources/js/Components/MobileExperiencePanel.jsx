import React from 'react';
import { FaRoute, FaDownload, FaPlay, FaSatelliteDish, FaMotorcycle, FaMicrophone } from 'react-icons/fa';

export default function MobileExperiencePanel({ auth, isOpen, onClose }) {
    if (!isOpen) return null;

    const name = auth?.user?.name || 'Explorer';

    const placeholderActions = [
        { icon: <FaPlay />, title: 'Route Recording', text: 'Capture rides with GPS, photos & notes.' },
        { icon: <FaDownload />, title: 'Offline Regions', text: 'Save scenic areas for offline navigation.' },
        { icon: <FaMotorcycle />, title: 'Bike Mode', text: 'Get lean angles, weather & speed overlays.' },
        { icon: <FaSatelliteDish />, title: 'Live AI Scout', text: 'Let AI suggest detours & hidden routes.' },
    ];

    const quickActions = [
        { icon: <FaRoute />, label: 'Smart Planner', description: 'AI curated scenic paths' },
        { icon: <FaMicrophone />, label: 'Voice Copilot', description: 'Hands-free commands' },
        { icon: <FaDownload />, label: 'Sync Devices', description: 'Pair headsets & smart dash' },
    ];

    return (
        <div className="mobile-experience-overlay">
            <div className="mobile-experience-panel">
                <div className="mobile-experience-header">
                    <div>
                        <p className="mobile-experience-subtitle">AI Scenic Assistant</p>
                        <h2>Hello, {name.split(' ')[0]} 👋</h2>
                        <p className="mobile-experience-description">
                            Plan, record & relive your adventures. These mobile-first tools keep everything at your fingertips.
                        </p>
                    </div>
                    <button className="mobile-header-button" onClick={onClose} aria-label="Close assistant">
                        ✕
                    </button>
                </div>

                <div className="mobile-experience-section">
                    <h3>Quick Actions</h3>
                    <div className="mobile-quick-actions">
                        {quickActions.map((action) => (
                            <button key={action.label} className="mobile-quick-action" type="button">
                                <div className="mobile-quick-action-icon">{action.icon}</div>
                                <div>
                                    <p>{action.label}</p>
                                    <span>{action.description}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mobile-experience-section">
                    <h3>Upcoming Mobile Features</h3>
                    <div className="mobile-feature-grid">
                        {placeholderActions.map((item) => (
                            <div className="mobile-feature-card" key={item.title}>
                                <div className="mobile-feature-icon">{item.icon}</div>
                                <div>
                                    <p className="mobile-feature-title">{item.title}</p>
                                    <p className="mobile-feature-text">{item.text}</p>
                                </div>
                                <button type="button" className="mobile-feature-pill">Coming Soon</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mobile-experience-footnote">
                    <p>Need something else? Tell the AI Copilot what you want to do next.</p>
                    <button className="mobile-button mobile-button-secondary" type="button">
                        Ask Scenic AI Copilot
                    </button>
                </div>
            </div>
        </div>
    );
}


































