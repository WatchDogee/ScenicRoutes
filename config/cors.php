<?php

return [
    'paths' => ['*'],  // Allow CORS for all paths
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],  // Allow all origins in production for flexibility
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,  // Important for authentication with cookies
];