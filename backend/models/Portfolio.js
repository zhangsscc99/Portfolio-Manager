const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Portfolio = sequelize.define('portfolio', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  portfolio_id: { type: DataTypes.INTEGER, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  total_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'portfolio',
  timestamps: false
});

module.exports = Portfolio;