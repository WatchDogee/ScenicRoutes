# Quick check script (fast validation)
# Usage: .\scripts\quick-check.ps1

Write-Host "⚡ Running quick checks..." -ForegroundColor Cyan

Set-Location $PSScriptRoot\..

.\gradlew.bat checkFast

Write-Host "`n✅ Quick check completed!" -ForegroundColor Green


















