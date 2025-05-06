import React from 'react';

export default function StarRating({ rating, maxRating = 5, interactive = false, onRatingChange = null, size = 'md', allowClear = true }) {
    // Size classes
    const sizeClasses = {
        'sm': 'text-lg',
        'md': 'text-2xl',
        'lg': 'text-3xl',
    };

    const sizeClass = sizeClasses[size] || sizeClasses.md;

    const handleStarClick = (selectedRating) => {
        if (interactive && onRatingChange) {
            // If the same star is clicked again and allowClear is true, clear the rating
            if (selectedRating === rating && allowClear) {
                onRatingChange(0);
            } else {
                onRatingChange(selectedRating);
            }
        }
    };

    return (
        <div className="flex gap-1">
            {/* Add a "clear" button if allowClear is true */}
            {interactive && allowClear && (
                <button
                    type="button"
                    onClick={() => onRatingChange(0)}
                    className={`${sizeClass} text-gray-400 hover:text-gray-600 transition-colors mr-2`}
                    title="Clear rating"
                >
                    ×
                </button>
            )}

            {[...Array(maxRating)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => handleStarClick(starValue)}
                        className={`${sizeClass} ${
                            starValue <= rating ? 'text-yellow-400' : 'text-gray-300'
                        } ${interactive ? 'hover:text-yellow-400' : ''} transition-colors`}
                        disabled={!interactive}
                    >
                        ★
                    </button>
                );
            })}
        </div>
    );
}
