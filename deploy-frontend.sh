#!/bin/bash

echo "🎨 部署 Portfolio Manager 前端..."

# 设置变量
PROJECT_NAME="portfolio-manager"
SERVER_IP="47.243.102.28"

# 进入前端目录
cd frontend

# 安装依赖
echo "📦 安装依赖..."
npm install

# 创建生产环境配置
echo "⚙️ 创建生产环境配置..."
cat > .env.production << EOF
PORT=3050
REACT_APP_API_URL=http://$SERVER_IP:5000/api
EOF

# 构建项目
echo "🔨 构建前端项目..."
npm run build:prod

# 检查构建结果
if [ ! -d "build" ]; then
    echo "❌ 构建失败，build目录不存在"
    exit 1
fi

echo "✅ 构建完成！"
echo "📁 构建文件:"
ls -la build/

# 部署选项
echo ""
echo "🚀 选择部署方式:"
echo "1. 部署到Nginx (推荐)"
echo "2. 使用Express服务 (需要重启后端)"
echo "3. 使用serve包"
read -p "请选择 (1-3): " choice

case $choice in
    1)
        echo "📤 部署到Nginx..."
        
        # 创建Nginx目录
        sudo mkdir -p /var/www/$PROJECT_NAME
        
        # 复制构建文件
        sudo cp -r build/* /var/www/$PROJECT_NAME/
        
        # 设置权限
        sudo chown -R www-data:www-data /var/www/$PROJECT_NAME
        sudo chmod -R 755 /var/www/$PROJECT_NAME
        
        echo "✅ 已部署到 /var/www/$PROJECT_NAME"
        echo "🌐 访问地址: http://$SERVER_IP"
        ;;
        
    2)
        echo "📤 使用Express服务..."
        echo "✅ 构建文件已准备好，后端会自动服务"
        echo "🔄 请重启后端服务: pm2 restart portfolio-backend"
        echo "🌐 访问地址: http://$SERVER_IP:5000"
        ;;
        
    3)
        echo "📤 使用serve包..."
        
        # 安装serve
        npm install -g serve
        
        # 停止现有serve进程
        pm2 delete portfolio-frontend 2>/dev/null || true
        
        # 启动serve
        pm2 start serve --name "portfolio-frontend" -- -s build -l 3050
        
        echo "✅ 使用serve启动前端"
        echo "🌐 访问地址: http://$SERVER_IP:3050"
        ;;
        
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 前端部署完成！"
echo "📝 查看日志: pm2 logs"
echo "📊 查看状态: pm2 status" 