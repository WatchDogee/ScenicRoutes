<?php
// Manual artisan command runner
// WARNING: This script should only be used for troubleshooting and should be removed in production

// Set content type to plain text for better readability
header('Content-Type: text/plain');

// Check if a command was provided
$command = $_GET['command'] ?? '';
if (empty($command)) {
    echo "Error: No command specified\n";
    echo "Usage: run-artisan.php?command=<artisan-command>\n";
    echo "Example: run-artisan.php?command=migrate\n";
    exit;
}

// Validate command (basic security check)
if (!preg_match('/^[a-zA-Z0-9:_\-]+$/', $command)) {
    echo "Error: Invalid command format\n";
    exit;
}

// Function to run a command and display output
function runCommand($command) {
    echo "Running: $command\n";
    $output = [];
    $returnVar = 0;
    exec($command . " 2>&1", $output, $returnVar);
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
    return $returnVar === 0;
}

// Display current directory
echo "Current directory: " . getcwd() . "\n";
echo "Parent directory: " . dirname(getcwd()) . "\n\n";

// Change to parent directory (project root)
chdir(dirname(getcwd()));
echo "Changed to: " . getcwd() . "\n\n";

// Check if artisan exists
$artisanPath = getcwd() . '/artisan';
if (file_exists($artisanPath)) {
    echo "Artisan file found at: $artisanPath\n";
    
    // Make artisan executable
    runCommand("chmod +x artisan");
    
    // Run the specified artisan command
    runCommand("php artisan $command");
    
    echo "Command execution completed\n";
} else {
    echo "Artisan file NOT found at: $artisanPath\n";
    echo "Searching for artisan file:\n";
    runCommand("find . -name 'artisan' -type f");
}

// Return to original directory
chdir(dirname(getcwd()) . '/public');
echo "Changed back to: " . getcwd() . "\n";
