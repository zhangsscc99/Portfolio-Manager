const { sequelize } = require('../config/database');
const Portfolio = require('./Portfolio');
const Holding = require('./Holding');

// 🔗 定义模型关联关系 - 简化版 (无用户管理)
// 一个投资组合可以有多个持仓 (1:N关系)
Portfolio.hasMany(Holding, {
  foreignKey: 'portfolio_id',
  as: 'holdings',
  onDelete: 'CASCADE'
});
Holding.belongsTo(Portfolio, {
  foreignKey: 'portfolio_id',
  as: 'portfolio'
});

// 💾 数据库同步函数 - 自动创建表结构
const syncDatabase = async (force = false) => {
  try {
    if (force) {
      // 🗑️ 删除表时要按相反的依赖顺序（子表 → 父表）
      console.log('🗑️ 正在删除现有表...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      await Holding.drop({ cascade: true });
      console.log('✅ Holdings表删除成功');
      
      await Portfolio.drop({ cascade: true });
      console.log('✅ Portfolios表删除成功');
      
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    // 🏗️ 创建表时按正常依赖顺序（父表 → 子表）
    console.log('🏗️ 正在创建表结构...');
    await Portfolio.sync();
    console.log('✅ Portfolios表创建成功');
    
    await Holding.sync();
    console.log('✅ Holdings表创建成功');
    
    console.log('📊 数据库表结构同步成功!');
    console.log('📋 数据库表:');
    console.log('   - portfolios (投资组合表)');
    console.log('   - holdings (持仓表)');
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Portfolio,
  Holding,
  syncDatabase
}; 