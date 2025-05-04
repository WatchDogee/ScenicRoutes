<?php
// Script to check PHP version directly in the container
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

// Execute PHP version command
echo "\nPHP version command output:\n";
$output = [];
$returnVar = 0;
exec("php -v 2>&1", $output, $returnVar);
echo implode("\n", $output) . "\n\n";

// Check if we can create a simple PHP file
echo "Creating a simple PHP file...\n";
$testFilePath = '/tmp/test.php';
$testFileContent = <<<'EOL'
<?php
echo "PHP version: " . phpversion() . "\n";
echo "Hello, world!\n";
EOL;

if (file_put_contents($testFilePath, $testFileContent)) {
    echo "Test file created successfully.\n";
    
    // Execute test file
    echo "Executing test file...\n";
    $output = [];
    $returnVar = 0;
    exec("php $testFilePath 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
} else {
    echo "Failed to create test file!\n";
}

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
