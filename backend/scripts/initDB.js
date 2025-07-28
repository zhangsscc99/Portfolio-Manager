const mysql = require('mysql2/promise');
const { syncDatabase } = require('../models/index');

// 🏗️ 数据库初始化脚本 (优化版)
const initializeDatabase = async () => {
  let connection;
  
  try {
    // 1. 连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'wyt!!010611ABC'
    });

    console.log('🔗 连接到MySQL服务器成功!');

    // 2. 创建数据库（如果不存在）
    await connection.execute('CREATE DATABASE IF NOT EXISTS portfolio_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('📊 数据库 portfolio_manager 创建成功!');

    // 3. 关闭连接
    await connection.end();

    // 4. 使用Sequelize同步表结构
    console.log('🔄 开始同步表结构...');
    await syncDatabase(); // 不强制重建，保留数据
    
    console.log('✅ 数据库表结构同步完成!');
    console.log('📋 数据库表:');
    console.log('   - portfolios (投资组合表)');
    console.log('   - holdings (持仓表)');
    
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase }; 