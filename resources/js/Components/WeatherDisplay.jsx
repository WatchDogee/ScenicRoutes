import React, { useState, useEffect } from 'react';
import WeatherService from '../Services/WeatherService';

/**
 * Component to display weather information
 */
const WeatherDisplay = ({ roadId, lat, lon, units = 'metric', className = '' }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async () => {
            setLoading(true);
            setError(null);

            try {
                let weatherData;

                if (roadId) {
                    console.log('WeatherDisplay: Fetching weather for road ID:', roadId);

                    // Fetch weather for a specific road
                    weatherData = await WeatherService.getWeatherForRoad(roadId, units);
                    console.log('WeatherDisplay: Road weather data received:', weatherData);

                    if (weatherData && weatherData.error) {
                        console.error('WeatherDisplay: Weather error:', weatherData.message);
                        setError(weatherData.error);
                    } else if (weatherData && weatherData.weather) {
                        setWeather(weatherData.weather);
                    } else {
                        console.error('WeatherDisplay: Invalid road weather data format:', weatherData);
                        setError('Invalid weather data format');
                    }
                } else if (lat && lon) {
                    console.log('WeatherDisplay: Fetching weather for coordinates:', { lat, lon });
                    // Fetch weather for specific coordinates
                    weatherData = await WeatherService.getWeatherByCoordinates(lat, lon, units);
                    console.log('WeatherDisplay: Coordinate weather data received:', weatherData);

                    if (weatherData && weatherData.error) {
                        console.error('WeatherDisplay: Weather error:', weatherData.message);
                        setError(weatherData.error);
                    } else if (weatherData) {
                        setWeather(weatherData);
                    } else {
                        console.error('WeatherDisplay: No weather data received for coordinates');
                        setError('Failed to load weather data');
                    }
                } else {
                    console.error('WeatherDisplay: No location provided');
                    setError('No location provided for weather');
                }
            } catch (err) {
                console.error('WeatherDisplay: Error fetching weather:', err);
                setError('Failed to load weather data: ' + (err.message || 'Unknown error'));
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [roadId, lat, lon, units]);

    if (loading) {
        return (
            <div className={`weather-display ${className} flex items-center justify-center p-2`}>
                <div className="animate-pulse text-gray-400">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>Loading weather...</span>
                </div>
            </div>
        );
    }

    if (error || !weather) {
        // Show a small error indicator instead of nothing
        if (error === 'weather_unavailable') {
            return (
                <div className={`weather-display ${className} flex items-center p-2 text-xs text-gray-400`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Weather unavailable</span>
                </div>
            );
        } else if (error === 'login_required') {
            return (
                <div className={`weather-display ${className} flex items-center p-2 text-xs text-blue-500`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Login for weather</span>
                </div>
            );
        } else {
            return (
                <div className={`weather-display ${className} flex items-center p-2 text-xs text-gray-400`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Weather unavailable</span>
                </div>
            );
        }
    }

    const iconUrl = WeatherService.getWeatherIconUrl(weather.weather.icon);
    const tempUnit = weather.temperature.unit;
    const temp = Math.round(weather.temperature.current);
    const description = weather.weather.description;

    return (
        <div className={`weather-display ${className} flex items-center p-2 rounded-md bg-gray-50`}>
            <img
                src={iconUrl}
                alt={description}
                className="w-10 h-10"
                title={description}
            />
            <div className="ml-2">
                <div className="font-semibold">{temp}{tempUnit}</div>
                <div className="text-xs text-gray-600 capitalize">{description}</div>
            </div>
        </div>
    );
};

export default WeatherDisplay;
