import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function FeatureGate({ feature, children, fallback = null, user = null }) {
    // Allow user to be passed as prop (for RoutePlanner) or get from page props
    const pageAuth = usePage()?.props?.auth;
    const authUser = user || pageAuth?.user;
    
    // If the user is not logged in, do not render any inline login prompt.
    // The global top navbar "Sign In" button is the single source of truth
    // for authentication entry, as requested. This keeps the map view clean.
    if (!authUser) {
        return fallback || null;
    }

    const tier = authUser.subscription?.plan || 'free';
    const hasAccess = checkFeatureAccess(tier, feature);

    if (hasAccess) {
        return <>{children}</>;
    }

    // If no access and no fallback provided, return null (don't show overlay on map page)
    // This keeps the map view clean - users can upgrade via the header button
    if (fallback === null || fallback === undefined) {
        return null;
    }

    // If fallback is explicitly provided (even if it's an empty fragment), use it
    return fallback;
}

function checkFeatureAccess(tier, feature) {
    const featureAccess = {
        // Premium route calculation features (paid)
        curved_routes: ['premium', 'pro'],
        round_trip: ['premium', 'pro'],
        extra_curvy: ['premium', 'pro'],
        alternative_routes: ['premium', 'pro'], // Frontend name
        route_alternatives: ['premium', 'pro'], // Backend name (alias)
        
        // Android app features (paid)
        offline_maps: ['premium', 'pro'], // Android only
        ride_recording: ['premium', 'pro'], // Android only
        turn_by_turn: ['premium', 'pro'], // Android only
        
        // Website premium features (optional, future)
        gpx_export_unlimited: ['premium', 'pro'], // Free tier has daily limit
        private_roads: ['premium', 'pro'], // Future website feature
        usage_analytics: ['premium', 'pro'], // Future website feature
        api_access: ['pro'], // Future website feature
        unlimited_offline_maps: ['pro'], // Android only
    };

    const requiredTiers = featureAccess[feature] || [];
    // If feature not in list, it's free
    if (requiredTiers.length === 0) {
        return true;
    }
    return requiredTiers.includes(tier);
}

function getRequiredTier(feature) {
    const featureTiers = {
        api_access: 'Pro',
        unlimited_offline_maps: 'Pro',
    };
    return featureTiers[feature] || 'Premium';
}

