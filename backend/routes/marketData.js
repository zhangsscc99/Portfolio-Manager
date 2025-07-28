const express = require('express');
const router = express.Router();
const yahooFinanceService = require('../services/yahooFinance');
const { Portfolio, Holding } = require('../models/index');
const cron = require('node-cron');

// 🔄 定时更新股票价格 (每5分钟)
const scheduleStockUpdates = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🔄 开始定时更新股票价格...');
      
      // 获取所有唯一的股票代码
      const holdings = await Holding.findAll({
        attributes: ['symbol'],
        group: ['symbol']
      });
      
      const symbols = holdings.map(h => h.symbol);
      if (symbols.length === 0) return;
      
      // 批量获取最新价格
      const prices = await yahooFinanceService.getMultipleStockPrices(symbols);
      
      // 更新数据库中的价格
      for (const priceData of prices) {
        if (!priceData.error && priceData.price > 0) {
          await Holding.update(
            { current_price: priceData.price },
            { where: { symbol: priceData.symbol } }
          );
        }
      }
      
      console.log(`✅ 已更新 ${prices.length} 个股票价格`);
    } catch (error) {
      console.error('❌ 定时更新股票价格失败:', error);
    }
  });
  
  console.log('⏰ 股票价格定时更新已启动 (每5分钟)');
};

// 启动定时任务
scheduleStockUpdates();

// 📊 GET /api/market/quote/:symbol - 获取单个股票报价
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinanceService.getStockPrice(symbol);
    
    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📈 GET /api/market/quotes - 批量获取股票报价
router.get('/quotes', async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        success: false,
        error: 'symbols参数是必需的，例如: ?symbols=AAPL,MSFT,GOOGL'
      });
    }
    
    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
    const quotes = await yahooFinanceService.getMultipleStockPrices(symbolArray);
    
    res.json({
      success: true,
      data: quotes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔍 GET /api/market/search/:query - 搜索股票
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchResults = await yahooFinanceService.searchStock(query);
    
    res.json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📰 GET /api/market/news/:symbol - 获取股票新闻
router.get('/news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { count = 5 } = req.query;
    
    const news = await yahooFinanceService.getStockNews(symbol, parseInt(count));
    
    res.json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔄 POST /api/market/update-holdings - 更新投资组合中的股票价格
router.post('/update-holdings', async (req, res) => {
  try {
    console.log('🔄 手动更新投资组合股票价格...');
    
    // 获取所有唯一的股票代码
    const holdings = await Holding.findAll({
      attributes: ['symbol'],
      group: ['symbol']
    });
    
    const symbols = holdings.map(h => h.symbol);
    if (symbols.length === 0) {
      return res.json({
        success: true,
        message: '没有找到需要更新的股票'
      });
    }
    
    // 批量获取最新价格
    const prices = await yahooFinanceService.getMultipleStockPrices(symbols);
    const updatedCount = { success: 0, failed: 0 };
    
    // 更新数据库中的价格
    for (const priceData of prices) {
      if (!priceData.error && priceData.price > 0) {
        await Holding.update(
          { current_price: priceData.price },
          { where: { symbol: priceData.symbol } }
        );
        updatedCount.success++;
      } else {
        updatedCount.failed++;
      }
    }
    
    res.json({
      success: true,
      message: `价格更新完成: 成功${updatedCount.success}个，失败${updatedCount.failed}个`,
      data: {
        totalSymbols: symbols.length,
        updatedSuccessfully: updatedCount.success,
        updateFailed: updatedCount.failed,
        prices: prices
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 GET /api/market/cache-stats - 获取缓存统计
router.get('/cache-stats', (req, res) => {
  try {
    const stats = yahooFinanceService.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/market/cache - 清除缓存
router.delete('/cache', (req, res) => {
  try {
    yahooFinanceService.clearCache();
    
    res.json({
      success: true,
      message: '股票数据缓存已清除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔥 GET /api/market/trending - 获取热门股票 (使用真实数据)
router.get('/trending', async (req, res) => {
  try {
    const trendingSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
    const quotes = await yahooFinanceService.getMultipleStockPrices(trendingSymbols);
    
    // 按涨跌幅排序
    const sorted = quotes
      .filter(q => !q.error)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    
    res.json({
      success: true,
      data: sorted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📈 GET /api/market/gainers - 获取涨幅榜 
router.get('/gainers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'CRM'];
    const quotes = await yahooFinanceService.getMultipleStockPrices(symbols);
    
    const gainers = quotes
      .filter(q => !q.error && q.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);
    
    res.json({
      success: true,
      data: gainers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📉 GET /api/market/losers - 获取跌幅榜
router.get('/losers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'CRM'];
    const quotes = await yahooFinanceService.getMultipleStockPrices(symbols);
    
    const losers = quotes
      .filter(q => !q.error && q.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);
    
    res.json({
      success: true,
      data: losers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 GET /api/market/indices - 获取主要指数
router.get('/indices', async (req, res) => {
  try {
    const indexSymbols = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, Dow, Nasdaq, Russell 2000
    const quotes = await yahooFinanceService.getMultipleStockPrices(indexSymbols);
    
    res.json({
      success: true,
      data: quotes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 