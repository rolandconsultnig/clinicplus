# Script to download Gradle Wrapper JAR
Write-Host "Downloading Gradle Wrapper JAR..." -ForegroundColor Yellow

$wrapperJarPath = "gradle\wrapper\gradle-wrapper.jar"
$urls = @(
    "https://raw.githubusercontent.com/gradle/gradle/v8.3.0/gradle/wrapper/gradle-wrapper.jar",
    "https://github.com/gradle/gradle/raw/v8.3.0/gradle/wrapper/gradle-wrapper.jar",
    "https://services.gradle.org/distributions/gradle-8.3-wrapper.jar"
)

foreach ($url in $urls) {
    try {
        Write-Host "Trying: $url" -ForegroundColor Cyan
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $url -OutFile $wrapperJarPath -UseBasicParsing -ErrorAction Stop
        
        $file = Get-Item $wrapperJarPath
        if ($file.Length -gt 50000) {
            Write-Host "Success! Downloaded $($file.Length) bytes" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "File too small, trying next URL..." -ForegroundColor Yellow
            Remove-Item $wrapperJarPath -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
        Remove-Item $wrapperJarPath -ErrorAction SilentlyContinue
    }
}

Write-Host "`nAll download attempts failed." -ForegroundColor Red
Write-Host "Please manually download gradle-wrapper.jar from:" -ForegroundColor Yellow
Write-Host "https://raw.githubusercontent.com/gradle/gradle/v8.3.0/gradle/wrapper/gradle-wrapper.jar" -ForegroundColor Cyan
Write-Host "And save it to: gradle\wrapper\gradle-wrapper.jar" -ForegroundColor Yellow

