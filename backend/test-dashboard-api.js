const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testDashboardAPI() {
  try {
    console.log('🧪 测试Dashboard API...');
    
    // 测试dashboard端点
    const response = await axios.get(`${BASE_URL}/portfolio/dashboard/1`);
    
    console.log('✅ Dashboard API响应:');
    console.log('状态:', response.status);
    console.log('成功:', response.data.success);
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('\n📊 Dashboard数据:');
      console.log('总投资组合价值:', data.totalValue);
      console.log('总盈亏:', data.totalGainLoss);
      console.log('总盈亏百分比:', data.totalGainLossPercent);
      console.log('持仓数量:', data.holdingsCount);
      console.log('现金:', data.cash);
      
      console.log('\n📈 性能数据:');
      console.log('今日变化:', data.performance.todayChange);
      console.log('今日变化百分比:', data.performance.todayChangePercent);
      
      console.log('\n🍰 资产配置:');
      Object.entries(data.allocation).forEach(([type, info]) => {
        console.log(`${type}: $${info.totalValue} (${info.count} holdings)`);
      });
      
      console.log('\n📋 前5个持仓:');
      data.topHoldings.forEach((holding, index) => {
        console.log(`${index + 1}. ${holding.symbol}: ${holding.quantity} shares @ $${holding.currentPrice}`);
      });
      
      console.log('\n📈 历史数据:');
      console.log('标签:', data.history.labels);
      console.log('数值:', data.history.values);
      
    } else {
      console.log('❌ API返回失败:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testDashboardAPI(); 