#!/bin/bash

# Portfolio Manager 简单性能测试脚本
# 无需安装 JMeter，使用 curl + ab 进行基本压测

echo "🚀 Portfolio Manager 性能测试开始..."
echo "=================================="

# 检查应用是否运行
BASE_URL="http://localhost:5000"
echo "📋 检查应用状态..."

if curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "✅ 应用运行正常"
else
    echo "❌ 应用未启动，请先启动应用: npm start"
    exit 1
fi

# 检查测试工具
if ! command -v ab &> /dev/null; then
    echo "❌ Apache Bench (ab) 未安装"
    echo "安装方法："
    echo "  macOS: brew install httpie"
    echo "  Ubuntu: sudo apt-get install apache2-utils"
    echo "  Windows: 下载 Apache HTTP Server"
    exit 1
fi

echo ""
echo "🧪 开始性能测试..."
echo "=================================="

# 创建结果目录
mkdir -p test-results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 测试1: 健康检查接口 (高并发)
echo "📊 测试1: 健康检查接口 (/api/health)"
echo "   - 并发数: 50"
echo "   - 请求数: 1000"
echo "   - 预期 QPS: 500+"

ab -n 1000 -c 50 -g "test-results/health_${TIMESTAMP}.tsv" "$BASE_URL/api/health" > "test-results/health_${TIMESTAMP}.txt"

if [ $? -eq 0 ]; then
    # 提取关键指标
    QPS=$(grep "Requests per second" "test-results/health_${TIMESTAMP}.txt" | awk '{print $4}')
    AVG_TIME=$(grep "Time per request" "test-results/health_${TIMESTAMP}.txt" | head -1 | awk '{print $4}')
    echo "   ✅ 完成 - QPS: $QPS, 平均响应时间: ${AVG_TIME}ms"
else
    echo "   ❌ 测试失败"
fi

echo ""

# 测试2: 投资组合接口
echo "📊 测试2: 投资组合接口 (/api/portfolio)"
echo "   - 并发数: 20" 
echo "   - 请求数: 500"
echo "   - 预期 QPS: 200+"

ab -n 500 -c 20 -g "test-results/portfolio_${TIMESTAMP}.tsv" "$BASE_URL/api/portfolio" > "test-results/portfolio_${TIMESTAMP}.txt"

if [ $? -eq 0 ]; then
    QPS=$(grep "Requests per second" "test-results/portfolio_${TIMESTAMP}.txt" | awk '{print $4}')
    AVG_TIME=$(grep "Time per request" "test-results/portfolio_${TIMESTAMP}.txt" | head -1 | awk '{print $4}')
    echo "   ✅ 完成 - QPS: $QPS, 平均响应时间: ${AVG_TIME}ms"
else
    echo "   ❌ 测试失败"
fi

echo ""

# 测试3: 市场数据接口
echo "📊 测试3: 市场数据接口 (/api/market/quote/AAPL)"
echo "   - 并发数: 10"
echo "   - 请求数: 200"
echo "   - 预期 QPS: 100+"

ab -n 200 -c 10 -g "test-results/market_${TIMESTAMP}.tsv" "$BASE_URL/api/market/quote/AAPL" > "test-results/market_${TIMESTAMP}.txt"

if [ $? -eq 0 ]; then
    QPS=$(grep "Requests per second" "test-results/market_${TIMESTAMP}.txt" | awk '{print $4}')
    AVG_TIME=$(grep "Time per request" "test-results/market_${TIMESTAMP}.txt" | head -1 | awk '{print $4}')
    echo "   ✅ 完成 - QPS: $QPS, 平均响应时间: ${AVG_TIME}ms"
else
    echo "   ❌ 测试失败"
fi

echo ""
echo "📈 生成测试报告..."

# 生成简单的 HTML 报告
cat > "test-results/report_${TIMESTAMP}.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Portfolio Manager 性能测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px 20px 0 0; }
        .metric-label { font-weight: bold; }
        .metric-value { color: #2196F3; font-size: 18px; }
        .good { color: #4CAF50; }
        .warning { color: #FF9800; }
        .error { color: #F44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Portfolio Manager 性能测试报告</h1>
        <p>测试时间: $(date)</p>
    </div>
    
    <div class="test-result">
        <h2>🏥 健康检查接口 (/api/health)</h2>
        <div class="metric">
            <div class="metric-label">QPS:</div>
            <div class="metric-value">$(grep "Requests per second" "test-results/health_${TIMESTAMP}.txt" | awk '{print $4}' || echo "N/A")</div>
        </div>
        <div class="metric">
            <div class="metric-label">平均响应时间:</div>
            <div class="metric-value">$(grep "Time per request" "test-results/health_${TIMESTAMP}.txt" | head -1 | awk '{print $4}' || echo "N/A")ms</div>
        </div>
        <div class="metric">
            <div class="metric-label">错误率:</div>
            <div class="metric-value">$(grep "Failed requests" "test-results/health_${TIMESTAMP}.txt" | awk '{print $3}' || echo "0")</div>
        </div>
    </div>
    
    <div class="test-result">
        <h2>💼 投资组合接口 (/api/portfolio)</h2>
        <div class="metric">
            <div class="metric-label">QPS:</div>
            <div class="metric-value">$(grep "Requests per second" "test-results/portfolio_${TIMESTAMP}.txt" | awk '{print $4}' || echo "N/A")</div>
        </div>
        <div class="metric">
            <div class="metric-label">平均响应时间:</div>
            <div class="metric-value">$(grep "Time per request" "test-results/portfolio_${TIMESTAMP}.txt" | head -1 | awk '{print $4}' || echo "N/A")ms</div>
        </div>
        <div class="metric">
            <div class="metric-label">错误率:</div>
            <div class="metric-value">$(grep "Failed requests" "test-results/portfolio_${TIMESTAMP}.txt" | awk '{print $3}' || echo "0")</div>
        </div>
    </div>
    
    <div class="test-result">
        <h2>📈 市场数据接口 (/api/market/quote/AAPL)</h2>
        <div class="metric">
            <div class="metric-label">QPS:</div>
            <div class="metric-value">$(grep "Requests per second" "test-results/market_${TIMESTAMP}.txt" | awk '{print $4}' || echo "N/A")</div>
        </div>
        <div class="metric">
            <div class="metric-label">平均响应时间:</div>
            <div class="metric-value">$(grep "Time per request" "test-results/market_${TIMESTAMP}.txt" | head -1 | awk '{print $4}' || echo "N/A")ms</div>
        </div>
        <div class="metric">
            <div class="metric-label">错误率:</div>
            <div class="metric-value">$(grep "Failed requests" "test-results/market_${TIMESTAMP}.txt" | awk '{print $3}' || echo "0")</div>
        </div>
    </div>
    
    <div class="test-result">
        <h2>📋 性能评级标准</h2>
        <ul>
            <li class="good">优秀: QPS > 500, 响应时间 < 100ms</li>
            <li class="good">良好: QPS > 200, 响应时间 < 200ms</li>
            <li class="warning">一般: QPS > 100, 响应时间 < 500ms</li>
            <li class="error">需优化: QPS < 100, 响应时间 > 500ms</li>
        </ul>
    </div>
</body>
</html>
EOF

echo "✅ 测试完成！"
echo ""
echo "📁 测试结果文件:"
echo "   - 详细报告: test-results/report_${TIMESTAMP}.html"
echo "   - 原始数据: test-results/*_${TIMESTAMP}.txt"
echo ""
echo "🌐 查看报告: open test-results/report_${TIMESTAMP}.html"

# 自动打开报告（如果是 macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "test-results/report_${TIMESTAMP}.html"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "test-results/report_${TIMESTAMP}.html" 2>/dev/null
fi 