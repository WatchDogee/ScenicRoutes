import React from 'react';
import WeatherTest from '../Components/WeatherTest';
import WeatherDisplay from '../Components/WeatherDisplay';
const WeatherTestPage = () => {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Weather Integration Testing</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Weather Test Component</h2>
                    <WeatherTest />
                </div>
                <div>
                    <h2 className="text-xl font-semibold mb-4">Weather Display Component</h2>
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h3 className="text-lg font-medium mb-4">By Coordinates</h3>
                        <div className="p-4 bg-gray-50 rounded-md mb-6">
                            <p className="mb-2">Coordinates: 56.9496, 24.1052 (Riga, Latvia)</p>
                            <WeatherDisplay lat={56.9496} lon={24.1052} />
                        </div>
                        <h3 className="text-lg font-medium mb-4">By Road ID</h3>
                        <div className="p-4 bg-gray-50 rounded-md">
                            <p className="mb-2">If you have a saved road, enter its ID below:</p>
                            <RoadWeatherTester />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RoadWeatherTester = () => {
    const [roadId, setRoadId] = React.useState('');
    const [showWeather, setShowWeather] = React.useState(false);
    const handleSubmit = (e) => {
        e.preventDefault();
        setShowWeather(true);
    };
    return (
        <div>
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={roadId}
                        onChange={(e) => setRoadId(e.target.value)}
                        placeholder="Enter Road ID"
                        className="px-3 py-2 border rounded-md flex-grow"
                    />
                    <button 
                        type="submit" 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={!roadId}
                    >
                        Show Weather
                    </button>
                </div>
            </form>
            {showWeather && roadId && (
                <div className="mt-4">
                    <WeatherDisplay roadId={roadId} />
                </div>
            )}
        </div>
    );
};
export default WeatherTestPage;
