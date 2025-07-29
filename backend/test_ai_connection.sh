#!/bin/bash

echo "🔍 AI API Connection Test"
echo "========================="
echo ""

cd "$(dirname "$0")"

echo "📍 Running from: $(pwd)"
echo ""

echo "🚀 Testing AI API connection..."
node test_ai_connection.js

echo ""
echo "📝 You can also test via HTTP endpoint:"
echo "curl -X GET \"http://localhost:5000/api/ai-analysis/test-connection\""
echo ""

read -p "Press Enter to exit..." 