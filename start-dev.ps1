# Start All Development Services
# Opens three separate terminals for: npm dev, php artisan serve, and GraphHopper

Write-Host "=== Starting Development Environment ===" -ForegroundColor Cyan
Write-Host ""

# Get the project root directory
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = $PWD
}

Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Check prerequisites
$errors = @()

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    $errors += "Node.js"
}

# Check PHP
try {
    $phpVersion = php --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] PHP found: $phpVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] PHP not found!" -ForegroundColor Red
    $errors += "PHP"
}

# Check Java
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "[OK] Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Java not found!" -ForegroundColor Red
    $errors += "Java"
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: Missing prerequisites: $($errors -join ', ')" -ForegroundColor Red
    Write-Host "Please install the missing tools before running this script." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting services in separate windows..." -ForegroundColor Yellow
Write-Host ""

# Terminal 1: npm dev (Vite)
Write-Host "Opening terminal for: npm run dev" -ForegroundColor Cyan
$npmScriptFile = Join-Path $env:TEMP "start-npm-dev.ps1"
$npmScriptContent = @(
    "cd `"$projectRoot`"",
    "Write-Host `"=== Frontend Dev Server (Vite) ===`" -ForegroundColor Cyan",
    "Write-Host `"URL: http://localhost:5173`" -ForegroundColor Green",
    "Write-Host ''",
    "npm run dev"
)
$npmScriptContent | Set-Content -Path $npmScriptFile -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", $npmScriptFile

# Small delay to avoid window overlap
Start-Sleep -Milliseconds 500

# Terminal 2: php artisan serve
Write-Host "Opening terminal for: php artisan serve" -ForegroundColor Cyan
$phpScriptFile = Join-Path $env:TEMP "start-php-serve.ps1"
$phpScriptContent = @(
    "cd `"$projectRoot`"",
    "Write-Host `"=== Laravel Backend Server ===`" -ForegroundColor Cyan",
    "Write-Host `"URL: http://localhost:8000`" -ForegroundColor Green",
    "Write-Host ''",
    "php artisan serve"
)
$phpScriptContent | Set-Content -Path $phpScriptFile -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", $phpScriptFile

# Small delay to avoid window overlap
Start-Sleep -Milliseconds 500

# Terminal 3: GraphHopper Server
Write-Host "Opening terminal for: GraphHopper Server" -ForegroundColor Cyan
$graphhopperPath = Join-Path $projectRoot "graphhopper"
if (-not (Test-Path $graphhopperPath)) {
    Write-Host "WARNING: graphhopper directory not found!" -ForegroundColor Yellow
    Write-Host "  Skipping GraphHopper server startup." -ForegroundColor Yellow
} else {
    $graphhopperScriptFile = Join-Path $env:TEMP "start-graphhopper.ps1"
    $graphhopperScriptContent = @(
        "cd `"$graphhopperPath`"",
        "Write-Host `"=== GraphHopper Routing Server ===`" -ForegroundColor Cyan",
        "Write-Host `"API: http://localhost:8989`" -ForegroundColor Green",
        "Write-Host `"Profile: car`" -ForegroundColor Gray",
        "Write-Host `"First import: 10-30 minutes`" -ForegroundColor Yellow",
        "Write-Host ''",
        "java -Xmx4g -Xms4g -jar graphhopper-web-8.0.jar server config.yml"
    )
    $graphhopperScriptContent | Set-Content -Path $graphhopperScriptFile -Encoding UTF8
    Start-Process powershell -ArgumentList "-NoExit", "-File", $graphhopperScriptFile
}

Write-Host ""
Write-Host "=== All Services Starting ===" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  - Frontend (Vite):    http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend (Laravel):  http://localhost:8000" -ForegroundColor White
Write-Host "  - GraphHopper API:    http://localhost:8989" -ForegroundColor White
Write-Host ""
Write-Host "All services are running in separate windows." -ForegroundColor Gray
Write-Host "Close the windows or press Ctrl+C in each to stop the services" -ForegroundColor Gray
Write-Host ""
