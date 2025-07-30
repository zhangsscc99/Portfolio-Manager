const fs = require('fs');
const path = require('path');

// 📄 生成数据库结构SQL文件
const generateSQLSchema = async () => {
  try {
    const sqlContent = `-- =========================================
-- Portfolio Manager 数据库结构
-- 生成时间: ${new Date().toLocaleString()}
-- 数据库: portfolio_manager
-- 字符集: utf8mb4
-- =========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS portfolio_manager 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE portfolio_manager;

-- =========================================
-- 1. 投资组合表 (portfolios)
-- =========================================
CREATE TABLE IF NOT EXISTS portfolios (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '投资组合ID',
  name VARCHAR(100) NOT NULL DEFAULT 'My Portfolio' COMMENT '投资组合名称',
  description TEXT COMMENT '描述',
  total_value DECIMAL(15,2) DEFAULT 0.00 COMMENT '投资组合总价值',
  cash DECIMAL(15,2) DEFAULT 0.00 COMMENT '现金余额',
  day_change DECIMAL(15,2) DEFAULT 0.00 COMMENT '日变动金额',
  day_change_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT '日变动百分比',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投资组合表';

-- =========================================
-- 2. 持仓表 (holdings)
-- =========================================
CREATE TABLE IF NOT EXISTS holdings (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '持仓ID',
  symbol VARCHAR(10) NOT NULL COMMENT '股票代码 (如: AAPL, MSFT)',
  name VARCHAR(100) NOT NULL COMMENT '股票名称',
  type ENUM('stock', 'bond', 'etf', 'crypto', 'cash') DEFAULT 'stock' COMMENT '投资类型',
  quantity DECIMAL(15,8) NOT NULL COMMENT '持仓数量',
  avg_price DECIMAL(10,2) NOT NULL COMMENT '平均买入价格',
  current_price DECIMAL(10,2) NOT NULL COMMENT '当前市场价格',
  portfolio_id INT COMMENT '所属投资组合ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_symbol (symbol),
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_type (type),
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='持仓表';

-- =========================================
-- 插入示例数据
-- =========================================

-- 示例投资组合
-- INSERT IGNORE INTO portfolios (id, name, description, total_value, cash, created_at) VALUES 
-- (1, 'My Investment Portfolio', 'Main investment portfolio', 50000.00, 25000.00, NOW());

-- 示例持仓
-- INSERT IGNORE INTO holdings (symbol, name, type, quantity, avg_price, current_price, portfolio_id, created_at) VALUES 
-- ('AAPL', 'Apple Inc.', 'stock', 10.00000000, 150.00, 175.25, 1, NOW()),
-- ('GOOGL', 'Alphabet Inc.', 'stock', 5.00000000, 2500.00, 2680.50, 1, NOW()),
-- ('MSFT', 'Microsoft Corporation', 'stock', 8.00000000, 300.00, 315.75, 1, NOW()),
-- ('TSLA', 'Tesla Inc.', 'stock', 3.00000000, 800.00, 245.60, 1, NOW()),
-- ('AMZN', 'Amazon.com Inc.', 'stock', 2.00000000, 3200.00, 3150.80, 1, NOW());

-- =========================================
-- 常用查询示例
-- =========================================

-- 查看所有投资组合
-- SELECT * FROM portfolios;

-- 查看某个投资组合的所有持仓
-- SELECT * FROM holdings WHERE portfolio_id = 1;

-- 计算投资组合总价值
-- SELECT 
--   p.name,
--   p.cash,
--   SUM(h.quantity * h.current_price) as holdings_value,
--   (p.cash + SUM(h.quantity * h.current_price)) as total_value
-- FROM portfolios p
-- LEFT JOIN holdings h ON p.id = h.portfolio_id
-- GROUP BY p.id;

-- 查看盈亏情况
-- SELECT 
--   h.symbol,
--   h.name,
--   h.quantity,
--   h.avg_price,
--   h.current_price,
--   (h.current_price - h.avg_price) as price_change,
--   ((h.current_price - h.avg_price) / h.avg_price * 100) as change_percent,
--   (h.quantity * h.current_price) as current_value,
--   (h.quantity * h.avg_price) as cost_basis,
--   (h.quantity * (h.current_price - h.avg_price)) as unrealized_gain_loss
-- FROM holdings h
-- WHERE h.portfolio_id = 1;

-- =========================================
-- 数据库维护
-- =========================================

-- 查看表结构
-- DESCRIBE portfolios;
-- DESCRIBE holdings;

-- 查看索引
-- SHOW INDEX FROM portfolios;
-- SHOW INDEX FROM holdings;

-- 数据库大小
-- SELECT 
--   table_schema as '数据库',
--   table_name as '表名',
--   round(((data_length + index_length) / 1024 / 1024), 2) as '大小(MB)'
-- FROM information_schema.tables 
-- WHERE table_schema = 'portfolio_manager';
`;

    const filePath = path.join(__dirname, '..', 'database_schema.sql');
    fs.writeFileSync(filePath, sqlContent, 'utf8');
    
    console.log(`✅ SQL结构文件已生成: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('❌ 生成SQL文件失败:', error);
    throw error;
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  generateSQLSchema();
}

module.exports = { generateSQLSchema }; 