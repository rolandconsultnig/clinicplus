# Start Clinic+ Development Servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Clinic+ Development Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

# Check if npm is available
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    Write-Host "✓ npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

# Check port 5000
Write-Host "Checking port 5000..." -ForegroundColor Yellow
$port5000 = netstat -ano | findstr ":5000" | findstr "LISTENING"
if ($port5000) {
    Write-Host "⚠ Port 5000 is already in use" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -UseBasicParsing
        Write-Host "✓ Backend server is already running!" -ForegroundColor Green
        $backendRunning = $true
    } catch {
        Write-Host "✗ Port 5000 is in use but server not responding" -ForegroundColor Red
        $backendRunning = $false
    }
} else {
    $backendRunning = $false
}

# Check port 5173
Write-Host "Checking port 5173..." -ForegroundColor Yellow
$port5173 = netstat -ano | findstr ":5173" | findstr "LISTENING"
if ($port5173) {
    Write-Host "⚠ Port 5173 is already in use" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing
        Write-Host "✓ Frontend server is already running!" -ForegroundColor Green
        $frontendRunning = $true
    } catch {
        Write-Host "✗ Port 5173 is in use but server not responding" -ForegroundColor Red
        $frontendRunning = $false
    }
} else {
    $frontendRunning = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if ($backendRunning) {
    Write-Host "Backend (http://localhost:5000):  RUNNING ✓" -ForegroundColor Green
} else {
    Write-Host "Backend (http://localhost:5000):  NOT RUNNING ✗" -ForegroundColor Red
}
if ($frontendRunning) {
    Write-Host "Frontend (http://localhost:5173): RUNNING ✓" -ForegroundColor Green
} else {
    Write-Host "Frontend (http://localhost:5173): NOT RUNNING ✗" -ForegroundColor Red
}
Write-Host ""

# Start backend if not running
if (-not $backendRunning) {
    Write-Host "Starting Backend Server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; python main.py" -WindowStyle Normal
    Write-Host "✓ Backend server starting in new window" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Start frontend if not running
if (-not $frontendRunning) {
    Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal
    Write-Host "✓ Frontend server starting in new window" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Access Your Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000/api" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit this script (servers will continue running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

