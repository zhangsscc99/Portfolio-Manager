# Portfolio Manager Windows 性能测试脚本
# PowerShell版本，无需安装JMeter

Write-Host "🚀 Portfolio Manager 性能测试开始..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Blue

# 检查应用是否运行
$baseUrl = "http://localhost:5000"
Write-Host "📋 检查应用状态..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 应用运行正常" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 应用未启动，请先启动应用: npm start" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🧪 开始性能测试..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Blue

# 创建结果目录
$resultsDir = "test-results"
if (!(Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# 性能测试函数
function Test-ApiPerformance {
    param(
        [string]$Url,
        [string]$Name,
        [int]$Requests = 100,
        [int]$Concurrent = 10
    )
    
    Write-Host "📊 测试: $Name" -ForegroundColor Cyan
    Write-Host "   - 并发数: $Concurrent" -ForegroundColor Gray
    Write-Host "   - 请求数: $Requests" -ForegroundColor Gray
    
    $results = @()
    $errors = 0
    $startTime = Get-Date
    
    # 创建作业数组
    $jobs = @()
    $requestsPerJob = [Math]::Floor($Requests / $Concurrent)
    
    # 启动并发作业
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
    
    # 等待所有作业完成
    $jobs | Wait-Job | Out-Null
    
    # 收集结果
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
    
    # 计算统计数据
    if ($allTimes.Count -gt 0) {
        $avgTime = ($allTimes | Measure-Object -Average).Average
        $minTime = ($allTimes | Measure-Object -Minimum).Minimum
        $maxTime = ($allTimes | Measure-Object -Maximum).Maximum
        $qps = [Math]::Round($allTimes.Count / $totalTime, 2)
        $errorRate = [Math]::Round(($totalErrors / $allTimes.Count) * 100, 2)
        
        Write-Host "   ✅ 完成 - QPS: $qps, 平均响应时间: $([Math]::Round($avgTime, 2))ms" -ForegroundColor Green
        
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
        Write-Host "   ❌ 测试失败" -ForegroundColor Red
        return $null
    }
}

# 执行测试
$testResults = @()

# 测试1: 健康检查
$result1 = Test-ApiPerformance -Url "$baseUrl/api/health" -Name "健康检查接口 (/api/health)" -Requests 500 -Concurrent 25
if ($result1) { $testResults += $result1 }

Write-Host ""

# 测试2: 投资组合
$result2 = Test-ApiPerformance -Url "$baseUrl/api/portfolio" -Name "投资组合接口 (/api/portfolio)" -Requests 200 -Concurrent 10
if ($result2) { $testResults += $result2 }

Write-Host ""

# 测试3: 市场数据
$result3 = Test-ApiPerformance -Url "$baseUrl/api/market/quote/AAPL" -Name "市场数据接口 (/api/market/quote/AAPL)" -Requests 100 -Concurrent 5
if ($result3) { $testResults += $result3 }

Write-Host ""
Write-Host "📈 生成测试报告..." -ForegroundColor Green

# 生成HTML报告
$htmlReport = @"
<!DOCTYPE html>
<html>
<head>
    <title>Portfolio Manager 性能测试报告</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #2196F3, #1976D2); color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .test-result { 
            margin: 20px 0; 
            padding: 25px; 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #2196F3;
        }
        .test-result h2 { margin-top: 0; color: #333; }
        .metrics { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 15px; }
        .metric { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 6px; 
            min-width: 150px;
            border: 1px solid #e9ecef;
        }
        .metric-label { font-weight: 600; color: #666; font-size: 14px; margin-bottom: 5px; }
        .metric-value { color: #2196F3; font-size: 24px; font-weight: bold; }
        .performance-grade { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .grade-excellent { border-left: 4px solid #4CAF50; }
        .grade-good { border-left: 4px solid #8BC34A; }
        .grade-average { border-left: 4px solid #FF9800; }
        .grade-poor { border-left: 4px solid #F44336; }
        .summary { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .summary-item { display: inline-block; margin: 0 30px 0 0; }
        .summary-value { font-size: 32px; font-weight: bold; color: #2196F3; display: block; }
        .summary-label { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Portfolio Manager 性能测试报告</h1>
        <p>测试时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
        <p>测试环境: Windows PowerShell</p>
    </div>
    
    <div class="summary">
        <h2>📋 测试摘要</h2>
        <div class="summary-item">
            <span class="summary-value">$($testResults.Count)</span>
            <span class="summary-label">接口测试</span>
        </div>
        <div class="summary-item">
            <span class="summary-value">$([Math]::Round(($testResults | ForEach-Object { $_.QPS } | Measure-Object -Sum).Sum, 0))</span>
            <span class="summary-label">总QPS</span>
        </div>
        <div class="summary-item">
            <span class="summary-value">$([Math]::Round(($testResults | ForEach-Object { $_.AvgTime } | Measure-Object -Average).Average, 0))</span>
            <span class="summary-label">平均响应时间(ms)</span>
        </div>
    </div>
"@

foreach ($result in $testResults) {
    # 性能等级判断
    $gradeClass = "grade-poor"
    $gradeText = "需要优化"
    
    if ($result.QPS -gt 500 -and $result.AvgTime -lt 100) {
        $gradeClass = "grade-excellent"
        $gradeText = "优秀"
    } elseif ($result.QPS -gt 200 -and $result.AvgTime -lt 200) {
        $gradeClass = "grade-good" 
        $gradeText = "良好"
    } elseif ($result.QPS -gt 100 -and $result.AvgTime -lt 500) {
        $gradeClass = "grade-average"
        $gradeText = "一般"
    }
    
    $htmlReport += @"
    <div class="test-result $gradeClass">
        <h2>$($result.Name)</h2>
        <div style="margin-bottom: 15px;">
            <span style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                性能等级: $gradeText
            </span>
        </div>
        <div class="metrics">
            <div class="metric">
                <div class="metric-label">QPS (每秒请求)</div>
                <div class="metric-value">$($result.QPS)</div>
            </div>
            <div class="metric">
                <div class="metric-label">平均响应时间</div>
                <div class="metric-value">$($result.AvgTime)ms</div>
            </div>
            <div class="metric">
                <div class="metric-label">最快响应</div>
                <div class="metric-value">$($result.MinTime)ms</div>
            </div>
            <div class="metric">
                <div class="metric-label">最慢响应</div>
                <div class="metric-value">$($result.MaxTime)ms</div>
            </div>
            <div class="metric">
                <div class="metric-label">错误率</div>
                <div class="metric-value">$($result.ErrorRate)%</div>
            </div>
            <div class="metric">
                <div class="metric-label">总请求数</div>
                <div class="metric-value">$($result.TotalRequests)</div>
            </div>
        </div>
    </div>
"@
}

$htmlReport += @"
    <div class="performance-grade">
        <h2>📊 性能评级标准</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 15px;">
            <div style="padding: 15px; background: #e8f5e8; border-radius: 6px; border-left: 4px solid #4CAF50;">
                <strong style="color: #2e7d32;">优秀</strong><br>
                QPS > 500, 响应时间 < 100ms
            </div>
            <div style="padding: 15px; background: #f1f8e9; border-radius: 6px; border-left: 4px solid #8BC34A;">
                <strong style="color: #558b2f;">良好</strong><br>
                QPS > 200, 响应时间 < 200ms
            </div>
            <div style="padding: 15px; background: #fff3e0; border-radius: 6px; border-left: 4px solid #FF9800;">
                <strong style="color: #ef6c00;">一般</strong><br>
                QPS > 100, 响应时间 < 500ms
            </div>
            <div style="padding: 15px; background: #ffebee; border-radius: 6px; border-left: 4px solid #F44336;">
                <strong style="color: #c62828;">需优化</strong><br>
                QPS < 100, 响应时间 > 500ms
            </div>
        </div>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; color: #666;">
        <p>📍 提示：这是本地开发环境的测试结果，生产环境性能可能有所不同</p>
        <p>🔧 如需优化建议，请参考 performance-test/README.md</p>
    </div>
</body>
</html>
"@

# 保存报告
$reportPath = "$resultsDir\report_$timestamp.html"
$htmlReport | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "✅ 测试完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📁 测试结果文件:" -ForegroundColor Yellow
Write-Host "   - 详细报告: $reportPath" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 查看报告: Start-Process '$reportPath'" -ForegroundColor Yellow

# 自动打开报告
try {
    Start-Process $reportPath
} catch {
    Write-Host "请手动打开报告文件: $reportPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 快速结果摘要:" -ForegroundColor Cyan
foreach ($result in $testResults) {
    $status = if ($result.QPS -gt 200) { "✅" } elseif ($result.QPS -gt 100) { "⚠️" } else { "❌" }
    Write-Host "$status $($result.Name): $($result.QPS) QPS, $($result.AvgTime)ms" -ForegroundColor White
} 