<?php
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return [
    'api' => [
        EnsureFrontendRequestsAreStateful::class, // ← add this line
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ],
];
