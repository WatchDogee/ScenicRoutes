import React, { useState, useEffect } from 'react';
import WeatherDisplay from './WeatherDisplay';

/**
 * Component to display weather information for the current map location
 */
const MapWeatherDisplay = ({ mapCenter, units = 'metric' }) => {
    const [showWeather, setShowWeather] = useState(false);
    
    // Toggle weather display
    const toggleWeather = () => {
        setShowWeather(prev => !prev);
    };
    
    return (
        <div className="absolute top-4 right-4 z-10">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <button 
                    onClick={toggleWeather}
                    className="flex items-center justify-center p-2 w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>{showWeather ? 'Hide Weather' : 'Show Weather'}</span>
                </button>
                
                {showWeather && mapCenter && (
                    <div className="p-2">
                        <WeatherDisplay 
                            lat={mapCenter.lat} 
                            lon={mapCenter.lng} 
                            units={units}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapWeatherDisplay;
