import React from 'react';
import ProfilePicture from './ProfilePicture';
import { useContext } from 'react';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
import { withErrorBoundary } from './ErrorBoundary';

function RoadCard({
    road,
    onViewMap,
    onNavigate,
    onViewDetails,
    showUser = true,
    showActions = true,
    className = ''
}) {
    const { userSettings } = useContext(UserSettingsContext);
    const formatLength = (meters) => {
        if (userSettings?.measurement_units === 'imperial') {
            return ((meters / 1000) * 0.621371).toFixed(2) + ' miles';
        }
        return (meters / 1000).toFixed(2) + ' km';
    };

    const formatElevation = (meters) => {
        if (!meters && meters !== 0) return 'N/A';
        if (userSettings?.measurement_units === 'imperial') {
            return Math.round(meters * 3.28084) + ' ft';
        }
        return Math.round(meters) + ' m';
    };

    const getTwistinessLabel = (twistiness) => {
        if (twistiness > 0.007) return 'Very Curvy';
        if (twistiness > 0.0035) return 'Moderately Curvy';
        return 'Mellow';
    };

    const getAverageRating = () => {
        // Check if average_rating or reviews_avg_rating exists and is a number
        const rating = road.average_rating || road.reviews_avg_rating;
        if (rating !== undefined && rating !== null && !isNaN(parseFloat(rating))) {
            return parseFloat(rating).toFixed(1);
        }

        // Calculate from reviews if available
        if (road.reviews && Array.isArray(road.reviews) && road.reviews.length > 0) {
            const sum = road.reviews.reduce((total, review) => {
                const reviewRating = parseFloat(review.rating);
                return total + (isNaN(reviewRating) ? 0 : reviewRating);
            }, 0);
            return (sum / road.reviews.length).toFixed(1);
        }

        return 'No ratings';
    };

    return (
        <div className={`border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors ${className}`}>
            <h3 className="font-semibold text-lg">{road.road_name}</h3>

            {showUser && road.user && (
                <div className="flex items-center mt-2 space-x-2">
                    <ProfilePicture user={road.user} size="sm" />
                    <div>
                        <span className="text-sm text-gray-600">
                            Added by <span className="font-medium hover:text-blue-600 cursor-pointer">{road.user.name || 'Unknown User'}</span>
                        </span>
                        {road.created_at && (
                            <p className="text-xs text-gray-500">
                                {new Date(road.created_at).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-4">
                <div className="text-sm">
                    <p>Length: {formatLength(road.length)}</p>
                    <p>Corners: {road.corner_count}</p>
                    <p>Curve Rating: {getTwistinessLabel(road.twistiness)}</p>
                    <p>Elevation Gain: {formatElevation(road.elevation_gain)} ↑</p>
                    <p>Elevation Loss: {formatElevation(road.elevation_loss)} ↓</p>
                    <p className="text-xs text-gray-500">Debug: {JSON.stringify({
                        gain: road.elevation_gain,
                        loss: road.elevation_loss,
                        max: road.max_elevation,
                        min: road.min_elevation
                    })}</p>
                </div>
                <div className="text-sm text-right">
                    <p className="flex items-center justify-end">
                        <span className="text-yellow-400 mr-1">★</span>
                        {getAverageRating()}
                        <span className="text-gray-500 ml-1">
                            ({road.reviews?.length || 0} reviews)
                        </span>
                    </p>
                    {road.max_elevation && (
                        <p>Max Elevation: {formatElevation(road.max_elevation)}</p>
                    )}
                </div>
            </div>

            {showActions && (
                <div className="mt-3 flex gap-2">
                    {onViewMap && (
                        <button
                            onClick={() => onViewMap(road)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            View on Map
                        </button>
                    )}
                    {onNavigate && (
                        <button
                            onClick={() => onNavigate(road)}
                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            Navigate
                        </button>
                    )}
                    {onViewDetails && (
                        <button
                            onClick={() => onViewDetails(road.id)}
                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            View Details
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// Create a fallback UI for when the RoadCard component fails
const RoadCardFallback = (error, errorInfo) => {
    return (
        <div className="border rounded-lg p-4 bg-white">
            <h3 className="font-semibold text-lg text-red-600">Error Displaying Road</h3>
            <p className="text-sm text-gray-600 mt-2">
                There was a problem displaying this road's information.
            </p>
            <details className="mt-2 text-xs text-gray-500">
                <summary>Technical Details</summary>
                <p className="mt-1">{error && error.toString()}</p>
            </details>
        </div>
    );
};

// Export the RoadCard component wrapped with an ErrorBoundary
export default withErrorBoundary(RoadCard, RoadCardFallback);
