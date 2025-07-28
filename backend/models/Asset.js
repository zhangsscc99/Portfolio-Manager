const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 🏦 资产模型 - 支持多种资产类型
const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // 资产基本信息
  symbol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '资产代码/标识 (如: AAPL, BTC, 余额宝)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '资产名称'
  },
  asset_type: {
    type: DataTypes.ENUM('stock', 'crypto', 'bond', 'cash', 'etf', 'commodity'),
    allowNull: false,
    comment: '资产类型'
  },
  
  // 持仓信息
  quantity: {
    type: DataTypes.DECIMAL(15, 8),
    allowNull: false,
    comment: '持有数量'
  },
  avg_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: '平均成本价'
  },
  current_price: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '当前市场价格'
  },
  
  // 市场信息
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
    comment: '计价货币'
  },
  exchange: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '交易所/平台'
  },
  
  // 数据源配置
  price_source: {
    type: DataTypes.ENUM('yahoo_finance', 'coingecko', 'manual', 'coinmarketcap', 'alpha_vantage'),
    defaultValue: 'manual',
    comment: '价格数据源'
  },
  source_symbol: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '数据源中的标识符'
  },
  
  // 组合关联
  portfolio_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'portfolios',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // 状态和分组
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否有效持仓'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '自定义分类标签'
  },
  
  // 购买信息
  purchase_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '购买日期'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
  }
}, {
  tableName: 'assets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['asset_type'] },
    { fields: ['symbol'] },
    { fields: ['portfolio_id'] },
    { fields: ['is_active'] }
  ]
});

// 🧮 业务逻辑方法
Asset.prototype.getCurrentValue = function() {
  return parseFloat(this.current_price) * parseFloat(this.quantity);
};

Asset.prototype.getTotalCost = function() {
  return parseFloat(this.avg_cost) * parseFloat(this.quantity);
};

Asset.prototype.getGainLoss = function() {
  return this.getCurrentValue() - this.getTotalCost();
};

Asset.prototype.getGainLossPercent = function() {
  const totalCost = this.getTotalCost();
  return totalCost > 0 ? (this.getGainLoss() / totalCost) * 100 : 0;
};

Asset.prototype.getPriceChange = function() {
  return parseFloat(this.current_price) - parseFloat(this.avg_cost);
};

module.exports = Asset; 