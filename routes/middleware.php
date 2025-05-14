<?php
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return [
    'api' => [
        EnsureFrontendRequestsAreStateful::class, 
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ],
];
