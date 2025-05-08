/**
 * Updates the CSS variable for range input progress
 * @param {HTMLInputElement} rangeInput - The range input element
 */
export const updateRangeProgress = (rangeInput) => {
    if (!rangeInput) return;
    
    const min = parseFloat(rangeInput.min) || 0;
    const max = parseFloat(rangeInput.max) || 100;
    const value = parseFloat(rangeInput.value) || 0;
    
    // Calculate the percentage of the range that is filled
    const percentage = ((value - min) / (max - min)) * 100;
    
    // Set the CSS variable for the range progress
    rangeInput.style.setProperty('--range-progress', `${percentage}%`);
};

/**
 * Initializes a range input with progress tracking
 * @param {HTMLInputElement} rangeInput - The range input element
 */
export const initRangeInput = (rangeInput) => {
    if (!rangeInput) return;
    
    // Add the blue-range class to the input
    rangeInput.classList.add('blue-range');
    
    // Set the initial progress
    updateRangeProgress(rangeInput);
    
    // Update progress when the value changes
    rangeInput.addEventListener('input', () => {
        updateRangeProgress(rangeInput);
    });
};
