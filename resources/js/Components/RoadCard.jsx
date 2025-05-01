import React from 'react';
import ProfilePicture from './ProfilePicture';

export default function RoadCard({ 
    road, 
    onViewMap, 
    onNavigate, 
    onViewDetails,
    showUser = true,
    showActions = true,
    className = ''
}) {
    const formatLength = (meters) => {
        return (meters / 1000).toFixed(2) + ' km';
    };
    
    const getTwistinessLabel = (twistiness) => {
        if (twistiness > 0.007) return 'Very Curvy';
        if (twistiness > 0.0035) return 'Moderately Curvy';
        return 'Mellow';
    };
    
    const getAverageRating = () => {
        if (road.average_rating || road.reviews_avg_rating) {
            return (road.average_rating || road.reviews_avg_rating).toFixed(1);
        }
        
        if (road.reviews && road.reviews.length > 0) {
            const sum = road.reviews.reduce((total, review) => total + review.rating, 0);
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
                    <span className="text-sm text-gray-600">
                        Added by {road.user.name || 'Unknown User'}
                    </span>
                </div>
            )}
            
            <div className="mt-3 grid grid-cols-2 gap-4">
                <div className="text-sm">
                    <p>Length: {formatLength(road.length)}</p>
                    <p>Corners: {road.corner_count}</p>
                    <p>Curve Rating: {getTwistinessLabel(road.twistiness)}</p>
                </div>
                <div className="text-sm text-right">
                    <p className="flex items-center justify-end">
                        <span className="text-yellow-400 mr-1">★</span>
                        {getAverageRating()}
                        <span className="text-gray-500 ml-1">
                            ({road.reviews?.length || 0} reviews)
                        </span>
                    </p>
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
