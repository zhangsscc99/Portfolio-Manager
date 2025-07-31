const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIAnalysisReport = sequelize.define('ai_analysis_report', {
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
  portfolio_value: { 
    type: DataTypes.DECIMAL(15, 4), 
    defaultValue: 0 
  },
  overall_score: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  },
  risk_level: { 
    type: DataTypes.STRING(20), 
    defaultValue: 'Medium' 
  },
  total_return: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true 
  },
  sharpe_ratio: { 
    type: DataTypes.DECIMAL(10, 4), 
    allowNull: true 
  },
  key_insights: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  recommendations: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  risk_factors: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  stock_analysis: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  raw_analysis_data: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  timestamp: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, {
  tableName: 'ai_analysis_report',
  timestamps: true,
  indexes: [
    {
      fields: ['portfolio_id']
    },
    {
      fields: ['timestamp']
    }
  ]
});

module.exports = AIAnalysisReport; 