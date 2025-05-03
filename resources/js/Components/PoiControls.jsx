import React from 'react';
import { FaMapMarkerAlt, FaGasPump, FaBolt, FaLayerGroup, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

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
                <div className="text-xs text-red-600 flex items-center mb-2">
                    <FaInfoCircle className="mr-1" /> No location selected. Click on the map first!
                </div>
            );
        }

        return (
            <div className="text-xs text-green-600 flex items-center mb-2">
                <FaInfoCircle className="mr-1" /> Location selected: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
            </div>
        );
    };

    return (
        <div className="poi-controls bg-white p-4 rounded-lg shadow-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3 flex items-center text-blue-700">
                <FaLayerGroup className="mr-2" /> Points of Interest
            </h3>

            {/* Display location info */}
            {getLocationInfo()}

            <div className="flex flex-col space-y-3 mb-4">
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors">
                    <input
                        type="checkbox"
                        checked={showTourism}
                        onChange={(e) => setShowTourism(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="flex items-center">
                        <FaMapMarkerAlt className="text-blue-500 mr-2" /> Tourism Attractions
                    </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer hover:bg-red-50 p-1 rounded transition-colors">
                    <input
                        type="checkbox"
                        checked={showFuelStations}
                        onChange={(e) => setShowFuelStations(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-red-600"
                    />
                    <span className="flex items-center">
                        <FaGasPump className="text-red-500 mr-2" /> Fuel Stations
                    </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer hover:bg-green-50 p-1 rounded transition-colors">
                    <input
                        type="checkbox"
                        checked={showChargingStations}
                        onChange={(e) => setShowChargingStations(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-green-600"
                    />
                    <span className="flex items-center">
                        <FaBolt className="text-green-500 mr-2" /> EV Charging Stations
                    </span>
                </label>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={handleFetchPois}
                    disabled={loading || !currentLocation}
                    className={`${!currentLocation ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded font-medium flex-1 flex items-center justify-center`}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                        </>
                    ) : 'Find POIs'}
                </button>

                <button
                    onClick={clearAllPois}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded font-medium"
                >
                    Clear
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="mt-3 text-xs text-red-600 flex items-center">
                    <FaExclamationTriangle className="mr-1 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="mt-3 text-xs text-gray-500">
                <p>Click on the map to set a location, then click "Find POIs" to search for points of interest nearby.</p>
            </div>
        </div>
    );
}
