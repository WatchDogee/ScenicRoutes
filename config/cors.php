<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register', 'profile/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],  // Allow all origins in production for flexibility
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,  // Important for authentication with cookies
];