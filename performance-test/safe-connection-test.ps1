# Portfolio Manager - Safe Connection Test
# 安全的服务器连接测试脚本

param(
    [string]$ServerHost = "47.243.102.28",
    [int]$ServerPort = 5000
)

$BaseURL = "http://${ServerHost}:${ServerPort}"

Write-Host "=== Portfolio Manager Safe Connection Test ===" -ForegroundColor Green
Write-Host "Target Server: $BaseURL" -ForegroundColor Yellow
Write-Host ""

# Test 1: Health Check
Write-Host "Step 1: Testing Health Check..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "$BaseURL/api/health" -Method GET -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Health Check PASSED" -ForegroundColor Green
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "   Status: $($healthData.status)" -ForegroundColor White
        Write-Host "   Message: $($healthData.message)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Health Check FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# Test 2: Portfolio API
Write-Host ""
Write-Host "Step 2: Testing Portfolio API..." -ForegroundColor Cyan
try {
    $portfolioResponse = Invoke-WebRequest -Uri "$BaseURL/api/portfolio" -Method GET -TimeoutSec 10
    if ($portfolioResponse.StatusCode -eq 200) {
        Write-Host "✅ Portfolio API PASSED" -ForegroundColor Green
        Write-Host "   Response Size: $($portfolioResponse.Content.Length) bytes" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Portfolio API FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Test 3: Market Data API
Write-Host ""
Write-Host "Step 3: Testing Market Data API..." -ForegroundColor Cyan
try {
    $marketResponse = Invoke-WebRequest -Uri "$BaseURL/api/market/quote/AAPL" -Method GET -TimeoutSec 15
    if ($marketResponse.StatusCode -eq 200) {
        Write-Host "✅ Market Data API PASSED" -ForegroundColor Green
        Write-Host "   Response Size: $($marketResponse.Content.Length) bytes" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Market Data API FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Connection Test Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "If all tests passed, you can proceed with JMeter testing:" -ForegroundColor Yellow
Write-Host "java -jar bin\ApacheJMeter.jar -n -t ..\performance-test\portfolio-manager-safe-test.jmx -l safe-test.jtl -e -o safe-report" -ForegroundColor White 