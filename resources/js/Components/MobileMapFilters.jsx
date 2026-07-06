import React from 'react';
import { FaTag } from 'react-icons/fa';

export default function MobileMapFilters({
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
        <div className="mobile-filter-panel">
            {/* Search Radius */}
            <div className="mobile-filter-section">
                <div className="mobile-filter-label">
                    Search Radius: <span className="mobile-filter-value">{radius} {measurementUnits === 'imperial' ? 'miles' : 'km'}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={(e) => onRadiusChange(parseInt(e.target.value))}
                    className="mobile-slider"
                    style={{
                        '--range-progress': `${((radius - 1) / (50 - 1)) * 100}%`
                    }}
                />
            </div>

            {/* Filters - Pill Buttons */}
            <div className="mobile-filter-section">
                <div className="mobile-filter-label">Filters</div>
                <div className="mobile-filter-pills">
                    <button
                        className={`mobile-filter-pill ${curvatureType !== 'all' ? 'active' : ''}`}
                        onClick={() => {
                            const nextValue = curvatureType === 'all' ? 'curvy' : 'all';
                            onCurvatureTypeChange(nextValue);
                        }}
                    >
                        Curves
                    </button>
                    <button
                        className={`mobile-filter-pill ${roadType !== 'all' ? 'active' : ''}`}
                        onClick={() => {
                            const nextValue = roadType === 'all' ? 'primary' : 'all';
                            onRoadTypeChange(nextValue);
                        }}
                    >
                        Road Type
                        {roadType !== 'all' && (
                            <span className="mobile-filter-pill-badge">1</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Road Length - Pill Buttons */}
            <div className="mobile-filter-section">
                <div className="mobile-filter-label">Road Length</div>
                <div className="mobile-filter-pills">
                    {lengthOptions.filter(opt => opt.value !== 'all').map(option => (
                        <button
                            key={option.value}
                            className={`mobile-filter-pill ${lengthFilter === option.value ? 'active' : ''}`}
                            onClick={() => {
                                onLengthFilterChange(lengthFilter === option.value ? 'all' : option.value);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Button */}
            {markerPlaced && (
                <button
                    onClick={onSearch}
                    disabled={loading || !markerPlaced}
                    className={`mobile-search-button ${loading ? 'loading' : ''}`}
                >
                    {loading ? 'Searching...' : 'Search Roads'}
                </button>
            )}
        </div>
    );
}


































