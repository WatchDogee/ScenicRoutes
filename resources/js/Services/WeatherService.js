import axios from 'axios';

/**
 * Service for handling weather-related API calls
 */
class WeatherService {
    /**
     * Get current weather data for specific coordinates
     *
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} units - Units (metric or imperial)
     * @returns {Promise} - Promise with weather data
     */
    async getWeatherByCoordinates(lat, lon, units = 'metric') {
        try {
            console.log('Fetching weather data for coordinates:', { lat, lon, units });
            const response = await axios.get('/api/weather', {
                params: { lat, lon, units }
            });
            console.log('Weather data received:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching weather data:', error);
            if (error.response) {
                console.error('Response error data:', error.response.data);
                console.error('Response error status:', error.response.status);

                // If it's an API key issue, return a specific error object
                if (error.response.status === 401 ||
                    (error.response.data && error.response.data.error === 'OpenWeatherMap API key is invalid')) {
                    return {
                        error: 'api_key_invalid',
                        message: 'OpenWeatherMap API key is invalid or missing',
                        details: error.response.data
                    };
                }
            }
            return null;
        }
    }

    /**
     * Get weather forecast data for specific coordinates
     * Note: This is a placeholder for future implementation
     * The free tier of OpenWeatherMap API doesn't include forecast data
     *
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} units - Units (metric or imperial)
     * @param {number} days - Number of days to forecast
     * @returns {Promise} - Promise with forecast data
     */
    async getWeatherForecast(lat, lon, units = 'metric', days = 5) {
        try {
            console.log('Fetching weather forecast for coordinates:', { lat, lon, units, days });
            // This would be the actual API call when implemented
            // const response = await axios.get('/api/weather/forecast', {
            //     params: { lat, lon, units, days }
            // });

            // For now, return a placeholder message
            return {
                error: 'forecast_not_implemented',
                message: 'Weather forecast feature is not yet implemented',
                details: 'This feature will be available in a future update'
            };
        } catch (error) {
            console.error('Error fetching weather forecast:', error);
            return null;
        }
    }

    /**
     * Get weather data for a specific road
     *
     * @param {number} roadId - Road ID
     * @param {string} units - Units (metric or imperial)
     * @returns {Promise} - Promise with weather data
     */
    async getWeatherForRoad(roadId, units = 'metric') {
        try {
            console.log('Fetching weather data for road:', { roadId, units });
            const response = await axios.get(`/api/roads/${roadId}/weather`, {
                params: { units }
            });
            console.log('Road weather data received:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching road weather data:', error);
            if (error.response) {
                console.error('Response error data:', error.response.data);
                console.error('Response error status:', error.response.status);

                // If it's an API key issue, return a specific error object
                if (error.response.status === 401 ||
                    (error.response.data && error.response.data.error === 'OpenWeatherMap API key is invalid')) {
                    return {
                        error: 'api_key_invalid',
                        message: 'OpenWeatherMap API key is invalid or missing',
                        details: error.response.data
                    };
                }
            }
            return null;
        }
    }

    /**
     * Get weather icon URL
     *
     * @param {string} iconCode - Weather icon code
     * @param {string} size - Icon size (1x, 2x, 4x)
     * @returns {string} - Icon URL
     */
    getWeatherIconUrl(iconCode, size = '2x') {
        return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
    }

    /**
     * Format temperature with unit
     *
     * @param {number} temp - Temperature value
     * @param {string} unit - Temperature unit (°C or °F)
     * @returns {string} - Formatted temperature
     */
    formatTemperature(temp, unit = '°C') {
        return `${Math.round(temp)}${unit}`;
    }

    /**
     * Get a human-readable description of the weather
     *
     * @param {object} weather - Weather data object
     * @returns {string} - Weather description
     */
    getWeatherDescription(weather) {
        if (!weather || !weather.weather || !weather.weather.main) {
            return 'Weather data unavailable';
        }

        return weather.weather.description.charAt(0).toUpperCase() +
               weather.weather.description.slice(1);
    }
}

export default new WeatherService();
