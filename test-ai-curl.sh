#!/bin/bash

echo "🤖 测试AI投资组合分析接口"
echo "=================================="

# 设置变量
API_BASE="http://localhost:5000"
PORTFOLIO_ID="1"

echo ""
echo "📊 测试获取AI分析报告..."
echo "GET ${API_BASE}/api/ai-analysis/portfolio/${PORTFOLIO_ID}"
echo ""

curl -X GET \
  "${API_BASE}/api/ai-analysis/portfolio/${PORTFOLIO_ID}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -w "\n\n📈 响应状态码: %{http_code}\n⏱️  响应时间: %{time_total}s\n" \
  -s

echo ""
echo "=================================="
echo "✅ 测试完成" 