# Start Clinic+ Backend Server
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Clinic+ Backend Server" -ForegroundColor Cyan
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

# Check if Flask is installed
Write-Host "Checking Flask..." -ForegroundColor Yellow
try {
    python -c "import flask; print('Flask', flask.__version__)" 2>&1 | Out-Null
    Write-Host "✓ Flask is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Flask not found. Installing..." -ForegroundColor Yellow
    pip install flask flask-cors sqlalchemy flask-jwt-extended
}

# Check if port 5000 is available
Write-Host "Checking port 5000..." -ForegroundColor Yellow
$portInUse = netstat -ano | findstr ":5000" | findstr "LISTENING"
if ($portInUse) {
    Write-Host "⚠ Port 5000 is already in use" -ForegroundColor Yellow
    Write-Host "Attempting to use existing server..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -UseBasicParsing
        Write-Host "✓ Server is already running!" -ForegroundColor Green
        Write-Host "Backend API: http://localhost:5000/api" -ForegroundColor Cyan
        exit 0
    } catch {
        Write-Host "✗ Port 5000 is in use but server not responding" -ForegroundColor Red
        Write-Host "Please stop the process using port 5000 or change the port in main.py" -ForegroundColor Yellow
        exit 1
    }
}

# Start the server
Write-Host ""
Write-Host "Starting Flask server on http://localhost:5000..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Change to project directory
Set-Location $PSScriptRoot

# Start Flask
python main.py

