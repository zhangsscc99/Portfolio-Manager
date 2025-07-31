const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Asset = sequelize.define('asset', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  asset_id: { 
    type: DataTypes.INTEGER, 
    unique: true,
    defaultValue: () => Math.floor(Math.random() * 1000000) + 100000
  },
  symbol: { 
    type: DataTypes.STRING(20), 
    allowNull: false,
    unique: true
  },
  name: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  asset_type: { 
    type: DataTypes.STRING(20), 
    allowNull: false 
  },
  current_price: { 
    type: DataTypes.DECIMAL(15, 4), 
    defaultValue: 0 
  }
}, {
  tableName: 'asset',
  timestamps: false
});

module.exports = Asset;