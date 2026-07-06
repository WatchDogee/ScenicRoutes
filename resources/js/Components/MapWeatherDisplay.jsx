import React, { useState, useEffect } from 'react';
import WeatherDisplay from './WeatherDisplay';
import WeatherService from '../Services/WeatherService';

const MapWeatherDisplay = ({ mapCenter, units = 'metric', isDrawingMode = false, markerLocation = null }) => {
    const [showWeather, setShowWeather] = useState(false);
    const [expandedView, setExpandedView] = useState(false);
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const toggleWeather = () => {
        if (isDrawingMode) return;

        setShowWeather(prev => !prev);
        if (!showWeather) {
            fetchWeatherData();
        }
    };
    const toggleExpandedView = (e) => {
        e.stopPropagation();
        setExpandedView(prev => !prev);
    };
    const fetchWeatherData = async () => {
        const location = markerLocation || mapCenter;
        if (!location) return;

        setLoading(true);
        setError(null);
        try {
            const weatherData = await WeatherService.getWeatherByCoordinates(
                location.lat,
                location.lng,
                units
            );
            if (weatherData && weatherData.error) {
                setError(weatherData.error);
                setWeather(null);
            } else {
                setWeather(weatherData);
                setError(null);
            }
        } catch (err) {
            setError('Failed to load weather data');
            setWeather(null);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (showWeather) {
            if (markerLocation) {
                fetchWeatherData(); 
            } else if (!markerLocation && mapCenter) {
                fetchWeatherData(); 
            }
        }
    }, [markerLocation, units]); 

    useEffect(() => {
        if (!markerLocation && showWeather) {
            fetchWeatherData();
        }
    }, [markerLocation]);
    return (
        <div className="weather-display-container fixed z-[10000]" style={{
            position: 'fixed',
            top: '12rem', 
            right: '400px', 
            zIndex: 10000
        }}>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                    onClick={toggleWeather}
                    disabled={isDrawingMode}
                    className={`flex items-center justify-center p-2 w-full ${isDrawingMode ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '140px',
                        maxWidth: '140px',
                        height: '40px',
                        padding: '0.5rem 1rem',
                        fontSize: '14px',
                        border: '2px solid white',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        backgroundColor: isDrawingMode ? '#93c5fd' : '#3b82f6',
                        color: 'white',
                        opacity: isDrawingMode ? 0.6 : 1,
                        cursor: isDrawingMode ? 'not-allowed' : 'pointer'
                    }}
                    title={isDrawingMode ? "Disabled while in drawing mode" : (showWeather ? "Hide Weather" : "Show Weather")}
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>{showWeather ? 'Hide Weather' : 'Show Weather'}</span>
                </button>
                {showWeather && (
                    <div className="p-2">
                        {/* Basic weather display */}
                        <WeatherDisplay
                            lat={markerLocation ? markerLocation.lat : mapCenter.lat}
                            lon={markerLocation ? markerLocation.lng : mapCenter.lng}
                            units={units}
                        />
                        {/* Toggle for expanded view */}
                        <button
                            onClick={toggleExpandedView}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center w-full"
                        >
                            {expandedView ? 'Show Less' : 'Show More Details'}
                        </button>
                        {/* Expanded weather details */}
                        {expandedView && weather && (
                            <div className="mt-2 text-sm border-t pt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-gray-600">Humidity: {weather.humidity}%</p>
                                        <p className="text-gray-600">Wind: {weather.wind.speed} {weather.wind.unit}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Pressure: {weather.pressure} hPa</p>
                                        <p className="text-gray-600">Visibility: {(weather.visibility / 1000).toFixed(1)} km</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Location: {weather.location.name}, {weather.location.country}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
export default MapWeatherDisplay;
