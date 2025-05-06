import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaGasPump, FaBolt, FaLayerGroup, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export default function PoiControls({
    showTourism,
    showFuelStations,
    showChargingStations,
    setShowTourism,
    setShowFuelStations,
    setShowChargingStations,
    fetchAllPois,
    clearAllPois,
    loading,
    currentLocation,
    error
}) {
    // Always show content, no collapse functionality
    const [isVisible, setIsVisible] = useState(true);
    const prevLocationRef = useRef(null);

    // Store the previous location to prevent unnecessary re-renders
    useEffect(() => {
        prevLocationRef.current = currentLocation;
    }, [currentLocation]);
    const handleFetchPois = () => {
        if (!currentLocation) {
            alert('Please select a location on the map first by clicking anywhere on the map!');
            return;
        }

        console.log('Fetching POIs at location:', currentLocation);
        fetchAllPois(currentLocation.lat, currentLocation.lon);
    };

    // Helper function to display location info
    const getLocationInfo = () => {
        if (!currentLocation) {
            return (
                <div className="text-xs text-red-600 flex items-center mb-2 bg-red-50 p-1 rounded">
                    <FaInfoCircle className="mr-1" /> Click map to set location
                </div>
            );
        }

        return (
            <div className="text-xs text-green-600 flex items-center mb-2 bg-green-50 p-1 rounded">
                <FaMapMarkerAlt className="mr-1" /> Loc: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
            </div>
        );
    };

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="bg-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors flex items-center"
                title="Show POI Controls"
            >
                <FaLayerGroup className="mr-2 text-blue-500" /> Show POIs
            </button>
        );
    }

    return (
        <div className="poi-controls bg-white rounded-lg shadow-md" onClick={(e) => e.stopPropagation()}>
            {/* Header with controls */}
            <div className="p-2 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-sm font-semibold flex items-center text-gray-700">
                    <FaLayerGroup className="mr-1 text-blue-500" /> Points of Interest
                </h3>
                <div className="flex space-x-1">
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Hide"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>
            </div>

            {/* Content (always visible) */}
            <div className="p-3">
                {/* Display location info */}
                {getLocationInfo()}

                <div className="flex flex-col space-y-2 mb-3">
                    <label className="flex items-center cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors text-sm">
                        <input
                            type="checkbox"
                            checked={showTourism}
                            onChange={(e) => setShowTourism(e.target.checked)}
                            className="form-checkbox h-3 w-3 text-blue-600 mr-1"
                        />
                        <FaMapMarkerAlt className="text-blue-500 mr-1 text-xs" />
                        <span>Tourism</span>
                    </label>

                    <label className="flex items-center cursor-pointer hover:bg-red-50 p-1 rounded transition-colors text-sm">
                        <input
                            type="checkbox"
                            checked={showFuelStations}
                            onChange={(e) => setShowFuelStations(e.target.checked)}
                            className="form-checkbox h-3 w-3 text-red-600 mr-1"
                        />
                        <FaGasPump className="text-red-500 mr-1 text-xs" />
                        <span>Fuel</span>
                    </label>

                    <label className="flex items-center cursor-pointer hover:bg-green-50 p-1 rounded transition-colors text-sm">
                        <input
                            type="checkbox"
                            checked={showChargingStations}
                            onChange={(e) => setShowChargingStations(e.target.checked)}
                            className="form-checkbox h-3 w-3 text-green-600 mr-1"
                        />
                        <FaBolt className="text-green-500 mr-1 text-xs" />
                        <span>EV Charging</span>
                    </label>
                </div>

                <div className="flex space-x-1 mb-2">
                    <button
                        onClick={handleFetchPois}
                        disabled={loading || !currentLocation}
                        className={`${!currentLocation ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1 rounded text-sm flex-1 flex items-center justify-center`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                            </>
                        ) : 'Find POIs'}
                    </button>

                    <button
                        onClick={clearAllPois}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded text-sm"
                    >
                        Clear
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div className="text-xs text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1 flex-shrink-0 text-xs" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="text-xs text-gray-500">
                    <p>Click map to set location, then find POIs.</p>
                </div>
            </div>
        </div>
    );
}
