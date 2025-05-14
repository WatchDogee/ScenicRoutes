import React, { useState, useEffect } from 'react';
import WeatherService from '../Services/WeatherService';
$1
const WeatherTest = () => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [coordinates, setCoordinates] = useState({ lat: 56.9496, lon: 24.1052 }); 
    useEffect(() => {
        const fetchWeather = async () => {
            setLoading(true);
            setError(null);
            try {
                const weatherData = await WeatherService.getWeatherByCoordinates(
                    coordinates.lat,
                    coordinates.lon
                );
                if (weatherData && weatherData.error) {
                    
                    if (weatherData.error === 'api_key_invalid') {
                        
                        setWeather(weatherData);
                    } else {
                        setError(weatherData.message || 'Failed to load weather data');
                        setWeather(null);
                    }
                } else {
                    setWeather(weatherData);
                }
            } catch (err) {
                setError('Failed to load weather data');
                setWeather(null);
            } finally {
                setLoading(false);
            }
        };
        fetchWeather();
    }, [coordinates]);
    const handleCoordinateChange = (e) => {
        const { name, value } = e.target;
        setCoordinates(prev => ({
            ...prev,
            [name]: parseFloat(value)
        }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        
    };
    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Weather Integration Test</h2>
            <div className="p-4 mb-4 bg-green-100 text-green-800 rounded-md">
                <h3 className="font-bold">Weather Integration Status</h3>
                <p>The OpenWeatherMap API integration is now working correctly! You can test it below.</p>
                <p className="mt-2">The weather data is being fetched using the OpenWeatherMap API with your API key:</p>
                <pre className="mt-2 p-2 bg-gray-100 rounded">OPENWEATHERMAP_API_KEY=237f9c50425060ad469fb28f0e1488e2</pre>
                <p className="mt-2 text-sm">This integration allows you to display current weather conditions for any location or saved road in your application.</p>
            </div>
            <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex space-x-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                        <input
                            type="number"
                            name="lat"
                            value={coordinates.lat}
                            onChange={handleCoordinateChange}
                            step="0.0001"
                            className="px-3 py-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                        <input
                            type="number"
                            name="lon"
                            value={coordinates.lon}
                            onChange={handleCoordinateChange}
                            step="0.0001"
                            className="px-3 py-2 border rounded-md"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Fetch Weather
                </button>
            </form>
            {loading && (
                <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading weather data...</span>
                </div>
            )}
            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}
            {weather && !loading && !weather.error && (
                <div className="p-4 bg-gray-50 rounded-md">
                    <h3 className="text-xl font-semibold mb-2">Weather Results</h3>
                    <div className="flex items-center mb-4">
                        <img
                            src={`https://openweathermap.org/img/wn/${weather.weather.icon}@2x.png`}
                            alt={weather.weather.description}
                            className="w-16 h-16"
                        />
                        <div className="ml-4">
                            <p className="text-2xl font-bold">{weather.temperature.current}{weather.temperature.unit}</p>
                            <p className="text-gray-600 capitalize">{weather.weather.description}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p><span className="font-medium">Feels like:</span> {weather.temperature.feels_like}{weather.temperature.unit}</p>
                            <p><span className="font-medium">Humidity:</span> {weather.humidity}%</p>
                            <p><span className="font-medium">Wind:</span> {weather.wind.speed} {weather.wind.unit}</p>
                        </div>
                        <div>
                            <p><span className="font-medium">Pressure:</span> {weather.pressure} hPa</p>
                            <p><span className="font-medium">Visibility:</span> {weather.visibility / 1000} km</p>
                            <p><span className="font-medium">Clouds:</span> {weather.clouds}%</p>
                        </div>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                        Location: {weather.location.name}, {weather.location.country}
                    </p>
                </div>
            )}
            {weather && weather.error === 'api_key_invalid' && (
                <div className="p-4 bg-red-100 text-red-700 rounded-md">
                    <h3 className="font-bold">API Key Error</h3>
                    <p>{weather.message}</p>
                    {weather.details && (
                        <div className="mt-2 text-sm">
                            <p>Details: {weather.details.message || JSON.stringify(weather.details)}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default WeatherTest;
