<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

class Authenticate extends Middleware
{
protected function unauthenticated($request, array $guards)
    {
        if ($request->expectsJson()) {
            abort(401, 'Unauthenticated');
        }

        
        
        $this->redirectTo($request);
    }
protected function redirectTo(Request $request): ?string
    {
        
        if ($request->expectsJson()) {
            return null;
        }

        
        if ($request->routeIs('map')) {
            return null;
        }

        
        return route('map') . '?login_required=true';
    }
}
