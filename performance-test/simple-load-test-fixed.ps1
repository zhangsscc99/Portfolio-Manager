# Portfolio Manager Performance Test Script - Fixed Version
# PowerShell version, no JMeter required

Write-Host "Portfolio Manager Performance Test Starting..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Blue

# Check if application is running
$baseUrl = "http://localhost:5000"
Write-Host "Checking application status..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Application is running" -ForegroundColor Green
    }
} catch {
    Write-Host "Application not started. Please run: npm start" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting performance tests..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Blue

# Create results directory
$resultsDir = "test-results"
if (!(Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Performance test function
function Test-ApiPerformance {
    param(
        [string]$Url,
        [string]$Name,
        [int]$Requests = 100,
        [int]$Concurrent = 10
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Cyan
    Write-Host "   - Concurrent: $Concurrent" -ForegroundColor Gray
    Write-Host "   - Requests: $Requests" -ForegroundColor Gray
    
    $startTime = Get-Date
    $jobs = @()
    $requestsPerJob = [Math]::Floor($Requests / $Concurrent)
    
    # Start concurrent jobs
    for ($i = 0; $i -lt $Concurrent; $i++) {
        $job = Start-Job -ScriptBlock {
            param($url, $requestCount)
            $times = @()
            $errorCount = 0
            
            for ($j = 0; $j -lt $requestCount; $j++) {
                try {
                    $requestStart = Get-Date
                    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10
                    $requestEnd = Get-Date
                    $duration = ($requestEnd - $requestStart).TotalMilliseconds
                    $times += $duration
                    
                    if ($response.StatusCode -ne 200) {
                        $errorCount++
                    }
                } catch {
                    $errorCount++
                }
            }
            
            return @{
                Times = $times
                Errors = $errorCount
            }
        } -ArgumentList $Url, $requestsPerJob
        
        $jobs += $job
    }
    
    # Wait for all jobs to complete
    $jobs | Wait-Job | Out-Null
    
    # Collect results
    $allTimes = @()
    $totalErrors = 0
    
    foreach ($job in $jobs) {
        $result = Receive-Job $job
        $allTimes += $result.Times
        $totalErrors += $result.Errors
        Remove-Job $job
    }
    
    $endTime = Get-Date
    $totalTime = ($endTime - $startTime).TotalSeconds
    
    # Calculate statistics
    if ($allTimes.Count -gt 0) {
        $avgTime = ($allTimes | Measure-Object -Average).Average
        $minTime = ($allTimes | Measure-Object -Minimum).Minimum
        $maxTime = ($allTimes | Measure-Object -Maximum).Maximum
        $qps = [Math]::Round($allTimes.Count / $totalTime, 2)
        $errorRate = [Math]::Round(($totalErrors / $allTimes.Count) * 100, 2)
        
        Write-Host "   Completed - QPS: $qps, Avg Time: $([Math]::Round($avgTime, 2))ms" -ForegroundColor Green
        
        return @{
            Name = $Name
            QPS = $qps
            AvgTime = [Math]::Round($avgTime, 2)
            MinTime = [Math]::Round($minTime, 2)
            MaxTime = [Math]::Round($maxTime, 2)
            ErrorRate = $errorRate
            TotalRequests = $allTimes.Count
            TotalErrors = $totalErrors
        }
    } else {
        Write-Host "   Test failed" -ForegroundColor Red
        return $null
    }
}

# Execute tests
$testResults = @()

# Test 1: Health Check
$result1 = Test-ApiPerformance -Url "$baseUrl/api/health" -Name "Health Check API" -Requests 500 -Concurrent 25
if ($result1) { $testResults += $result1 }

Write-Host ""

# Test 2: Portfolio
$result2 = Test-ApiPerformance -Url "$baseUrl/api/portfolio" -Name "Portfolio API" -Requests 200 -Concurrent 10
if ($result2) { $testResults += $result2 }

Write-Host ""

# Test 3: Market Data
$result3 = Test-ApiPerformance -Url "$baseUrl/api/market/quote/AAPL" -Name "Market Data API" -Requests 100 -Concurrent 5
if ($result3) { $testResults += $result3 }

Write-Host ""
Write-Host "Generating test report..." -ForegroundColor Green

# Generate simple CSV report
$csvReport = "API,QPS,AvgTime,MinTime,MaxTime,ErrorRate,TotalRequests`n"
foreach ($result in $testResults) {
    $csvReport += "$($result.Name),$($result.QPS),$($result.AvgTime),$($result.MinTime),$($result.MaxTime),$($result.ErrorRate),$($result.TotalRequests)`n"
}

$csvPath = "$resultsDir\results_$timestamp.csv"
$csvReport | Out-File -FilePath $csvPath -Encoding UTF8

# Generate HTML report
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Portfolio Manager Performance Test Report</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .header { background: #2196F3; color: white; padding: 30px; border-radius: 8px; }
        .result { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #2196F3; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .metric-label { font-weight: bold; color: #666; }
        .metric-value { color: #2196F3; font-size: 20px; font-weight: bold; }
        .excellent { border-left-color: #4CAF50; }
        .good { border-left-color: #8BC34A; }
        .average { border-left-color: #FF9800; }
        .poor { border-left-color: #F44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Portfolio Manager Performance Test Report</h1>
        <p>Test Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
    </div>
"@

foreach ($result in $testResults) {
    $gradeClass = "poor"
    $gradeText = "Needs Optimization"
    
    if ($result.QPS -gt 500 -and $result.AvgTime -lt 100) {
        $gradeClass = "excellent"
        $gradeText = "Excellent"
    } elseif ($result.QPS -gt 200 -and $result.AvgTime -lt 200) {
        $gradeClass = "good"
        $gradeText = "Good"
    } elseif ($result.QPS -gt 100 -and $result.AvgTime -lt 500) {
        $gradeClass = "average"
        $gradeText = "Average"
    }
    
    $htmlContent += @"
    <div class="result $gradeClass">
        <h2>$($result.Name)</h2>
        <p><strong>Performance Grade: $gradeText</strong></p>
        <div class="metric">
            <div class="metric-label">QPS</div>
            <div class="metric-value">$($result.QPS)</div>
        </div>
        <div class="metric">
            <div class="metric-label">Avg Time (ms)</div>
            <div class="metric-value">$($result.AvgTime)</div>
        </div>
        <div class="metric">
            <div class="metric-label">Min Time (ms)</div>
            <div class="metric-value">$($result.MinTime)</div>
        </div>
        <div class="metric">
            <div class="metric-label">Max Time (ms)</div>
            <div class="metric-value">$($result.MaxTime)</div>
        </div>
        <div class="metric">
            <div class="metric-label">Error Rate (%)</div>
            <div class="metric-value">$($result.ErrorRate)</div>
        </div>
    </div>
"@
}

$htmlContent += @"
    <div class="result">
        <h2>Performance Standards</h2>
        <ul>
            <li><strong>Excellent:</strong> QPS > 500, Response Time < 100ms</li>
            <li><strong>Good:</strong> QPS > 200, Response Time < 200ms</li>
            <li><strong>Average:</strong> QPS > 100, Response Time < 500ms</li>
            <li><strong>Needs Optimization:</strong> QPS < 100, Response Time > 500ms</li>
        </ul>
    </div>
</body>
</html>
"@

$reportPath = "$resultsDir\report_$timestamp.html"
$htmlContent | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "Test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Test result files:" -ForegroundColor Yellow
Write-Host "   - HTML Report: $reportPath" -ForegroundColor Gray
Write-Host "   - CSV Data: $csvPath" -ForegroundColor Gray
Write-Host ""

# Auto-open report
try {
    Start-Process $reportPath
    Write-Host "Report opened in browser" -ForegroundColor Green
} catch {
    Write-Host "Please manually open: $reportPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Quick Results Summary:" -ForegroundColor Cyan
foreach ($result in $testResults) {
    $status = if ($result.QPS -gt 200) { "[GOOD]" } elseif ($result.QPS -gt 100) { "[OK]" } else { "[SLOW]" }
    Write-Host "$status $($result.Name): $($result.QPS) QPS, $($result.AvgTime)ms" -ForegroundColor White
} 