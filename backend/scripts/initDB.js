const mysql = require('mysql2/promise');
const { syncDatabase } = require('../models/index');

const insertMockPortfolioHistory = async (connection, portfolioId = 1, days = 730) => {
  let baseValue = 100000;

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days + 1);

  const insertSQL = `
    INSERT INTO portfolio_history (portfolio_id, date, total_value)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE total_value = VALUES(total_value)
  `;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const dailyChange = (Math.random() * 0.002 - 0.001); // ±0.1%
    baseValue *= (1 + dailyChange);
    const totalValue = parseFloat(baseValue.toFixed(2));
    const formattedDate = date.toISOString().split('T')[0];

    await connection.execute(insertSQL, [portfolioId, formattedDate, totalValue]);
  }

  console.log(`✅ 插入模拟 portfolio_history 数据 ${days} 条`);
};

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
    
    // 🔍 检查 portfolio_history 是否已有数据
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM portfolio_history WHERE portfolio_id = ?',
      [1]
    );

    if (rows[0].count === 0) {
      console.log('📉 portfolio_history 数据为空，开始插入模拟数据...');
      await insertMockPortfolioHistory(connection, 1, 730);
    } else {
      console.log('📊 portfolio_history 已有数据，跳过插入模拟数据');
    }


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