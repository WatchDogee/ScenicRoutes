<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OptionalAuthenticate
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Try to authenticate the user, but don't throw an exception if it fails
        if (Auth::check()) {
            // User is authenticated, proceed as normal
            return $next($request);
        }

        // User is not authenticated, but we'll still allow the request
        // Just make sure the request->user() method returns null
        return $next($request);
    }
}
