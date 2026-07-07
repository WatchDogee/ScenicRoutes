/**
 * Route Validator - Validates routes match their parameters
 * Checks for:
 * - Route parameter compliance (straightest should be shortest, very curved should be most curved)
 * - Dead end detection accuracy
 * - False positive detection
 */

export const validateRouteParameters = (routes) => {
    const validations = [];
    
    if (!routes || routes.length === 0) {
        return { valid: false, errors: ['No routes provided'] };
    }
    
    const straightest = routes.find(r => r.type === 'straightest');
    const mellow = routes.find(r => r.type === 'mellow');
    const veryCurved = routes.find(r => r.type === 'very_curved');
    
    // Validation 1: Straightest should be shortest
    if (straightest && mellow && straightest.distance > mellow.distance * 1.15) {
        validations.push({
            type: 'warning',
            message: `Straightest route (${(straightest.distance / 1000).toFixed(2)} km) is longer than mellow route (${(mellow.distance / 1000).toFixed(2)} km)`,
            route: 'straightest'
        });
    }
    
    if (straightest && veryCurved && straightest.distance > veryCurved.distance * 1.2) {
        validations.push({
            type: 'warning',
            message: `Straightest route (${(straightest.distance / 1000).toFixed(2)} km) is longer than very curved route (${(veryCurved.distance / 1000).toFixed(2)} km)`,
            route: 'straightest'
        });
    }
    
    // Validation 2: Very curved should have highest curvature
    if (veryCurved && mellow && veryCurved.curvature < mellow.curvature) {
        validations.push({
            type: 'error',
            message: `Very curved route (curvature: ${veryCurved.curvature.toFixed(6)}) has lower curvature than mellow route (curvature: ${mellow.curvature.toFixed(6)})`,
            route: 'very_curved'
        });
    }
    
    if (veryCurved && straightest && veryCurved.curvature < straightest.curvature * 1.5) {
        validations.push({
            type: 'warning',
            message: `Very curved route (curvature: ${veryCurved.curvature.toFixed(6)}) is not significantly more curved than straightest (curvature: ${straightest.curvature.toFixed(6)})`,
            route: 'very_curved'
        });
    }
    
    // Validation 3: Mellow should be between straightest and very curved
    if (mellow && straightest && veryCurved) {
        const curvatureRange = veryCurved.curvature - straightest.curvature;
        const mellowPosition = (mellow.curvature - straightest.curvature) / curvatureRange;
        
        if (mellowPosition < 0.2 || mellowPosition > 0.8) {
            validations.push({
                type: 'warning',
                message: `Mellow route curvature (${mellow.curvature.toFixed(6)}) is not well-positioned between straightest and very curved`,
                route: 'mellow'
            });
        }
    }
    
    // Validation 4: Very curved should allow longer distances
    if (veryCurved && straightest) {
        const distanceRatio = veryCurved.distance / straightest.distance;
        if (distanceRatio < 1.1) {
            validations.push({
                type: 'warning',
                message: `Very curved route is only ${(distanceRatio * 100).toFixed(0)}% longer than straightest - may not be curved enough`,
                route: 'very_curved'
            });
        }
    }
    
    // Validation 5: Mellow should have moderate distance increase
    if (mellow && straightest) {
        const distanceRatio = mellow.distance / straightest.distance;
        if (distanceRatio > 1.5) {
            validations.push({
                type: 'warning',
                message: `Mellow route is ${(distanceRatio * 100).toFixed(0)}% longer than straightest - may be too long`,
                route: 'mellow'
            });
        }
    }
    
    const errors = validations.filter(v => v.type === 'error');
    const warnings = validations.filter(v => v.type === 'warning');
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: {
            totalRoutes: routes.length,
            errors: errors.length,
            warnings: warnings.length
        }
    };
};

export const analyzeDeadEndAccuracy = (routes, deadEnds) => {
    const analysis = {
        detectedIssues: deadEnds.length,
        routesWithIssues: deadEnds.map(de => de.routeType),
        potentialFalsePositives: [],
        missedIssues: []
    };
    
    // Check if routes with dead ends actually have visual issues
    routes.forEach(route => {
        const deadEnd = deadEnds.find(de => de.routeType === route.type);
        if (deadEnd && deadEnd.hasIssues) {
            // Check if the detected issues are significant
            const maxBacktrack = deadEnd.maxBacktrack || 0;
            const totalBacktrack = deadEnd.totalBacktrack || 0;
            const loopCount = deadEnd.loopLocations?.length || 0;
            
            // Potential false positive if backtrack is very small
            if (maxBacktrack < 200 && totalBacktrack < 500 && loopCount === 0) {
                analysis.potentialFalsePositives.push({
                    routeType: route.type,
                    reason: 'Small backtrack amounts',
                    maxBacktrack,
                    totalBacktrack
                });
            }
        }
    });
    
    // Check routes without dead ends for potential missed issues
    routes.forEach(route => {
        const deadEnd = deadEnds.find(de => de.routeType === route.type);
        if (!deadEnd || !deadEnd.hasIssues) {
            // Visual inspection needed - could be missed
            analysis.missedIssues.push({
                routeType: route.type,
                note: 'No dead ends detected - verify visually'
            });
        }
    });
    
    return analysis;
};

export const generateRouteComparison = (routes) => {
    if (!routes || routes.length < 2) {
        return null;
    }
    
    const comparison = {
        distances: {},
        curvatures: {},
        durations: {},
        cornerCounts: {}
    };
    
    routes.forEach(route => {
        comparison.distances[route.type] = route.distance / 1000; // km
        comparison.curvatures[route.type] = route.curvature || 0;
        comparison.durations[route.type] = route.duration / 60; // minutes
        comparison.cornerCounts[route.type] = route.corner_count || 0;
    });
    
    // Calculate ratios
    const straightest = routes.find(r => r.type === 'straightest');
    if (straightest) {
        comparison.ratios = {
            mellow: {
                distance: comparison.distances.mellow / comparison.distances.straightest,
                curvature: comparison.curvatures.mellow / (comparison.curvatures.straightest || 0.0001),
                duration: comparison.durations.mellow / comparison.durations.straightest
            },
            very_curved: {
                distance: comparison.distances.very_curved / comparison.distances.straightest,
                curvature: comparison.curvatures.very_curved / (comparison.curvatures.straightest || 0.0001),
                duration: comparison.durations.very_curved / comparison.durations.straightest
            }
        };
    }
    
    return comparison;
};
















