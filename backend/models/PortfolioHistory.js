const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PortfolioHistory = sequelize.define('portfolio_history', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  portfolio_id: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  total_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
}, {
  tableName: 'portfolio_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = PortfolioHistory;
