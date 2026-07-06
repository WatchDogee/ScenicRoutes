import React from 'react';
import { FaHeart, FaRegHeart, FaRoute } from 'react-icons/fa';
import StarRating from './StarRating';

export default function RoadResultsList({ roads = [], onRoadSelect, onFavorite, auth }) {
    if (roads.length === 0) {
        return null;
    }

    return (
        <div className="mobile-section">
            <div className="mobile-section-title">Found Roads ({roads.length})</div>
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
                            <div className="mobile-road-card-title">
                                {road.road_name || road.name || 'Unnamed Road'}
                            </div>
                            {rating > 0 && (
                                <div className="mobile-road-card-rating">
                                    <StarRating rating={rating} size="sm" />
                                    <span style={{ marginLeft: 'var(--space-xs)' }}>
                                        {rating.toFixed(1)}
                                    </span>
                                    {ratingCount > 0 && (
                                        <span style={{ color: 'var(--color-text-tertiary)' }}>
                                            ({ratingCount})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                            {auth?.user && (
                                <button
                                    className="mobile-header-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFavorite && onFavorite(road);
                                    }}
                                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                    style={{ width: '40px', height: '40px' }}
                                >
                                    {isFavorite ? (
                                        <FaHeart style={{ color: 'var(--color-accent)' }} />
                                    ) : (
                                        <FaRegHeart />
                                    )}
                                </button>
                            )}
                            <button
                                className="mobile-header-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle navigate action
                                }}
                                aria-label="Navigate"
                                style={{ width: '40px', height: '40px' }}
                            >
                                <FaRoute style={{ color: 'var(--color-primary)' }} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


































