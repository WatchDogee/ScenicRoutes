import React, { useState, useEffect } from 'react';
import { FaBars, FaSearch, FaPlus, FaMapMarkerAlt, FaEllipsisV, FaLayerGroup, FaLocationArrow } from 'react-icons/fa';
import ActionMenu from './ActionMenu';
import SearchFiltersSheet from './SearchFiltersSheet';
import Map from '../Pages/Map';

export default function NewMobileMapScreen({ auth, onLogin, onLogout }) {
    const [actionMenuOpen, setActionMenuOpen] = useState(false);
    const [searchSheetOpen, setSearchSheetOpen] = useState(false);
    const [findRoadsMode, setFindRoadsMode] = useState(false);
    const [radius, setRadius] = useState(20);
    const [roadType, setRoadType] = useState('all');
    const [curvatureType, setCurvatureType] = useState('all');
    const [lengthFilter, setLengthFilter] = useState('all');
    const [markerPlaced, setMarkerPlaced] = useState(false);
    const [loading, setLoading] = useState(false);

    // Placeholder route stats for now – can be wired to real data from Map later
    const [routeDistanceKm] = useState(42.1);
    const [routeDurationMin] = useState(38);

    // Prevent old drawer from opening - block all drawer events
    useEffect(() => {
        const blockDrawerEvents = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        };

        window.addEventListener('mobile-open-drawer', blockDrawerEvents, true);

        const drawerElements = document.querySelectorAll('.mobile-drawer, .mobile-drawer-overlay');
        drawerElements.forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.pointerEvents = 'none';
            }
        });

        return () => {
            window.removeEventListener('mobile-open-drawer', blockDrawerEvents, true);
        };
    }, []);

    const handleFindRoads = () => {
        setFindRoadsMode(true);
        setSearchSheetOpen(true);
    };

    const handlePlanRoute = () => {
        console.log('Plan route');
    };

    const handleRecordRide = () => {
        console.log('Record ride');
    };

    const handleSearch = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 2000);
    };

    return (
        <>
            {/* Force hide ALL legacy UI - completely remove old elements */}
            <style>{`
                /* Hide old drawer completely */
                .mobile-drawer,
                .mobile-drawer-overlay,
                .mobile-drawer.open,
                [class*="mobile-drawer"],
                .mobile-header:not(.kurviger-top-card),
                .mobile-bottom-nav:not(.mobile-bottom-nav-new),
                .mobile-appbar,
                .mobile-shell,
                .mobile-status-row,
                .status-chip,
                .mobile-map-card,
                .mobile-quick-actions {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    opacity: 0 !important;
                    transform: translateX(-100%) !important;
                    z-index: -9999 !important;
                }
                
                /* Ensure Kurviger shell takes full screen */
                .kurviger-shell {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    overflow: hidden !important;
                }
                
                /* Hide any white overlays or cards from old UI */
                .mobile-card,
                .mobile-map-section,
                [class*="mobile-shell"]:not(.kurviger-shell) {
                    display: none !important;
                }
            `}</style>

            <div className="kurviger-shell" style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 1
            }}>
                {/* Map fills the background */}
                <div className="kurviger-map-container" style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#e5e7eb',
                    zIndex: 1
                }}>
                    <Map
                        auth={auth}
                        onLogin={onLogin}
                        onLogout={onLogout}
                        isMobile={true}
                    />
                </div>

                {/* Top control card – mimicking Kurviger */}
                <div className="kurviger-top-card" style={{ zIndex: 100 }}>
                        {/* Row 1: logo, search, menu */}
                        <div className="kurviger-top-row">
                            <button
                                className="kurviger-logo-button"
                                aria-label="ScenicRoutes home"
                            >
                                <span className="kurviger-logo-emoji">🗺️</span>
                            </button>

                            <button
                                className="kurviger-search-field"
                                onClick={() => setSearchSheetOpen(true)}
                            >
                                <FaSearch className="kurviger-search-icon" />
                                <span className="kurviger-search-placeholder">Search location</span>
                            </button>

                            <button
                                className="kurviger-icon-button"
                                aria-label="More options"
                            >
                                <FaEllipsisV />
                            </button>
                        </div>

                        {/* Row 2: origin + distance/time chips */}
                        <div className="kurviger-middle-row">
                            <button
                                className="kurviger-origin-field"
                                onClick={() => setSearchSheetOpen(true)}
                            >
                                <FaMapMarkerAlt className="kurviger-origin-icon" />
                                <span>Start point</span>
                            </button>
                            <div className="kurviger-chip-row">
                                <span className="kurviger-chip">
                                    {routeDistanceKm.toFixed(2)} km
                                </span>
                                <span className="kurviger-chip">
                                    {routeDurationMin} min
                                </span>
                            </div>
                        </div>

                        {/* Row 3: curvature / avoidances / info */}
                        <div className="kurviger-bottom-row">
                            <button
                                className="kurviger-primary-button"
                                onClick={handleFindRoads}
                            >
                                <span className="kurviger-primary-label">Curvature</span>
                            </button>
                            <button
                                className="kurviger-primary-button"
                                onClick={handlePlanRoute}
                            >
                                <span className="kurviger-primary-label">Avoidances</span>
                            </button>
                            <button
                                className="kurviger-icon-button light"
                                aria-label="Route info"
                                onClick={handleRecordRide}
                            >
                                i
                            </button>
                        </div>
                </div>

                {/* Right-side FAB stack */}
                <div className="kurviger-fab-column" style={{ zIndex: 90 }}>
                        <button
                            className="kurviger-fab"
                            aria-label="Map layers"
                        >
                            <FaLayerGroup />
                        </button>
                        <button
                            className="kurviger-fab"
                            aria-label="Center on my location"
                        >
                            <FaLocationArrow />
                        </button>
                        <button
                            className="kurviger-fab primary"
                            aria-label="Main actions"
                            onClick={() => setActionMenuOpen(true)}
                        >
                            <FaPlus />
                        </button>
                </div>

                {/* Optional bottom banner – simple placeholder */}
                <div className="kurviger-bottom-banner" style={{ zIndex: 80 }}>
                        <div className="kurviger-bottom-text">
                            <div className="kurviger-bottom-title">Scenic Roundtrips</div>
                            <div className="kurviger-bottom-subtitle">Discover curated routes nearby</div>
                        </div>
                        <div className="kurviger-bottom-actions">
                            <button className="kurviger-bottom-pill">Explore</button>
                            <button className="kurviger-bottom-pill secondary">Premium</button>
                        </div>
                </div>
            </div>

            <ActionMenu
                isOpen={actionMenuOpen}
                onClose={() => setActionMenuOpen(false)}
                onFindRoads={handleFindRoads}
                onPlanRoute={handlePlanRoute}
                onRecordRide={handleRecordRide}
            />

            <SearchFiltersSheet
                isOpen={searchSheetOpen}
                onClose={() => {
                    setSearchSheetOpen(false);
                    setFindRoadsMode(false);
                }}
                radius={radius}
                onRadiusChange={setRadius}
                roadType={roadType}
                onRoadTypeChange={setRoadType}
                curvatureType={curvatureType}
                onCurvatureTypeChange={setCurvatureType}
                lengthFilter={lengthFilter}
                onLengthFilterChange={setLengthFilter}
                measurementUnits="metric"
                onSearch={handleSearch}
                loading={loading}
                markerPlaced={markerPlaced}
            />
        </>
    );
}

