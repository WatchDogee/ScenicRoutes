import React from 'react';
import ProfilePicture from './ProfilePicture';
import { useContext } from 'react';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
import { withErrorBoundary } from './ErrorBoundary';
import { FaTag } from 'react-icons/fa';
import TagSelector from './TagSelector';
import CollapsibleTagSelector from './CollapsibleTagSelector';
import WeatherDisplay from './WeatherDisplay';
import UserMention from './UserMention';
function RoadCard({
    road,
    onViewMap,
    onNavigate,
    onViewDetails,
    onEdit,
    onTagsChange,
    onViewUser,
    showUser = true,
    showActions = true,
    className = '',
    showPrivacyStatus = false,
    showTags = true,
    allowTagEdit = false,
    showWeather = true
}) {
    const { userSettings } = useContext(UserSettingsContext);
    const formatLength = (meters) => {
        if (!meters && meters !== 0) return 'N/A';
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
        if (!twistiness && twistiness !== 0) return 'N/A';
        if (twistiness > 0.007) return 'Very Curvy';
        if (twistiness > 0.0035) return 'Moderately Curvy';
        return 'Mellow';
    };
    const getAverageRating = () => {
        
        const rating = road.average_rating || road.reviews_avg_rating;
        if (rating !== undefined && rating !== null && !isNaN(parseFloat(rating))) {
            return parseFloat(rating).toFixed(1);
        }
        
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
            <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg">{road.road_name}</h3>
                {showWeather && road.id && (
                    <WeatherDisplay
                        roadId={road.id}
                        units={userSettings?.measurement_units === 'imperial' ? 'imperial' : 'metric'}
                        className="ml-2"
                    />
                )}
            </div>
            {showUser && road.user && (
                <div className="flex items-center mt-2 space-x-2">
                    <ProfilePicture user={road.user} size="sm" />
                    <div>
                        <span className="text-sm text-gray-600">
                            Added by {onViewUser ? (
                                <UserMention
                                    user={road.user}
                                    onViewUser={onViewUser}
                                />
                            ) : (
                                <span className="font-medium">{road.user.name || 'Unknown User'}</span>
                            )}
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
                    <p>Corners: {road.corner_count || 'N/A'}</p>
                    <p>Curve Rating: {getTwistinessLabel(road.twistiness)}</p>
                    <p>Elevation Gain: {formatElevation(road.elevation_gain)} ↑</p>
                    <p>Elevation Loss: {formatElevation(road.elevation_loss)} ↓</p>
                    {showPrivacyStatus && (
                        <p className={`text-xs mt-1 ${road.is_public ? 'text-green-600' : 'text-orange-600'}`}>
                            {road.is_public ? 'Public' : 'Private'}
                        </p>
                    )}
                </div>
                <div className="text-sm text-right">
                    <p className="flex items-center justify-end">
                        <span className="text-yellow-400 mr-1">★</span>
                        {getAverageRating()}
                        <span className="text-gray-500 ml-1">
                            ({road.reviews?.length || 0} reviews)
                        </span>
                    </p>
                    <p>Max Elevation: {formatElevation(road.max_elevation)}</p>
                </div>
            </div>
            {$1}
            {showTags && road.tags && road.tags.length > 0 && (
                <div className="mt-2">
                    <CollapsibleTagSelector
                        selectedTags={road.tags}
                        onTagsChange={onTagsChange ? (tags) => onTagsChange(road.id, tags) : undefined}
                        entityType="road"
                        readOnly={!allowTagEdit}
                        initialVisibleTags={3}
                    />
                </div>
            )}
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
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onViewDetails(road.id, e);
                            }}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md"
                        >
                            View Details
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={() => onEdit(road)}
                            className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                            Edit
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

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

export default withErrorBoundary(RoadCard, RoadCardFallback);
