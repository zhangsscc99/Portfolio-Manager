const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 📚 JavaScript操作MySQL原理解释:
// 1. ORM (Object-Relational Mapping) - 对象关系映射
// 2. 把数据库表映射为JavaScript对象
// 3. 把SQL操作转换为JS方法调用

// 用Sequelize定义Portfolio表结构
const Portfolio = sequelize.define('Portfolio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'My Portfolio'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  total_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: '投资组合总价值'
  },
  cash: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: '现金余额'
  },
  day_change: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: '日变动金额'
  },
  day_change_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: '日变动百分比'
  },

}, {
  tableName: 'portfolios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 📝 暂时注释掉复杂的实例方法，开发阶段先简化
// Portfolio.prototype.updateTotalValue = async function() { ... };
// Portfolio.prototype.getPerformance = async function() { ... };

module.exports = Portfolio; 