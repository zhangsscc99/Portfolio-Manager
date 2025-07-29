#!/bin/bash

echo "🚀 部署 Portfolio Manager 后端..."

# 设置变量
APP_NAME="portfolio-backend"
PORT=5000

# 进入后端目录
cd backend

# 安装依赖
echo "📦 安装依赖..."
npm install

# 创建日志目录
mkdir -p logs

# 停止现有进程（如果存在）
echo "🛑 停止现有进程..."
pm2 delete $APP_NAME 2>/dev/null || true

# 启动应用
echo "🚀 启动后端服务..."
pm2 start ecosystem.config.js --env production

# 保存PM2配置
echo "💾 保存PM2配置..."
pm2 save

# 设置开机自启
echo "🔧 设置开机自启..."
pm2 startup

# 显示状态
echo "📊 当前状态:"
pm2 list

echo "✅ 后端部署完成！"
echo "🌐 访问地址: http://localhost:$PORT"
echo "📝 查看日志: pm2 logs $APP_NAME" 