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

// Import routes
const portfolioRoutes = require('./routes/portfolio');
const holdingsRoutes = require('./routes/holdings');
const marketDataRoutes = require('./routes/marketData');
const assetsRoutes = require('./routes/assets');

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

// Swagger API Documentation
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'swagger-ui.html'));
});

app.get('/api-docs/swagger.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'swagger.json'));
});

// 服务前端静态文件
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/build')));

// 处理React Router的客户端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Portfolio Manager API is running',
    timestamp: new Date().toISOString()
  });
});

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
    console.log('🔄 正在启动Portfolio Manager后端服务...');
    
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
    
            // 4. 启动HTTP服务器
        app.listen(PORT, () => {
          console.log('');
          console.log('🎉 ===== Portfolio Manager 启动成功! =====');
          console.log(`🚀 API服务器: http://localhost:${PORT}`);
          console.log(`📊 管理面板: http://localhost:${PORT}`);
          console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
          console.log(`💾 MySQL数据库: portfolio_manager`);
          console.log(`📁 SQL结构文件: ./database_schema.sql`);
          console.log('==========================================');
          
          // 5. 启动定时数据更新服务
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