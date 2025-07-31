const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Holding = sequelize.define('holding', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  holding_id: { 
    type: DataTypes.INTEGER, 
    unique: true,
    defaultValue: () => Math.floor(Math.random() * 1000000) + 100000
  },
  portfolio_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  asset_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  quantity: { 
    type: DataTypes.DECIMAL(15, 6), 
    allowNull: false 
  },
  avg_cost: { 
    type: DataTypes.DECIMAL(15, 4), 
    allowNull: false 
  }
}, {
  tableName: 'holding',
  timestamps: false
});

module.exports = Holding;