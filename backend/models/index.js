const { sequelize } = require('../config/database');
const Portfolio = require('./portfolio');
const Asset = require('./asset');
const Holding = require('./holding');
const Transaction = require('./transaction');
const PortfolioAsset = require('./PortfolioAsset');
const AIAnalysisReport = require('./AIAnalysisReport');

// 定义模型关联关系
// Portfolio.hasMany(Holding, {
//   foreignKey: 'portfolio_id',
//   as: 'holdings'
// });

// Holding.belongsTo(Portfolio, {
//   foreignKey: 'portfolio_id',
//   as: 'portfolio'
// });

// Asset.hasMany(Holding, {
//   foreignKey: 'asset_id',
//   as: 'holdings'
// });

// Holding.belongsTo(Asset, {
//   foreignKey: 'asset_id',
//   as: 'asset'
// });

// Holding.hasMany(Transaction, {
//   foreignKey: 'holding_id',
//   as: 'transactions'
// });

// Transaction.belongsTo(Holding, {
//   foreignKey: 'holding_id',
//   as: 'holding'
// });

// 新的关联关系
Portfolio.hasMany(PortfolioAsset, {
  foreignKey: 'portfolio_id',
  as: 'portfolioAssets'
});

PortfolioAsset.belongsTo(Portfolio, {
  foreignKey: 'portfolio_id',
  as: 'portfolio'
});

Asset.hasMany(PortfolioAsset, {
  foreignKey: 'asset_id',
  as: 'portfolioAssets'
});

PortfolioAsset.belongsTo(Asset, {
  foreignKey: 'asset_id',
  as: 'asset'
});

Portfolio.hasMany(AIAnalysisReport, {
  foreignKey: 'portfolio_id',
  as: 'analysisReports'
});

AIAnalysisReport.belongsTo(Portfolio, {
  foreignKey: 'portfolio_id',
  as: 'portfolio'
});

const syncDatabase = async (force = false) => {
  try {
    if (force) {
      console.log('正在删除现有表...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      
      await AIAnalysisReport.drop({ cascade: true });
      console.log('✅ AIAnalysisReport表删除成功');
      
      await PortfolioAsset.drop({ cascade: true });
      console.log('✅ PortfolioAsset表删除成功');
      
      await Transaction.drop({ cascade: true });
      console.log('✅ Transaction表删除成功');
      
      await Holding.drop({ cascade: true });
      console.log('✅ Holding表删除成功');
      
      await Asset.drop({ cascade: true });
      console.log('✅ Asset表删除成功');
      
      await Portfolio.drop({ cascade: true });
      console.log('✅ Portfolio表删除成功');
      
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    console.log('正在创建表结构...');
    await Portfolio.sync();
    console.log('✅ Portfolio表创建成功');
    
    await Asset.sync();
    console.log('✅ Asset表创建成功');
    
    await Holding.sync();
    console.log('✅ Holding表创建成功');
    
    await Transaction.sync();
    console.log('✅ Transaction表创建成功');
    
    await PortfolioAsset.sync();
    console.log('✅ PortfolioAsset表创建成功');
    
    await AIAnalysisReport.sync();
    console.log('✅ AIAnalysisReport表创建成功');
    
    console.log('数据库表结构同步完成!');

  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Portfolio,
  Asset,
  Holding,
  Transaction,
  PortfolioAsset,
  AIAnalysisReport,
  syncDatabase
};

