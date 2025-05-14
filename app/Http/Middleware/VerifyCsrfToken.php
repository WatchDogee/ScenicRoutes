<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
protected $except = [
        
        'api/login',
        'api/register',
        'api/forgot-password',
        'api/reset-password',
        'sanctum/csrf-cookie',

        
        'forgot-password',
        'reset-password',
        'password',
    ];
}
