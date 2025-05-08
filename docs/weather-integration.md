# Weather Integration for Scenic Routes

This document provides information on how to set up and use the weather integration feature in the Scenic Routes application.

## Overview

The weather integration feature allows users to see current weather conditions for saved roads. The implementation uses the OpenWeatherMap API to fetch real-time weather data based on the road's coordinates.

## Features

- Display current weather conditions (temperature, weather description, icon) on road cards
- Weather data is cached to minimize API calls
- Supports both metric and imperial units based on user preferences
- Automatically uses the middle point of a road to determine weather location

## Setup Instructions

### 1. Get an OpenWeatherMap API Key

1. Sign up for a free account at [OpenWeatherMap](https://openweathermap.org/api)
2. Generate an API key from your account dashboard
3. The free tier allows up to 1,000 API calls per day, which should be sufficient for most use cases

### 2. Configure Environment Variables

Add your API key to the following environment files:

- `.env` (for local development)
- `.env.production` (for production)

```
OPENWEATHERMAP_API_KEY=your_api_key_here
```

### 3. Clear Configuration Cache (if needed)

If you're updating an existing installation, clear the configuration cache:

```bash
php artisan config:clear
```

## Usage

### In Road Cards

The weather information is automatically displayed on road cards when the `showWeather` prop is set to `true` (default). The weather display shows:

- Current temperature (in °C or °F based on user settings)
- Weather condition icon
- Brief weather description

### Customizing Weather Display

You can customize the weather display by modifying the `WeatherDisplay` component:

- Change the layout in `resources/js/Components/WeatherDisplay.jsx`
- Adjust styling using Tailwind CSS classes
- Add additional weather information if needed

### Disabling Weather Display

To disable weather display for specific road cards, set the `showWeather` prop to `false`:

```jsx
<RoadCard 
  road={road}
  showWeather={false}
  // other props...
/>
```

## API Endpoints

The following API endpoints are available for weather data:

### Get Weather by Coordinates

```
GET /api/weather
```

Parameters:
- `lat` (required): Latitude
- `lon` (required): Longitude
- `units` (optional): Units format ('metric' or 'imperial', defaults to 'metric')

### Get Weather for a Road

```
GET /api/roads/{id}/weather
```

Parameters:
- `id` (required): Road ID
- `units` (optional): Units format ('metric' or 'imperial', defaults to user preference)

## Caching

Weather data is cached for 60 minutes by default to minimize API calls. You can adjust the cache duration by modifying the `$cacheDuration` property in the `WeatherService` class.

## Troubleshooting

### Weather Not Displaying

1. Check that you have a valid OpenWeatherMap API key in your environment
2. Verify that the road has valid coordinates
3. Check browser console for any API errors
4. Ensure the road ID is being correctly passed to the WeatherDisplay component

### API Rate Limiting

If you encounter rate limiting issues:

1. Increase the cache duration in the WeatherService
2. Consider upgrading to a paid OpenWeatherMap plan for more API calls
3. Implement a queue system for weather updates during peak usage

## Future Enhancements

Potential future enhancements for the weather integration:

1. Add weather forecast for upcoming days
2. Display weather along the entire route (multiple points)
3. Add weather-based route recommendations
4. Implement weather alerts for severe conditions
