<?php

namespace App\Http\Controllers;

use App\Models\TelemetryEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelemetryController extends Controller
{
    /**
     * Store a telemetry event emitted by the client.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_type' => 'required|string|max:100',
            'context' => 'nullable|string|max:100',
            'payload' => 'nullable|array',
            'client_hash' => 'nullable|string|max:64',
        ]);

        try {
            $event = TelemetryEvent::create([
                'user_id' => $request->user()?->id,
                'event_type' => $validated['event_type'],
                'context' => $validated['context'] ?? null,
                'payload' => $validated['payload'] ?? null,
                'client_hash' => $validated['client_hash'] ?? substr(hash('sha256', $request->ip() . $request->userAgent()), 0, 64),
            ]);

            Log::channel('stack')->info('Telemetry event recorded', [
                'id' => $event->id,
                'event_type' => $event->event_type,
                'user_id' => $event->user_id,
                'context' => $event->context,
            ]);

            return response()->json([
                'success' => true,
                'event_id' => $event->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to record telemetry event', [
                'error' => $e->getMessage(),
                'event_type' => $validated['event_type'] ?? 'unknown',
            ]);

            return response()->json([
                'error' => 'Failed to record telemetry event',
            ], 500);
        }
    }
}





