param(
    [string]$PythonExe = "python",
    [string]$BaseUrl = "http://localhost:4300",
    [string]$OutputDir = "",
    [string]$UatBearer = "",
    [string]$RunDueBearer = "",
    [string]$PerfBearer = "",
    [int]$PerfLoops = 5,
    [int]$TimeoutSeconds = 30,
    [int]$KeepDays = 14
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $projectRoot "logs\ops-nightly"
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$timeStamp = Get-Date -Format "HHmmss"
$outFile = Join-Path $OutputDir "ops-nightly-$dateStamp-$timeStamp.json"

if ($KeepDays -ge 0) {
    $cutoff = (Get-Date).AddDays(-1 * $KeepDays)
    $removed = 0
    Get-ChildItem -Path $OutputDir -Filter "*.json" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object {
            Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
            $removed += 1
        }
    Write-Host "Pruned old reports: $removed (KeepDays=$KeepDays)"
}
else {
    Write-Host "Prune disabled (KeepDays=$KeepDays)"
}

# Sane defaults for all three scripts
$env:UAT_BASE_URL = $BaseUrl
$env:REPORT_RUNNER_BASE_URL = $BaseUrl
$env:PERF_BASE_URL = $BaseUrl

$env:UAT_TIMEOUT = [string]$TimeoutSeconds
$env:REPORT_RUNNER_TIMEOUT = [string]$TimeoutSeconds
$env:PERF_TIMEOUT = [string]$TimeoutSeconds
$env:PERF_LOOPS = [string]$PerfLoops

$env:OPS_OUTPUT_FILE = $outFile

# Keep nightly strict by default; caller can override before invocation.
if (-not $env:OPS_FAIL_ON_UAT) { $env:OPS_FAIL_ON_UAT = "true" }
if (-not $env:OPS_FAIL_ON_RUN_DUE) { $env:OPS_FAIL_ON_RUN_DUE = "true" }
if (-not $env:OPS_FAIL_ON_PERF) { $env:OPS_FAIL_ON_PERF = "true" }

# Token precedence:
#   1) explicit parameters
#   2) pre-existing process env vars
if (-not [string]::IsNullOrWhiteSpace($UatBearer)) {
    $env:UAT_BEARER = $UatBearer
}
if (-not [string]::IsNullOrWhiteSpace($RunDueBearer)) {
    $env:REPORT_RUNNER_BEARER = $RunDueBearer
}
if (-not [string]::IsNullOrWhiteSpace($PerfBearer)) {
    $env:PERF_BEARER = $PerfBearer
}

$pyScript = Join-Path $scriptDir "ops_nightly.py"

Write-Host "Running nightly ops orchestrator..."
Write-Host "Base URL: $BaseUrl"
Write-Host "Output : $outFile"

Push-Location $projectRoot
try {
    & $PythonExe $pyScript
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if (Test-Path $outFile) {
    Write-Host "Report saved: $outFile"
}
else {
    Write-Warning "Expected report file not found: $outFile"
}

exit $exitCode

