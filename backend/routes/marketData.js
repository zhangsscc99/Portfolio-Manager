const express = require('express');
const router = express.Router();
const yahooFinanceService = require('../services/yahooFinance');
const scheduledUpdatesService = require('../services/scheduledUpdates');
const { Holding } = require('../models/index');
const cron = require('node-cron');

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
        error: 'Missing symbols parameter'
      });
    }

    const symbolList = symbols.split(',').map(s => s.trim());
    const quotes = await yahooFinanceService.getMultipleStockPrices(symbolList);

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

// 🔍 GET /api/market/search - 搜索股票
router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Missing search query'
      });
    }

    const results = await yahooFinanceService.searchStock(query);
    res.json({
      success: true,
      data: results
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
    const news = await yahooFinanceService.getStockNews(symbol);

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

// 🔄 POST /api/market/update-holdings - 更新持仓价格
router.post('/update-holdings', async (req, res) => {
  try {
    const holdings = await Holding.findAll();
    const updatePromises = holdings.map(async (holding) => {
      try {
        const quote = await yahooFinanceService.getStockPrice(holding.symbol);
        if (!quote.error && quote.price > 0) {
          await holding.updatePrice(quote.price);
          return { symbol: holding.symbol, success: true, price: quote.price };
        }
        return { symbol: holding.symbol, success: false, error: 'Invalid price data' };
      } catch (error) {
        return { symbol: holding.symbol, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(updatePromises);
    const updatedResults = results.map(result => 
      result.status === 'fulfilled' ? result.value : { success: false, error: result.reason.message }
    );

    res.json({
      success: true,
      data: {
        totalHoldings: holdings.length,
        results: updatedResults
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 GET /api/market/stats - 获取定时更新统计
router.get('/stats', async (req, res) => {
  try {
    const stats = scheduledUpdatesService.getUpdateStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        cacheStats: yahooFinanceService.getCacheStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔄 POST /api/market/trigger-update - 手动触发价格更新
router.post('/trigger-update', async (req, res) => {
  try {
    await scheduledUpdatesService.triggerManualUpdate();
    
    res.json({
      success: true,
      message: 'Manual update triggered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🛑 POST /api/market/stop-scheduler - 停止定时任务
router.post('/stop-scheduler', async (req, res) => {
  try {
    scheduledUpdatesService.stopAllTasks();
    
    res.json({
      success: true,
      message: 'Scheduled tasks stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🚀 POST /api/market/start-scheduler - 启动定时任务
router.post('/start-scheduler', async (req, res) => {
  try {
    scheduledUpdatesService.startAllTasks();
    
    res.json({
      success: true,
      message: 'Scheduled tasks started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📈 GET /api/market/cache-stats - 获取缓存统计
router.get('/cache-stats', async (req, res) => {
  try {
    const cacheStats = yahooFinanceService.getCacheStats();
    
    res.json({
      success: true,
      data: cacheStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/market/clear-cache - 清除缓存
router.delete('/clear-cache', async (req, res) => {
  try {
    yahooFinanceService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔥 GET /api/market/trending - 获取热门股票
router.get('/trending', async (req, res) => {
  try {
    // 模拟热门股票数据
    const trendingStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', change: '+2.34%' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', change: '+1.87%' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', change: '+0.92%' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', change: '+1.43%' },
      { symbol: 'TSLA', name: 'Tesla Inc.', change: '-0.76%' }
    ];

    res.json({
      success: true,
      data: trendingStocks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 