const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 用Sequelize定义User表结构 - 这就是JS操作MySQL的核心原理
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',        // 指定表名
  timestamps: false          // 不自动添加createdAt/updatedAt
});

module.exports = User; 