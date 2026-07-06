import React from 'react';
import BottomSheet from './BottomSheet';
import { FaSearch } from 'react-icons/fa';

export default function SearchFiltersSheet({
    isOpen,
    onClose,
    radius,
    onRadiusChange,
    roadType,
    onRoadTypeChange,
    curvatureType,
    onCurvatureTypeChange,
    lengthFilter,
    onLengthFilterChange,
    measurementUnits = 'metric',
    onSearch,
    loading = false,
    markerPlaced = false
}) {
    const roadTypeOptions = [
        { value: 'all', label: 'All Roads' },
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' }
    ];

    const curvatureOptions = [
        { value: 'all', label: 'All Curves' },
        { value: 'curvy', label: 'Very Curved' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'mellow', label: 'Mellow' }
    ];

    const lengthOptions = [
        { value: 'all', label: 'All Lengths' },
        { value: 'short', label: 'Short' },
        { value: 'long', label: 'Long' }
    ];

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Find Curved Roads">
            {!markerPlaced && (
                <div className="mobile-card" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                    <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>
                        Tap on the map to place a marker and search for curved roads
                    </p>
                    <button className="btn-primary" style={{ width: '100%' }}>
                        Place Marker
                    </button>
                </div>
            )}

            {markerPlaced && (
                <>
                    {/* Search Radius */}
                    <div className="mobile-slider-container">
                        <div className="mobile-slider-label">
                            <span>Search Radius</span>
                            <span className="mobile-slider-value">
                                {radius} {measurementUnits === 'imperial' ? 'miles' : 'km'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={radius}
                            onChange={(e) => onRadiusChange(parseInt(e.target.value))}
                            className="mobile-slider"
                        />
                    </div>

                    {/* Filters */}
                    <div className="mobile-section">
                        <div className="mobile-section-title">Filters</div>
                        <div className="mobile-filter-pills">
                            <button
                                className={`mobile-filter-pill ${curvatureType !== 'all' ? 'active' : ''}`}
                                onClick={() => onCurvatureTypeChange(curvatureType === 'all' ? 'curvy' : 'all')}
                            >
                                Curves
                            </button>
                            <button
                                className={`mobile-filter-pill ${roadType !== 'all' ? 'active' : ''}`}
                                onClick={() => onRoadTypeChange(roadType === 'all' ? 'primary' : 'all')}
                            >
                                Road Type
                            </button>
                        </div>
                    </div>

                    {/* Road Length */}
                    <div className="mobile-section">
                        <div className="mobile-section-title">Road Length</div>
                        <div className="mobile-filter-pills">
                            {lengthOptions.filter(opt => opt.value !== 'all').map(option => (
                                <button
                                    key={option.value}
                                    className={`mobile-filter-pill ${lengthFilter === option.value ? 'active' : ''}`}
                                    onClick={() => onLengthFilterChange(lengthFilter === option.value ? 'all' : option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Button */}
                    <button
                        className="btn-primary"
                        onClick={onSearch}
                        disabled={loading || !markerPlaced}
                        style={{ 
                            width: '100%',
                            marginTop: 'var(--space-lg)',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        <FaSearch style={{ marginRight: 'var(--space-sm)' }} />
                        {loading ? 'Searching...' : 'Search Roads'}
                    </button>
                </>
            )}
        </BottomSheet>
    );
}


































