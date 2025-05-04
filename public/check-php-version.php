<?php
// Script to check PHP version
header('Content-Type: text/plain');

echo "PHP Version Check\n";
echo "===============\n\n";

// Check PHP version
echo "PHP version: " . phpversion() . "\n";
echo "PHP SAPI: " . php_sapi_name() . "\n";
echo "PHP loaded extensions: " . implode(', ', get_loaded_extensions()) . "\n\n";

// Check PHP configuration
echo "PHP configuration:\n";
$iniPath = php_ini_loaded_file();
echo "PHP ini file: $iniPath\n\n";

// Check PHP syntax features
echo "PHP syntax features:\n";

// Check namespace support
echo "Namespace support: ";
try {
    eval('namespace Test {}');
    echo "Yes\n";
} catch (Throwable $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check use statement support
echo "Use statement support: ";
try {
    eval('use stdClass;');
    echo "Yes\n";
} catch (Throwable $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check fully qualified namespace support
echo "Fully qualified namespace support: ";
try {
    eval('use \stdClass;');
    echo "Yes\n";
} catch (Throwable $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check class support
echo "Class support: ";
try {
    eval('class TestClass {}');
    echo "Yes\n";
} catch (Throwable $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Execute PHP version command
echo "\nPHP version command output:\n";
$output = [];
$returnVar = 0;
exec("php -v 2>&1", $output, $returnVar);
echo implode("\n", $output) . "\n\n";

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
