// const { sequelize } = require('../config/database');
// const Portfolio = require('./Portfolio');
// const Asset = require('./Asset');
// const Holding = require('./Holding');
// const Transaction = require('./Transaction');
// module.exports = { Portfolio, Asset, Holding, Transaction };
// const Watchlist = require('./Watchlist');
// const AIAnalysisReport = require('./AIAnalysisReport');

// 🔗 定义模型关联关系 - 支持多种资产类型
// 一个投资组合可以有多个持仓 (1:N关系)
// Portfolio.hasMany(Holding, {
//   foreignKey: 'portfolio_id',
//   as: 'holdings',
//   onDelete: 'CASCADE'
// });
// Holding.belongsTo(Portfolio, {
//   foreignKey: 'portfolio_id',
//   as: 'portfolio'
// });

// // 一个投资组合可以有多种资产 (1:N关系)
// Portfolio.hasMany(Asset, {
//   foreignKey: 'portfolio_id',
//   as: 'assets',
//   onDelete: 'CASCADE'
// });
// Asset.belongsTo(Portfolio, {
//   foreignKey: 'portfolio_id',
//   as: 'portfolio'
// });

// // 一个投资组合可以有多个AI分析报告 (1:N关系)
// Portfolio.hasMany(AIAnalysisReport, {
//   foreignKey: 'portfolio_id',
//   as: 'analysisReports',
//   onDelete: 'CASCADE'
// });
// AIAnalysisReport.belongsTo(Portfolio, {
//   foreignKey: 'portfolio_id',
//   as: 'portfolio'
// });

// // 💾 数据库同步函数 - 自动创建表结构
// const syncDatabase = async (force = false) => {
//   try {
//     if (force) {
//       // 🗑️ 删除表时要按相反的依赖顺序（子表 → 父表）
//       console.log('🗑️ 正在删除现有表...');
//       await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
//       await Holding.drop({ cascade: true });
//       console.log('✅ Holdings表删除成功');

//       await AIAnalysisReport.drop({ cascade: true });
//       console.log('✅ AI分析报告历史表删除成功');

//       await Portfolio.drop({ cascade: true });
//       console.log('✅ Portfolios表删除成功');

//       await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
//     }

//     // 🏗️ 创建表时按正常依赖顺序（父表 → 子表）
//     console.log('🏗️ 正在创建表结构...');
//     await Portfolio.sync();
//     console.log('✅ Portfolios表创建成功');

//     await Holding.sync();
//     console.log('✅ Holdings表创建成功');

//     await Asset.sync();
//     console.log('✅ Assets表创建成功');

//     await AIAnalysisReport.sync();
//     console.log('✅ AI分析报告历史表创建成功');

//     await Watchlist.sync();
//     console.log('✅ Watchlist表创建成功');

//     console.log('📊 数据库表结构同步完成!');
//     console.log('📋 数据库表:');
//     console.log('   - portfolios (投资组合表)');
//     console.log('   - holdings (持仓表 - 兼容旧版)');
//     console.log('   - assets (新资产表 - 支持多种类型)');
//     console.log('   - watchlist (关注列表)');
//     console.log('📋 数据库表:');
//     console.log('   - portfolios (投资组合表)');
//     console.log('   - holdings (持仓表)');
//   } catch (error) {
//     console.error('❌ 数据库同步失败:', error);
//     throw error;
//   }
// };

// module.exports = {
//   sequelize,
//   Portfolio,
//   Holding,
//   Asset,
//   Watchlist,
//   AIAnalysisReport,
//   syncDatabase
// }; 



const { sequelize } = require('../config/database');
const Portfolio = require('./portfolio');
const Asset = require('./asset');
const Holding = require('./holding');
const Transaction = require('./transaction');

// 定义模型关联关系
Portfolio.hasMany(Holding, {
  foreignKey: 'portfolio_id',
  as: 'holdings'
});

Holding.belongsTo(Portfolio, {
  foreignKey: 'portfolio_id',
  as: 'portfolio'
});

Asset.hasMany(Holding, {
  foreignKey: 'asset_id',
  as: 'holdings'
});

Holding.belongsTo(Asset, {
  foreignKey: 'asset_id',
  as: 'asset'
});

Holding.hasMany(Transaction, {
  foreignKey: 'holding_id',
  as: 'transactions'
});

Transaction.belongsTo(Holding, {
  foreignKey: 'holding_id',
  as: 'holding'
});

const syncDatabase = async (force = false) => {
  try {
    if (force) {
      console.log('正在删除现有表...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
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
  syncDatabase
};

