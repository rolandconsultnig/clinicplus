# Start Both Backend and Frontend Servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Clinic+ Development Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "main.py")) {
    Write-Host "✗ Error: main.py not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Start backend in a new window
Write-Host "Starting Backend Server (new window)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\start-backend.ps1" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Check if frontend dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Start frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend: http://localhost:4300" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4305" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the frontend server" -ForegroundColor Gray
Write-Host ""

npm run dev

