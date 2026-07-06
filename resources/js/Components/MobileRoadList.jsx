import React from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import StarRating from './StarRating';

export default function MobileRoadList({ roads = [], onRoadSelect, onFavorite, auth }) {
    if (roads.length === 0) {
        return null;
    }

    return (
        <div className="mobile-road-list">
            <div className="mobile-road-list-header">
                <h3 className="mobile-road-list-title">Roads</h3>
            </div>
            <div className="mobile-road-list-content">
                {roads.map((road) => {
                    const isFavorite = road.is_favorite || false;
                    const rating = road.average_rating || 0;
                    const ratingCount = road.rating_count || 0;

                    return (
                        <div
                            key={road.id}
                            className="mobile-road-card"
                            onClick={() => onRoadSelect && onRoadSelect(road)}
                        >
                            <div className="mobile-road-card-content">
                                <div className="mobile-road-name">
                                    {road.road_name || road.name || 'Unnamed Road'}
                                </div>
                                {rating > 0 && (
                                    <div className="mobile-road-rating">
                                        <StarRating rating={rating} size="sm" />
                                        <span className="mobile-road-rating-value">{rating.toFixed(1)}</span>
                                        {ratingCount > 0 && (
                                            <span className="mobile-road-rating-count">({ratingCount})</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {auth?.user && (
                                <button
                                    className="mobile-road-favorite"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFavorite && onFavorite(road);
                                    }}
                                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    {isFavorite ? (
                                        <FaHeart className="mobile-road-favorite-icon active" />
                                    ) : (
                                        <FaRegHeart className="mobile-road-favorite-icon" />
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


































