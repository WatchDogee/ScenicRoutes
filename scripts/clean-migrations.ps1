# PowerShell script to clean up old migration files

# Files to keep
$filesToKeep = @(
    "2025_05_15_000000_complete_postgres_schema.php"
)

# Get all migration files
$migrationFiles = Get-ChildItem -Path "database\migrations" -Filter "*.php"

# Delete old migration files
foreach ($file in $migrationFiles) {
    if ($filesToKeep -notcontains $file.Name) {
        Write-Host "Deleting $($file.Name)..."
        Remove-Item $file.FullName
    } else {
        Write-Host "Keeping $($file.Name)..."
    }
}

# Remove the postgres directory if it exists and is empty
$postgresDir = "database\migrations\postgres"
if (Test-Path $postgresDir) {
    $postgresFiles = Get-ChildItem -Path $postgresDir -ErrorAction SilentlyContinue
    if ($null -eq $postgresFiles -or $postgresFiles.Count -eq 0) {
        Write-Host "Removing empty postgres directory..."
        Remove-Item $postgresDir -Force
    } else {
        Write-Host "Postgres directory is not empty. Please check its contents manually."
    }
}

Write-Host "Migration cleanup complete!"
