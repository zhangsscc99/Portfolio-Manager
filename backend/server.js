const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

// 数据库连接和模型
const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models/index');
const scheduledUpdatesService = require('./services/scheduledUpdates');

// RocketMQ 消息管理器
const messageManager = require('./services/rocketmq/messageManager');

// Import routes
const portfolioRoutes = require('./routes/portfolio');
const holdingsRoutes = require('./routes/holdings');
const marketDataRoutes = require('./routes/marketData');
const assetsRoutes = require('./routes/assets');
const aiAnalysisRoutes = require('./routes/ai-analysis');
const portfolioHistoryRoutes = require('./routes/portfolioHistory');


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/holdings', holdingsRoutes);
app.use('/api/market', marketDataRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/portfolio-history', portfolioHistoryRoutes);


// Swagger API Documentation
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'swagger-ui.html'));
});

app.get('/api-docs/swagger.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'swagger.json'));
});

// Health check endpoint (必须在通配符路由之前)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Openfolio - Your Portfolio Manager API is running',
    timestamp: new Date().toISOString()
  });
});

// 服务前端静态文件 (仅在生产环境或build文件存在时)
const path = require('path');
const fs = require('fs');
const buildPath = path.join(__dirname, '../frontend/build');

if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));

  // 处理React Router的客户端路由 (放在最后，避免覆盖API路由)
app.get('*', (req, res) => {
    // 只处理非API请求
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
} else {
  console.log('📁 Frontend build not found, serving API only');
  
  // API 404处理
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      res.status(200).json({ 
        message: 'Openfolio - Your Portfolio Manager API is running',
        note: 'Frontend not built. Please run the frontend development server separately.',
        frontend_url: 'http://localhost:3000'
      });
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 🚀 启动服务器并自动初始化数据库
const startServer = async () => {
  try {
    console.log('🔄 正在启动Openfolio - Your Portfolio Manager后端服务...');
    
    // 1. 测试数据库连接
    console.log('🔗 测试数据库连接...');
    await testConnection();
    
    // 2. 自动初始化数据库和表结构
    console.log('🏗️ 自动初始化数据库...');
    const { initializeDatabase } = require('./scripts/initDB');
    await initializeDatabase();
    
    // 3. 生成SQL结构文件
    console.log('📄 生成SQL结构文件...');
    const { generateSQLSchema } = require('./scripts/generateSQL');
    await generateSQLSchema();
    
    // 4. 初始化RocketMQ
    console.log('🚀 初始化RocketMQ消息队列...');
    try {
      await messageManager.initialize();
      console.log('✅ RocketMQ初始化成功');
    } catch (mqError) {
      console.warn('⚠️ RocketMQ初始化失败，将以非消息队列模式运行:', mqError.message);
    }
    
            // 5. 启动HTTP服务器
        app.listen(PORT, () => {
          console.log('');
          console.log('🎉 ===== Openfolio - Your Portfolio Manager 启动成功! =====');
          console.log(`🚀 API服务器: http://localhost:${PORT}`);
          console.log(`📊 管理面板: http://localhost:${PORT}`);
          console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
          console.log(`💾 MySQL数据库: portfolio_manager`);
          console.log(`📁 SQL结构文件: ./database_schema.sql`);
          console.log(`📨 RocketMQ状态: ${messageManager.isHealthy() ? '✅ 已连接' : '❌ 未连接'}`);
          console.log('==========================================');
          
          // 6. 启动定时数据更新服务
          setTimeout(() => {
            scheduledUpdatesService.startAllTasks();
          }, 3000); // 延迟3秒启动，确保数据库完全就绪
        });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

// 优雅关闭处理
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 收到 ${signal} 信号，开始优雅关闭...`);
  
  try {
    // 关闭RocketMQ
    console.log('📨 关闭RocketMQ连接...');
    await messageManager.shutdown();
    
    // 关闭定时任务
    console.log('⏰ 停止定时任务...');
    // scheduledUpdatesService.stopAllTasks(); // 如果有这个方法的话
    
    console.log('✅ 优雅关闭完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 优雅关闭过程中出错:', error);
    process.exit(1);
  }
};

// 监听退出信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  gracefulShutdown('unhandledRejection');
}); 
