<?php
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return [
    'api' => [
        EnsureFrontendRequestsAreStateful::class, // Ensure this is included
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ],
];
