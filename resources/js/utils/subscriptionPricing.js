/**
 * Subscription pricing utilities
 */

export const PRICING = {
    premium: {
        monthly: 3.99,
        yearly: 29.99,
    },
    pro: {
        monthly: 5.99,
        yearly: 49.99,
    },
};

/**
 * Calculate yearly savings for a plan
 * @param {string} plan - 'premium' or 'pro'
 * @returns {object} - { amount: number, percentage: number, monthlyTotal: number, yearly: number }
 */
export function calculateYearlySavings(plan) {
    const pricing = PRICING[plan];
    if (!pricing) return null;

    const monthlyTotal = pricing.monthly * 12;
    const yearly = pricing.yearly;
    const savings = monthlyTotal - yearly;
    const percentage = Math.round((savings / monthlyTotal) * 100);

    return {
        amount: savings,
        percentage,
        monthlyTotal,
        yearly,
    };
}

/**
 * Format price savings for display
 * @param {string} plan - 'premium' or 'pro'
 * @param {string} fromCycle - 'monthly' or 'yearly'
 * @returns {string} - Formatted savings message
 */
export function formatSavingsMessage(plan, fromCycle = 'monthly') {
    if (fromCycle === 'yearly') {
        return null; // No savings when switching from yearly to monthly
    }

    const savings = calculateYearlySavings(plan);
    if (!savings) return null;

    return `Save $${savings.amount.toFixed(2)}/year (${savings.percentage}%)`;
}

/**
 * Get price comparison text
 * @param {string} plan - 'premium' or 'pro'
 * @param {string} cycle - 'monthly' or 'yearly'
 * @returns {string} - Price comparison text
 */
export function getPriceComparison(plan, cycle) {
    const pricing = PRICING[plan];
    if (!pricing) return null;

    if (cycle === 'monthly') {
        const savings = calculateYearlySavings(plan);
        return `$${pricing.monthly}/month (or $${pricing.yearly}/year - ${savings.percentage}% off)`;
    } else {
        return `$${pricing.yearly}/year ($${(pricing.yearly / 12).toFixed(2)}/month)`;
    }
}

