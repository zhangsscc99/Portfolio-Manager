// const mysql = require('mysql2/promise');
// const { syncDatabase } = require('../models/index');
// const db = require('../db');

// // 创建AI聊天相关表
// const createAIChatTables = async () => {
//   try {
//     // 创建AI聊天会话表
//     const createSessionsTable = `
//       CREATE TABLE IF NOT EXISTS ai_chat_sessions (
//         id VARCHAR(255) PRIMARY KEY,
//         portfolio_id INT,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         is_persistent BOOLEAN DEFAULT FALSE,
//         portfolio_context JSON,
//         FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
//         INDEX idx_portfolio_id (portfolio_id),
//         INDEX idx_last_activity (last_activity)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI聊天会话表'
//     `;
    
//     await db.execute(createSessionsTable);
//     console.log('✅ AI聊天会话表创建成功');
    
//     // 创建AI聊天消息表
//     const createMessagesTable = `
//       CREATE TABLE IF NOT EXISTS ai_chat_messages (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         session_id VARCHAR(255) NOT NULL,
//         role ENUM('user', 'assistant', 'system') NOT NULL,
//         content TEXT NOT NULL,
//         timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         is_system_update BOOLEAN DEFAULT FALSE,
//         FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
//         INDEX idx_session_timestamp (session_id, timestamp)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI聊天消息表'
//     `;
    
//     await db.execute(createMessagesTable);
//     console.log('✅ AI聊天消息表创建成功');
    
//   } catch (error) {
//     console.error('❌ 创建AI聊天表失败:', error);
//     // 不抛出错误，让其他功能正常工作
//   }
// };



// // 🏗️ 数据库初始化脚本 (优化版)
// const initializeDatabase = async () => {
//   let connection;
  
//   try {
//     // 1. 连接到MySQL服务器（不指定数据库）
//     connection = await mysql.createConnection({
//       host: 'localhost',
//       port: 3306,
//       user: 'root',
//       password: 'n3u3da!'
//     });

//     console.log('🔗 连接到MySQL服务器成功!');

//     // 2. 创建数据库（如果不存在）
//     await connection.execute('CREATE DATABASE IF NOT EXISTS portfolio_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
//     console.log('📊 数据库 portfolio_manager 创建成功!');

//     // 3. 关闭连接
//     await connection.end();

//     // 4. 使用Sequelize同步表结构
//     console.log('🔄 开始同步表结构...');
//     await syncDatabase(); // 不强制重建，保留数据
    
//     // 5. 创建AI聊天相关表
//     console.log('🤖 创建AI聊天历史表...');
//     await createAIChatTables();
    
//     console.log('✅ 数据库表结构同步完成!');
//     console.log('📋 数据库表:');
//     console.log('   - portfolios (投资组合表)');
//     console.log('   - holdings (持仓表)');
//     console.log('   - ai_chat_sessions (AI聊天会话表)');
//     console.log('   - ai_chat_messages (AI聊天消息表)');
//     console.log('   - ai_analysis_reports (AI分析报告历史表)');
    
//     return true;
//   } catch (error) {
//     console.error('❌ 数据库初始化失败:', error);
//     throw error;
//   } finally {
//     if (connection) {
//       await connection.end();
//     }
//   }
// };

// // 如果直接运行此脚本
// if (require.main === module) {
//   initializeDatabase();
// }

// module.exports = { initializeDatabase }; 



const mysql = require('mysql2/promise');
const { syncDatabase } = require('../models');

const initializeDatabase = async () => {
  let connection;
  
  try {
    // 1. 连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'n3u3da!'
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
    console.log('   - portfolio (投资组合表)');
    console.log('   - asset (资产基础信息表)');
    console.log('   - holding (持仓表)');
    console.log('   - transaction (交易流水表)');
    
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
  initializeDatabase()
    .then(() => {
      console.log('数据库初始化完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };