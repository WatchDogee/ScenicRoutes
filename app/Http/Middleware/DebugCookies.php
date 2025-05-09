<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DebugCookies
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
        // Log incoming cookies
        Log::info('Incoming request cookies:', [
            'cookies' => $request->cookies->all(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'ajax' => $request->ajax(),
            'headers' => $request->headers->all(),
        ]);

        // Process the request
        $response = $next($request);

        // Log outgoing cookies
        $cookies = $response->headers->getCookies();
        $cookieData = [];
        
        foreach ($cookies as $cookie) {
            $cookieData[] = [
                'name' => $cookie->getName(),
                'value' => substr($cookie->getValue(), 0, 10) . '...',
                'domain' => $cookie->getDomain(),
                'path' => $cookie->getPath(),
                'secure' => $cookie->isSecure(),
                'httpOnly' => $cookie->isHttpOnly(),
                'sameSite' => $cookie->getSameSite(),
            ];
        }
        
        Log::info('Outgoing response cookies:', [
            'cookies' => $cookieData,
            'url' => $request->fullUrl(),
            'status' => $response->getStatusCode(),
        ]);

        return $response;
    }
}
