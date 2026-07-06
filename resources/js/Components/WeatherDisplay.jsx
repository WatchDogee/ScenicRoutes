import React, { useState, useEffect, useCallback } from 'react';
import WeatherService from '../Services/WeatherService';

const WeatherDisplay = ({ roadId, lat, lon, units = 'metric', className = '' }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const fetchWeather = useCallback(async (skipCache = false) => {
        setLoading(true);
        setError(null);
        try {
            let weatherData;
            if (skipCache) {
                setRefreshing(true);
                if (roadId) {
                    const roadData = await WeatherService.getWeatherForRoad(roadId, units);
                    if (roadData && roadData.coordinates) {
                        await WeatherService.clearWeatherCache(
                            roadData.coordinates.lat,
                            roadData.coordinates.lon,
                            units
                        );
                    }
                } else if (lat && lon) {
                    await WeatherService.clearWeatherCache(lat, lon, units);
                }
            }

            if (roadId) {
                weatherData = await WeatherService.getWeatherForRoad(roadId, units);
            } else if (lat && lon) {
                weatherData = await WeatherService.getWeatherByCoordinates(lat, lon, units);
            } else {
                setError('No location provided for weather');
                setLoading(false);
                return;
            }

            if (weatherData && weatherData.error) {
                setError(weatherData.error);
                setWeather(null);
            } else if (weatherData) {
                setWeather(weatherData);
                setError(null);
            } else {
                setError('Failed to load weather data');
                setWeather(null);
            }
        } catch (err) {
            setError('Failed to load weather data: ' + (err.message || 'Unknown error'));
            setWeather(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [roadId, lat, lon, units]);
    const refreshWeather = useCallback(() => {
        fetchWeather(true);
    }, [fetchWeather]);
    useEffect(() => {
        fetchWeather();
    }, [fetchWeather]);
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
        if (error === 'api_key_invalid') {
            return (
                <div className={`weather-display ${className} flex items-center p-2 text-xs text-blue-500`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Weather API key required</span>
                </div>
            );
        }
        return (
            <div className={`weather-display ${className} flex items-center p-2 text-xs text-gray-400`}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Weather unavailable</span>
            </div>
        );
    }
    const iconUrl = WeatherService.getWeatherIconUrl(weather.weather.icon);
    const tempUnit = weather.temperature.unit;
    const temp = Math.round(weather.temperature.current);
    const description = weather.weather.description;
    return (
        <div className={`weather-display ${className} flex items-center p-2 rounded-md bg-gray-50 relative group`}>
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
            {/* Refresh button */}
            <button
                onClick={refreshWeather}
                disabled={refreshing}
                className={`absolute top-1 right-1 p-1 rounded-full
                    ${refreshing ? 'opacity-100 bg-blue-100' : 'opacity-0 bg-gray-100 group-hover:opacity-100'}
                    transition-opacity duration-200 text-xs`}
                title="Refresh weather data"
            >
                <svg
                    className={`w-3 h-3 ${refreshing ? 'animate-spin text-blue-500' : 'text-gray-500'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            </button>
        </div>
    );
};
export default WeatherDisplay;
