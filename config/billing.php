<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Billing Configuration
    |--------------------------------------------------------------------------
    |
    | Unified billing configuration for Google Play, Stripe, and entitlements
    |
    */

    'play' => [
        // Package name of Android app
        'package_name' => env('PLAY_PACKAGE_NAME', 'com.scenicroutes.app'),

        // Path to service account JSON for Play Developer API
        // Download from Google Play Console > Settings > API access
        'service_account_json_path' => env('PLAY_SERVICE_ACCOUNT_JSON_PATH', storage_path('play-service-account.json')),

        // Product SKUs that are subscriptions (vs one-time purchases)
        'subscription_skus' => [
            'premium_monthly',
            'premium_yearly',
        ],

        // Map Play SKUs to entitlement keys
        'product_to_entitlement_mapping' => [
            'premium_monthly' => 'premium',
            'premium_yearly' => 'premium',
            'pro_monthly' => 'pro',
            'pro_yearly' => 'pro',
        ],
    ],

    'stripe' => [
        // Webhook secret from Stripe Dashboard > Developers > Webhooks
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),

        // Map Stripe price IDs to entitlement keys
        'price_to_entitlement_mapping' => [
            env('STRIPE_PREMIUM_MONTHLY_PRICE_ID') => 'premium',
            env('STRIPE_PREMIUM_YEARLY_PRICE_ID') => 'premium',
            env('STRIPE_PRO_MONTHLY_PRICE_ID') => 'pro',
            env('STRIPE_PRO_YEARLY_PRICE_ID') => 'pro',
        ],

        // Product ID to display name (for UI)
        'products' => [
            'premium_monthly' => 'Premium (Monthly)',
            'premium_yearly' => 'Premium (Yearly)',
            'pro_monthly' => 'Pro (Monthly)',
            'pro_yearly' => 'Pro (Yearly)',
        ],
    ],

    // Entitlement definitions
    'entitlements' => [
        'premium' => [
            'label' => 'Premium',
            'description' => 'Full access to all features',
            'features' => [
                'unlimited_routes',
                'offline_maps',
                'custom_regions',
                'advanced_analytics',
            ],
        ],
        'pro' => [
            'label' => 'Pro',
            'description' => 'Professional features',
            'features' => [
                'unlimited_routes',
                'offline_maps',
                'custom_regions',
                'advanced_analytics',
                'team_features',
                'api_access',
            ],
        ],
    ],
];
