<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

class Authenticate extends Middleware
{
    /**
     * Handle an unauthenticated request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  array  $guards
     * @return void
     *
     * @throws \Illuminate\Auth\AuthenticationException
     */
    protected function unauthenticated($request, array $guards)
    {
        if ($request->expectsJson()) {
            abort(401, 'Unauthenticated');
        }

        // Instead of redirecting to login page, redirect to map page with a query parameter
        // that indicates the user needs to log in
        $this->redirectTo($request);
    }

    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API requests, don't redirect
        if ($request->expectsJson()) {
            return null;
        }

        // If the request is already for the map page, don't redirect
        if ($request->routeIs('map')) {
            return null;
        }

        // Redirect to map page with login_required parameter
        return route('map') . '?login_required=true';
    }
}
