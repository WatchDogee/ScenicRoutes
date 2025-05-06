<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Log;

// Test if Log facade works
try {
    Log::info('Test log message');
    echo "Log facade works correctly!\n";
} catch (\Exception $e) {
    echo "Error using Log facade: " . $e->getMessage() . "\n";
}
