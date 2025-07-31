const { syncDatabase } = require('../models/index');

async function main() {
  try {
    console.log('🔄 开始同步数据库...');
    
    // 强制同步（会删除现有表并重新创建）
    await syncDatabase(true);
    
    console.log('✅ 数据库同步完成！');
    console.log('📋 已创建的表:');
    console.log('   - portfolio (投资组合表)');
    console.log('   - asset (资产表)');
    console.log('   - holding (持仓表)');
    console.log('   - transaction (交易表)');
    console.log('   - portfolio_asset (投资组合资产关联表)');
    console.log('   - ai_analysis_report (AI分析报告表)');
    
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    process.exit(1);
  }
}

main(); 