<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Subscription;
use Stripe\Stripe;
use Stripe\Checkout\Session as StripeSession;

class FounderController extends Controller
{
    public function createCheckoutSession(Request $request)
    {
        $user = Auth::user();
        Stripe::setApiKey(config('services.stripe.secret'));

        $session = StripeSession::create([
            'payment_method_types' => ['card'],
            'mode' => 'payment',
            'line_items' => [[
                'price_data' => [
                    'currency' => 'eur',
                    'product_data' => [
                        'name' => 'Founding Driver Lifetime Access',
                    ],
                    'unit_amount' => 1500, // €15.00
                ],
                'quantity' => 1,
            ]],
            'customer_email' => $user->email,
            'success_url' => url('/founder/success?session_id={CHECKOUT_SESSION_ID}'),
            'cancel_url' => url('/founder/cancel'),
        ]);

        return response()->json(['id' => $session->id]);
    }

    public function handleSuccess(Request $request)
    {
        $user = Auth::user();
        $sessionId = $request->query('session_id');
        Stripe::setApiKey(config('services.stripe.secret'));
        $session = StripeSession::retrieve($sessionId);
        if ($session && $session->payment_status === 'paid') {
            // Grant founder access
            Subscription::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'plan' => 'founder',
                ],
                [
                    'status' => 'active',
                    'payment_method' => 'stripe',
                    'amount' => 15.00,
                    'currency' => 'eur',
                    'starts_at' => now(),
                    'ends_at' => null,
                ]
            );
        }
        return redirect('/dashboard')->with('status', 'Thank you for becoming a Founding Driver!');
    }
}
