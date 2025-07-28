const { sequelize } = require('../config/database');
const User = require('./User');
const Portfolio = require('./Portfolio');
const Holding = require('./Holding');

// 🔗 暂时简化关联关系，先让表创建成功
// 开发阶段先不设置复杂的关联，避免同步错误

// 💾 数据库同步函数 - 自动创建表结构
const syncDatabase = async (force = false) => {
  try {
    if (force) {
      // 🗑️ 删除表时要按相反的依赖顺序（子表 → 父表）
      console.log('🗑️ 正在删除现有表...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      await Holding.drop({ cascade: true });
      console.log('✅ Holding表删除成功');
      
      await Portfolio.drop({ cascade: true });
      console.log('✅ Portfolio表删除成功');
      
      await User.drop({ cascade: true });
      console.log('✅ User表删除成功');
      
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    // 🏗️ 创建表时按正常依赖顺序（父表 → 子表）
    console.log('🏗️ 正在创建表结构...');
    await User.sync();
    console.log('✅ User表创建成功');
    
    await Portfolio.sync();
    console.log('✅ Portfolio表创建成功');
    
    await Holding.sync();
    console.log('✅ Holding表创建成功');
    
    console.log('📊 数据库表结构同步成功!');
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Portfolio,
  Holding,
  syncDatabase
}; 