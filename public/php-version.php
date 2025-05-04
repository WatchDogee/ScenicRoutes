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
echo "PHP ini file: $iniPath\n";
if (file_exists($iniPath)) {
    $content = file_get_contents($iniPath);
    echo "Content (first 20 lines):\n";
    $lines = explode("\n", $content);
    for ($i = 0; $i < min(20, count($lines)); $i++) {
        echo $lines[$i] . "\n";
    }
}
echo "\n";

// Check PHP extensions
echo "PHP extensions directory: " . ini_get('extension_dir') . "\n";
echo "PHP extensions: " . implode(', ', get_loaded_extensions()) . "\n\n";

// Check PHP error reporting
echo "PHP error reporting: " . ini_get('error_reporting') . "\n";
echo "PHP display errors: " . ini_get('display_errors') . "\n";
echo "PHP log errors: " . ini_get('log_errors') . "\n";
echo "PHP error log: " . ini_get('error_log') . "\n\n";

// Check PHP memory limit
echo "PHP memory limit: " . ini_get('memory_limit') . "\n";
echo "PHP max execution time: " . ini_get('max_execution_time') . "\n";
echo "PHP max input time: " . ini_get('max_input_time') . "\n";
echo "PHP post max size: " . ini_get('post_max_size') . "\n";
echo "PHP upload max filesize: " . ini_get('upload_max_filesize') . "\n\n";

// Check PHP syntax features
echo "PHP syntax features:\n";

// Check namespace support
echo "Namespace support: ";
try {
    eval('namespace Test {}');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check use statement support
echo "Use statement support: ";
try {
    eval('use stdClass;');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check fully qualified namespace support
echo "Fully qualified namespace support: ";
try {
    eval('use \stdClass;');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check class support
echo "Class support: ";
try {
    eval('class TestClass {}');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check anonymous function support
echo "Anonymous function support: ";
try {
    eval('$func = function() {};');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check arrow function support
echo "Arrow function support: ";
try {
    eval('$func = fn() => 1;');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check type hint support
echo "Type hint support: ";
try {
    eval('function test(string $param) {}');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check return type support
echo "Return type support: ";
try {
    eval('function test(): string {}');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check nullable type support
echo "Nullable type support: ";
try {
    eval('function test(?string $param) {}');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check union type support
echo "Union type support: ";
try {
    eval('function test(string|int $param) {}');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

// Check match expression support
echo "Match expression support: ";
try {
    eval('$result = match(1) { 1 => "one" };');
    echo "Yes\n";
} catch (ParseError $e) {
    echo "No (" . $e->getMessage() . ")\n";
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
