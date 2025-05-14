<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OptionalAuthenticate
{
public function handle(Request $request, Closure $next)
    {
        
        if (Auth::check()) {
            
            return $next($request);
        }

        
        
        return $next($request);
    }
}
