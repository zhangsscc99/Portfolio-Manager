const { Sequelize } = require('sequelize');

// 🔧 数据库配置 - 由于env文件被阻止，直接设置
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  database: 'portfolio_manager',
  username: 'root',
  password: 'wyt!!010611ABC'
};

// 创建Sequelize实例 - 这是连接MySQL的核心原理：
// 1. 建立TCP连接到MySQL服务器
// 2. 创建连接池管理多个连接
// 3. 提供ORM接口将JS对象映射到SQL操作
const sequelize = new Sequelize(
  DB_CONFIG.database,
  DB_CONFIG.username,
  DB_CONFIG.password,
  {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: 'mysql',
    logging: false, // 生产环境建议关闭SQL日志
    pool: {
      max: 5,        // 连接池最大连接数
      min: 0,        // 连接池最小连接数
      acquire: 30000, // 获取连接超时时间
      idle: 10000    // 连接空闲超时时间
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL数据库连接成功!');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
  }
};

module.exports = { sequelize, testConnection }; 