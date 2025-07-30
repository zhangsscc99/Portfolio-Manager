const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('transaction', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  transaction_id: { 
    type: DataTypes.INTEGER, 
    unique: true,
    defaultValue: () => Math.floor(Math.random() * 1000000) + 100000
  },
  holding_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  trade_type: { 
    type: DataTypes.ENUM('buy','sell'), 
    allowNull: false 
  },
  quantity: { 
    type: DataTypes.DECIMAL(15, 6), 
    allowNull: false 
  },
  price: { 
    type: DataTypes.DECIMAL(15, 4), 
    allowNull: false 
  },
  trade_time: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, {
  tableName: 'transaction',
  timestamps: false
});

module.exports = Transaction;