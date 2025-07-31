const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PortfolioAsset = sequelize.define('portfolio_asset', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  portfolio_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: 'portfolio',
      key: 'id'
    }
  },
  asset_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: 'asset',
      key: 'id'
    }
  },
  quantity: { 
    type: DataTypes.DECIMAL(15, 4), 
    allowNull: false,
    defaultValue: 0 
  },
  avg_cost: { 
    type: DataTypes.DECIMAL(15, 4), 
    allowNull: false,
    defaultValue: 0 
  },
  current_price: { 
    type: DataTypes.DECIMAL(15, 4), 
    defaultValue: 0 
  },
  historical_avg_price: { 
    type: DataTypes.DECIMAL(15, 4), 
    allowNull: true 
  },
  currency: { 
    type: DataTypes.STRING(10), 
    defaultValue: 'USD' 
  },
  exchange: { 
    type: DataTypes.STRING(50), 
    allowNull: true 
  },
  price_source: { 
    type: DataTypes.STRING(50), 
    defaultValue: 'manual' 
  },
  source_symbol: { 
    type: DataTypes.STRING(50), 
    allowNull: true 
  },
  purchase_date: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  notes: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  is_active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
  last_updated: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, {
  tableName: 'portfolio_asset',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['portfolio_id', 'asset_id']
    },
    {
      fields: ['portfolio_id']
    },
    {
      fields: ['asset_id']
    }
  ]
});

module.exports = PortfolioAsset; 