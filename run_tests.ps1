# PowerShell script to run integration tests
# First check if server is running, if not start it

Write-Host "Checking if Flask server is running..."
$response = try { Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -UseBasicParsing } catch { $null }

if ($response -and $response.StatusCode -eq 200) {
    Write-Host "Server is already running!"
} else {
    Write-Host "Starting Flask server in background..."
    $job = Start-Job -ScriptBlock { 
        Set-Location $using:PWD
        python main.py 
    }
    Start-Sleep -Seconds 5
    Write-Host "Server started!"
}

Write-Host "`nRunning integration tests..."
python test_frontend_backend_integration.py

if ($job) {
    Write-Host "`nStopping Flask server..."
    Stop-Job $job
    Remove-Job $job
}

