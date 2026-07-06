<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        $lastVerificationSent = $request->user()->last_verification_sent_at;
        if ($lastVerificationSent && now()->diffInMinutes($lastVerificationSent) < 5) {
            return back()->with('status', 'verification-link-sent');
        }

        $request->user()->update(['last_verification_sent_at' => now()]);
        
        $request->user()->sendEmailVerificationNotification();

        return back()->with('status', 'verification-link-sent');
    }
}
