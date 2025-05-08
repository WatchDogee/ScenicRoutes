import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Component to display weather forecast information
 * This is a placeholder for future implementation of multi-day forecasts
 */
const WeatherForecast = ({ roadId, lat, lon, units = 'metric', days = 3, className = '' }) => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // This is a placeholder for future implementation
    // Currently, the OpenWeatherMap API key used is for the free tier which doesn't include forecast data
    // This component is structured to be ready for implementation when the forecast API is available
    
    useEffect(() => {
        // Simulate loading state for demonstration
        setLoading(true);
        
        // Set a placeholder message after a short delay
        const timer = setTimeout(() => {
            setLoading(false);
            setError('Weather forecast feature coming soon');
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [roadId, lat, lon, units, days]);

    if (loading) {
        return (
            <div className={`weather-forecast ${className} p-3 bg-gray-50 rounded-md`}>
                <div className="animate-pulse flex flex-col space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="flex space-x-2">
                        {[...Array(days)].map((_, i) => (
                            <div key={i} className="flex-1 space-y-2 p-2 border border-gray-200 rounded">
                                <div className="h-10 bg-gray-200 rounded"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`weather-forecast ${className} p-3 bg-blue-50 rounded-md`}>
                <div className="text-center text-blue-800">
                    <p className="font-medium">{error}</p>
                    <p className="text-sm mt-1">
                        Multi-day weather forecasts will be available in a future update.
                    </p>
                </div>
            </div>
        );
    }

    // This would be the actual forecast display when implemented
    return (
        <div className={`weather-forecast ${className} p-3 bg-gray-50 rounded-md`}>
            <h3 className="font-medium text-gray-700 mb-2">{days}-Day Forecast</h3>
            <div className="flex space-x-2 overflow-x-auto">
                {forecast && forecast.daily && forecast.daily.slice(0, days).map((day, index) => (
                    <div key={index} className="flex-shrink-0 w-24 p-2 border border-gray-200 rounded text-center">
                        <div className="font-medium">{new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <img 
                            src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                            alt={day.weather[0].description}
                            className="w-10 h-10 mx-auto"
                        />
                        <div className="text-sm">
                            <span className="font-medium">{Math.round(day.temp.max)}°</span> / 
                            <span>{Math.round(day.temp.min)}°</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherForecast;
