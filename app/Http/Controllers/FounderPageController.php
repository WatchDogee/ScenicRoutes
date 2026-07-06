<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FounderPageController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        return Inertia::render('FounderInfo', [
            'auth' => [
                'user' => $user,
            ],
        ]);
    }
}
