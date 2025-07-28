const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 📋 关注列表模型
const Watchlist = sequelize.define('Watchlist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  symbol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '资产代码'
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
  current_price: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '当前价格'
  },
  price_change: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '价格变动'
  },
  price_change_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: '价格变动百分比'
  },
  price_source: {
    type: DataTypes.ENUM('yahoo_finance', 'coingecko', 'manual', 'coinmarketcap'),
    defaultValue: 'yahoo_finance',
    comment: '价格数据源'
  },
  source_symbol: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '数据源标识符'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
    comment: '计价货币'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'watchlist',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['symbol'], unique: true },
    { fields: ['asset_type'] }
  ]
});

module.exports = Watchlist; 