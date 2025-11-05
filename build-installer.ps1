# Run this script AS ADMINISTRATOR to build the PURE PRESENTER Installer
# Right-click this file and select 'Run with PowerShell'

Write-Host 'Building PURE PRESENTER Installer...' -ForegroundColor Green
Write-Host ''

# Set environment variable to skip code signing
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'

# Navigate to the project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Clean previous builds
if (Test-Path 'dist') {
    Write-Host 'Cleaning previous installer builds...' -ForegroundColor Yellow
    Remove-Item 'dist\*Setup*.exe' -ErrorAction SilentlyContinue
}

# Build the installer
Write-Host 'Running electron-builder (NSIS Installer)...' -ForegroundColor Cyan
npm run build:installer

Write-Host ''
if ($LASTEXITCODE -eq 0) {
    Write-Host 'Build completed successfully!' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Your installer file is located at:' -ForegroundColor Yellow
    Write-Host '  dist\PURE-PRESENTER-Setup-1.0.0.exe' -ForegroundColor White
    Write-Host ''
    Write-Host 'HOW IT WORKS:' -ForegroundColor Cyan
    Write-Host '1. User runs the Setup.exe' -ForegroundColor White
    Write-Host '2. Installer asks where to install (default: C:\Users\[username]\AppData\Local\Programs\PURE PRESENTER)' -ForegroundColor White
    Write-Host '3. Extracts all files to that location (ONE TIME ONLY)' -ForegroundColor White
    Write-Host '4. Creates desktop shortcut' -ForegroundColor White
    Write-Host '5. Runs the app immediately after installation' -ForegroundColor White
    Write-Host '6. From then on, app starts FAST (no extraction needed)' -ForegroundColor White
    Write-Host ''
    Write-Host 'This gives you: Single installer .exe + Fast startup after installation!' -ForegroundColor Green
} else {
    Write-Host 'Build failed. Please check the errors above.' -ForegroundColor Red
    Write-Host ''
    Write-Host 'If you see symbolic link errors, you need to:' -ForegroundColor Yellow
    Write-Host '1. Right-click this script' -ForegroundColor White
    Write-Host '2. Select Run as Administrator' -ForegroundColor White
}

Write-Host ''
Write-Host 'Press any key to exit...'
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
