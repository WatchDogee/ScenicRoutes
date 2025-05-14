$1
export const updateRangeProgress = (rangeInput) => {
    if (!rangeInput) return;
    const min = parseFloat(rangeInput.min) || 0;
    const max = parseFloat(rangeInput.max) || 100;
    const value = parseFloat(rangeInput.value) || 0;
    
    const percentage = ((value - min) / (max - min)) * 100;
    
    rangeInput.style.setProperty('--range-progress', `${percentage}%`);
};
$1
export const initRangeInput = (rangeInput) => {
    if (!rangeInput) return;
    
    rangeInput.classList.add('blue-range');
    
    updateRangeProgress(rangeInput);
    
    rangeInput.addEventListener('input', () => {
        updateRangeProgress(rangeInput);
    });
};
