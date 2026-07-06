class WeatherService {

    async getWeatherByCoordinates(lat, lon, units = 'metric') {
        try {
            const response = await axios.get('/api/weather', {
                params: { lat, lon, units }
            });
            if (response.data && response.data.error) {
                return {
                    error: response.data.error,
                    message: response.data.message || 'Failed to fetch weather data'
                };
            }
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401 ||
                    (error.response.data && error.response.data.error === 'OpenWeatherMap API key is invalid')) {
                    return {
                        error: 'api_key_invalid',
                        message: 'OpenWeatherMap API key is invalid or missing',
                        details: error.response.data
                    };
                }
                return {
                    error: 'request_failed',
                    message: error.response.data?.message || 'Failed to fetch weather data'
                };
            }
            return {
                error: 'request_failed',
                message: 'Failed to connect to weather service'
            };
        }
    }

    async getWeatherForecast(lat, lon, units = 'metric', days = 5) {
        try {
            return {
                error: 'forecast_not_implemented',
                message: 'Weather forecast not available',
            };
        } catch (error) {
            return {
                error: 'request_failed',
                message: 'Failed to fetch forecast data'
            };
        }
    }

    async getWeatherForRoad(roadId, units = 'metric') {
        try {
            const response = await axios.get(`/api/roads/${roadId}/weather`, {
                params: { units }
            });
            if (response.data && response.data.error) {
                return {
                    error: response.data.error,
                    message: response.data.message || 'Failed to fetch weather data'
                };
            }
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 401 ||
                    (error.response.data && error.response.data.error === 'OpenWeatherMap API key is invalid')) {
                    return {
                        error: 'api_key_invalid',
                        message: 'OpenWeatherMap API key is invalid or missing',
                        details: error.response.data
                    };
                }
                return {
                    error: 'request_failed',
                    message: error.response.data?.message || 'Failed to fetch weather data'
                };
            }
            return {
                error: 'request_failed',
                message: 'Failed to connect to weather service'
            };
        }
    }

    getWeatherIconUrl(iconCode, size = '2x') {
        return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
    }

    formatTemperature(temp, unit = '°C') {
        return `${Math.round(temp)}${unit}`;
    }

    getWeatherDescription(weather) {
        if (!weather || !weather.weather || !weather.weather.main) {
            return 'Weather data unavailable';
        }
        return weather.weather.description.charAt(0).toUpperCase() +
               weather.weather.description.slice(1);
    }

    async clearWeatherCache(lat, lon, units = 'metric') {
        try {
            const response = await axios.post('/api/weather/clear-cache', { lat, lon, units });
            return response.data;
        } catch (error) {
            return { success: false, message: 'Failed to clear weather cache' };
        }
    }
 
    async clearAllWeatherCache() {
        try {
            const response = await axios.post('/api/weather/clear-cache', { all: true });
            return response.data;
        } catch (error) {
            return { success: false, message: 'Failed to clear all weather cache' };
        }
    }
}
export default new WeatherService();
