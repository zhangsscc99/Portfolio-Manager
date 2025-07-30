const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 📊 AI分析报告历史模型
// 用于存储每次AI分析的结果，供Analytics页面历史查看
const AIAnalysisReport = sequelize.define('AIAnalysisReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '报告ID'
  },
  portfolio_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '投资组合ID',
    references: {
      model: 'portfolios',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '生成时间'
  },
  portfolio_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: '投资组合价值'
  },
  overall_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总体评分 (0-100)'
  },
  risk_level: {
    type: DataTypes.STRING(20),
    defaultValue: 'Medium',
    comment: '风险等级'
  },
  total_return: {
    type: DataTypes.STRING(10),
    defaultValue: '+0%',
    comment: '总回报率'
  },
  sharpe_ratio: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: '夏普比率'
  },
  key_insights: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '关键洞察 (JSON数组)'
  },
  recommendations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '投资建议 (JSON数组)'
  },
  risk_factors: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '风险因素 (JSON数组)'
  },
  stock_analysis: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '个股分析 (JSON对象)'
  },
  raw_analysis_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '完整分析数据 (JSON对象)'
  }
}, {
  tableName: 'ai_analysis_reports',
  timestamps: true, // 自动添加createdAt和updatedAt
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: 'AI分析报告历史表',
  indexes: [
    {
      fields: ['portfolio_id']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['overall_score']
    }
  ]
});

module.exports = AIAnalysisReport; 