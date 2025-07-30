const cron = require('node-cron');
const { Asset, Watchlist } = require('../models/index');
const yahooFinanceService = require('./yahooFinance');
const cryptoService = require('./cryptoService');

// 📅 定时数据更新服务
class ScheduledUpdatesService {
  constructor() {
    this.stockUpdateTask = null;
    this.cryptoUpdateTask = null;
    this.isStockUpdateRunning = false;
    this.isCryptoUpdateRunning = false;
    this.lastStockUpdate = null;
    this.lastCryptoUpdate = null;
    this.updateStats = {
      stockUpdates: 0,
      cryptoUpdates: 0,
      totalErrors: 0,
      lastError: null
    };
  }

  // 🕐 启动所有定时任务
  startAllTasks() {
    console.log('🚀 启动定时数据更新服务...');
    this.startStockUpdates();
    this.startCryptoUpdates();
    console.log('✅ 定时任务已启动');
    console.log('📈 股票数据: 每15分钟更新 (工作日 9:30-16:00 EST)');
    console.log('₿ 加密货币: 每分钟更新 (24/7)');
  }

  // 📈 启动股票数据定时更新 (每15分钟)
  startStockUpdates() {
    // 每15分钟执行一次，但只在股市开市时间
    this.stockUpdateTask = cron.schedule('*/15 * * * *', async () => {
      if (this.isStockUpdateRunning) {
        console.log('⏳ 股票更新任务正在运行中，跳过此次执行');
        return;
      }

      // 检查是否在股市开市时间 (EST: 9:30 AM - 4:00 PM, 周一到周五)
      if (!this.isStockMarketOpen()) {
        console.log('🏢 股票市场未开市，跳过更新');
        return;
      }

      console.log('📈 开始更新股票数据...');
      await this.updateStockPrices();
    });

    console.log('📈 股票数据定时任务已启动 (每15分钟)');
  }

  // ₿ 启动加密货币数据定时更新 (每分钟)
  startCryptoUpdates() {
    // 每分钟执行一次
    this.cryptoUpdateTask = cron.schedule('* * * * *', async () => {
      if (this.isCryptoUpdateRunning) {
        console.log('⏳ 加密货币更新任务正在运行中，跳过此次执行');
        return;
      }

      console.log('₿ 开始更新加密货币数据...');
      await this.updateCryptoPrices();
    });

    console.log('₿ 加密货币数据定时任务已启动 (每分钟)');
  }

  // 🏢 检查股票市场是否开市
  isStockMarketOpen() {
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    // 检查是否为工作日 (周一到周五)
    const dayOfWeek = estTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // 周末不开市
    }

    // 检查时间 (9:30 AM - 4:00 PM EST)
    const hour = estTime.getHours();
    const minute = estTime.getMinutes();
    const currentTime = hour * 60 + minute;
    
    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;     // 4:00 PM
    
    return currentTime >= marketOpen && currentTime <= marketClose;
  }

  // 📈 更新股票价格
  async updateStockPrices() {
    this.isStockUpdateRunning = true;
    
    try {
      // 获取所有使用Yahoo Finance的资产
      const stockAssets = await Asset.findAll({
        where: {
          asset_type: ['stock', 'etf', 'commodity'],
          price_source: 'yahoo_finance',
          is_active: true
        }
      });

      console.log(`📊 找到 ${stockAssets.length} 个Yahoo Finance资产需要更新`);

      let successCount = 0;
      let errorCount = 0;

      // 批量更新股票价格
      for (const asset of stockAssets) {
        try {
          console.log(`🔄 更新 ${asset.symbol}...`);
          
          const priceData = await yahooFinanceService.getStockPrice(asset.source_symbol);
          
          if (!priceData.error && priceData.price > 0) {
            const oldPrice = parseFloat(asset.current_price);
            const newPrice = parseFloat(priceData.price);
            
            await asset.update({
              current_price: newPrice,
              updated_at: new Date()
            });
            
            const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0;
            console.log(`✅ ${asset.symbol}: ${oldPrice} → ${newPrice} (${changePercent.toFixed(2)}%)`);
            successCount++;
          } else {
            console.log(`⚠️ ${asset.symbol}: 无法获取价格数据`);
            errorCount++;
          }
          
          // 避免API限制，每次请求间隔100ms
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ 更新 ${asset.symbol} 失败:`, error.message);
          errorCount++;
        }
      }

      // 更新关注列表中的股票
      await this.updateWatchlistPrices('stock', yahooFinanceService.getStockPrice.bind(yahooFinanceService));

      this.lastStockUpdate = new Date();
      this.updateStats.stockUpdates++;
      
      console.log(`📈 股票更新完成: ${successCount} 成功, ${errorCount} 失败`);
      
    } catch (error) {
      console.error('❌ 股票价格更新失败:', error);
      this.updateStats.totalErrors++;
      this.updateStats.lastError = error.message;
    } finally {
      this.isStockUpdateRunning = false;
    }
  }

  // ₿ 更新加密货币价格
  async updateCryptoPrices() {
    this.isCryptoUpdateRunning = true;
    
    try {
      // 获取所有加密货币资产
      const cryptoAssets = await Asset.findAll({
        where: {
          asset_type: 'crypto',
          price_source: 'coingecko',
          is_active: true
        }
      });

      console.log(`💎 找到 ${cryptoAssets.length} 个加密货币资产需要更新`);

      let successCount = 0;
      let errorCount = 0;

      // 批量更新加密货币价格
      for (const asset of cryptoAssets) {
        try {
          console.log(`🔄 更新 ${asset.symbol}...`);
          
          const priceData = await cryptoService.getCryptoPrice(asset.source_symbol);
          
          if (!priceData.error && priceData.price > 0) {
            const oldPrice = parseFloat(asset.current_price);
            const newPrice = parseFloat(priceData.price);
            
            await asset.update({
              current_price: newPrice,
              updated_at: new Date()
            });
            
            const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0;
            console.log(`✅ ${asset.symbol}: $${oldPrice} → $${newPrice} (${changePercent.toFixed(2)}%)`);
            successCount++;
          } else {
            console.log(`⚠️ ${asset.symbol}: 无法获取价格数据`);
            errorCount++;
          }
          
          // 避免API限制，每次请求间隔50ms
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`❌ 更新 ${asset.symbol} 失败:`, error.message);
          errorCount++;
        }
      }

      // 更新关注列表中的加密货币
      await this.updateWatchlistPrices('crypto', cryptoService.getCryptoPrice.bind(cryptoService));

      this.lastCryptoUpdate = new Date();
      this.updateStats.cryptoUpdates++;
      
      console.log(`₿ 加密货币更新完成: ${successCount} 成功, ${errorCount} 失败`);
      
    } catch (error) {
      console.error('❌ 加密货币价格更新失败:', error);
      this.updateStats.totalErrors++;
      this.updateStats.lastError = error.message;
    } finally {
      this.isCryptoUpdateRunning = false;
    }
  }

  // 📋 更新关注列表价格
  async updateWatchlistPrices(assetType, priceFunction) {
    try {
      const watchlistItems = await Watchlist.findAll({
        where: { asset_type: assetType }
      });

      for (const item of watchlistItems) {
        try {
          const priceData = await priceFunction(item.source_symbol);
          
          if (!priceData.error && priceData.price > 0) {
            const oldPrice = parseFloat(item.current_price);
            const newPrice = parseFloat(priceData.price);
            const change = newPrice - oldPrice;
            const changePercent = oldPrice > 0 ? (change / oldPrice * 100) : 0;
            
            await item.update({
              current_price: newPrice,
              price_change: change,
              price_change_percent: changePercent,
              updated_at: new Date()
            });
          }
        } catch (error) {
          console.error(`❌ 更新关注列表 ${item.symbol} 失败:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ 更新 ${assetType} 关注列表失败:`, error);
    }
  }

  // 🛑 停止所有定时任务
  stopAllTasks() {
    if (this.stockUpdateTask) {
      this.stockUpdateTask.stop();
      console.log('🛑 股票更新任务已停止');
    }
    
    if (this.cryptoUpdateTask) {
      this.cryptoUpdateTask.stop();
      console.log('🛑 加密货币更新任务已停止');
    }
    
    console.log('✅ 所有定时任务已停止');
  }

  // 📊 获取更新统计
  getUpdateStats() {
    return {
      ...this.updateStats,
      lastStockUpdate: this.lastStockUpdate,
      lastCryptoUpdate: this.lastCryptoUpdate,
      isStockUpdateRunning: this.isStockUpdateRunning,
      isCryptoUpdateRunning: this.isCryptoUpdateRunning,
      stockMarketOpen: this.isStockMarketOpen()
    };
  }

  // 🔄 手动触发更新
  async triggerManualUpdate() {
    console.log('🔄 手动触发所有数据更新...');
    
    const promises = [];
    
    if (!this.isStockUpdateRunning) {
      promises.push(this.updateStockPrices());
    }
    
    if (!this.isCryptoUpdateRunning) {
      promises.push(this.updateCryptoPrices());
    }
    
    await Promise.allSettled(promises);
    console.log('✅ 手动更新完成');
  }
}

// 创建单例实例
const scheduledUpdatesService = new ScheduledUpdatesService();

module.exports = scheduledUpdatesService; 