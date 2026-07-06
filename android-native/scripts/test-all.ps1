# PowerShell script for automated testing
# Usage: .\scripts\test-all.ps1

Write-Host "🚀 Starting automated Android tests..." -ForegroundColor Green

Set-Location $PSScriptRoot\..

Write-Host "`n📝 Formatting code..." -ForegroundColor Cyan
.\gradlew.bat ktlintFormat

Write-Host "`n✅ Running unit tests..." -ForegroundColor Cyan
.\gradlew.bat testDebugUnitTest

Write-Host "`n📊 Generating coverage report..." -ForegroundColor Cyan
.\gradlew.bat jacocoTestReport

Write-Host "`n🔍 Running lint..." -ForegroundColor Cyan
.\gradlew.bat lintDebug

Write-Host "`n🎯 Running detekt..." -ForegroundColor Cyan
.\gradlew.bat detekt

Write-Host "`n✅ All tests completed!" -ForegroundColor Green
Write-Host "📊 Coverage: app\build\reports\jacoco\jacocoTestReport\html\index.html" -ForegroundColor Yellow
Write-Host "📋 Lint: app\build\reports\lint-results-debug.html" -ForegroundColor Yellow
Write-Host "🔍 Detekt: app\build\reports\detekt\detekt.html" -ForegroundColor Yellow


















