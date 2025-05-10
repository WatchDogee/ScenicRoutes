import React, { useState, useEffect } from 'react';
import WeatherDisplay from './WeatherDisplay';
import WeatherService from '../Services/WeatherService';

/**
 * Enhanced component to display weather information for the current map location
 * with additional weather details
 */
const MapWeatherDisplay = ({ mapCenter, units = 'metric' }) => {
    const [showWeather, setShowWeather] = useState(false);
    const [expandedView, setExpandedView] = useState(false);
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Toggle weather display
    const toggleWeather = () => {
        setShowWeather(prev => !prev);
        if (!showWeather && mapCenter) {
            fetchWeatherData();
        }
    };

    // Toggle expanded view
    const toggleExpandedView = (e) => {
        e.stopPropagation();
        setExpandedView(prev => !prev);
    };

    // Fetch weather data directly
    const fetchWeatherData = async () => {
        if (!mapCenter) return;

        setLoading(true);
        setError(null);

        try {
            const weatherData = await WeatherService.getWeatherByCoordinates(
                mapCenter.lat,
                mapCenter.lng,
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
            console.error('Error fetching weather in MapWeatherDisplay:', err);
            setError('Failed to load weather data');
            setWeather(null);
        } finally {
            setLoading(false);
        }
    };

    // Update weather when map center changes
    useEffect(() => {
        if (showWeather && mapCenter) {
            fetchWeatherData();
        }
    }, [mapCenter, units]);

    return (
        <div className="weather-display-container fixed z-[10000]" style={{
            position: 'fixed',
            top: '12rem', /* Position below the social button */
            right: '400px', /* Position to the left of community panel */
            zIndex: 10000
        }}>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                    onClick={toggleWeather}
                    className="flex items-center justify-center p-2 w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
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
                        backgroundColor: '#3b82f6', /* Blue-500 */
                        color: 'white'
                    }}
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>{showWeather ? 'Hide Weather' : 'Show Weather'}</span>
                </button>

                {showWeather && mapCenter && (
                    <div className="p-2">
                        {/* Basic weather display */}
                        <WeatherDisplay
                            lat={mapCenter.lat}
                            lon={mapCenter.lng}
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
