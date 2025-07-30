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

    // 使用Yahoo Finance搜索
    const results = await yahooFinanceService.searchStock(query);
    
    // 为搜索结果获取价格数据
    if (results && results.length > 0) {
      const symbols = results.slice(0, 5).map(r => r.symbol);
      const pricesData = await yahooFinanceService.getMultipleStockPrices(symbols);
      
      const enrichedResults = results.slice(0, 5).map(result => {
        const priceData = pricesData.find(p => p.symbol === result.symbol);
        return {
          ...result,
          price: priceData?.price || 0,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || 0,
          volume: priceData?.volume || 0
        };
      });
      
      res.json({
        success: true,
        data: enrichedResults
      });
    } else {
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error('搜索股票失败:', error);
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
    const { limit = 10 } = req.query;
    
    // 热门股票列表
    const trendingSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'CRM'];
    const selectedSymbols = trendingSymbols.slice(0, parseInt(limit));
    
    // 获取实时价格数据
    const stocksData = await yahooFinanceService.getMultipleStockPrices(selectedSymbols);
    
    // 格式化数据
    const trendingStocks = stocksData.map(stock => ({
      symbol: stock.symbol,
      name: stock.name || `${stock.symbol} Inc.`,
      price: stock.price || 0,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
      volume: stock.volume || 0
    }));

    res.json({
      success: true,
      data: trendingStocks
    });
  } catch (error) {
    console.error('获取热门股票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📈 GET /api/market/gainers - 获取涨幅榜
router.get('/gainers', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // 一些活跃股票列表
    const activeSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'CRM', 'ADBE', 'ORCL', 'INTC', 'IBM', 'CSCO'];
    
    // 获取价格数据
    const stocksData = await yahooFinanceService.getMultipleStockPrices(activeSymbols);
    
    // 筛选出涨幅最大的股票
    const gainers = stocksData
      .filter(stock => !stock.error && stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, parseInt(limit))
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name || `${stock.symbol} Inc.`,
        price: stock.price || 0,
        change: stock.change || 0,
        changePercent: stock.changePercent || 0,
        volume: stock.volume || 0
      }));

    res.json({
      success: true,
      data: gainers
    });
  } catch (error) {
    console.error('获取涨幅榜失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📉 GET /api/market/losers - 获取跌幅榜
router.get('/losers', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // 一些活跃股票列表
    const activeSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'CRM', 'ADBE', 'ORCL', 'INTC', 'IBM', 'CSCO'];
    
    // 获取价格数据
    const stocksData = await yahooFinanceService.getMultipleStockPrices(activeSymbols);
    
    // 筛选出跌幅最大的股票
    const losers = stocksData
      .filter(stock => !stock.error && stock.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, parseInt(limit))
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name || `${stock.symbol} Inc.`,
        price: stock.price || 0,
        change: stock.change || 0,
        changePercent: stock.changePercent || 0,
        volume: stock.volume || 0
      }));

    res.json({
      success: true,
      data: losers
    });
  } catch (error) {
    console.error('获取跌幅榜失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 GET /api/market/indices - 获取主要指数
router.get('/indices', async (req, res) => {
  try {
    // 主要市场指数
    const indexSymbols = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, Dow, Nasdaq, Russell 2000
    
    // 获取指数数据
    const indicesData = await yahooFinanceService.getMultipleStockPrices(indexSymbols);
    
    const indices = indicesData.map(index => ({
      symbol: index.symbol,
      name: getIndexName(index.symbol),
      price: index.price || 0,
      change: index.change || 0,
      changePercent: index.changePercent || 0
    }));

    res.json({
      success: true,
      data: indices
    });
  } catch (error) {
    console.error('获取指数数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🧪 GET /api/market/test/:symbol - 测试股票价格获取
router.get('/test/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`🧪 测试获取 ${symbol} 价格...`);
    
    const priceData = await yahooFinanceService.getStockPrice(symbol);
    
    if (priceData && priceData.price && priceData.price > 0) {
      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        price: parseFloat(priceData.price),
        currency: priceData.currency || 'USD',
        marketTime: priceData.regularMarketTime || new Date().toISOString(),
        data: priceData, // 保留完整数据以备调试
        message: `成功获取 ${symbol} 的价格信息`
      });
    } else {
      res.json({
        success: false,
        symbol: symbol.toUpperCase(),
        error: `无法获取 ${symbol} 的有效价格`,
        data: priceData
      });
    }
    
  } catch (error) {
    console.error(`❌ 测试获取 ${symbol} 价格失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      symbol: req.params.symbol
    });
  }
});

// 📈 GET /api/market/history/:symbol - 获取股票历史数据
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1mo' } = req.query; // 默认1个月
    
    console.log(`📊 API请求历史数据: ${symbol} (${period})`);
    
    const historyData = await yahooFinanceService.getStockHistory(symbol, period);
    
    if (historyData.length === 0) {
      return res.json({
        success: false,
        message: `No historical data found for ${symbol}`,
        data: []
      });
    }
    
    res.json({
      success: true,
      data: historyData,
      symbol: symbol.toUpperCase(),
      period: period,
      count: historyData.length
    });
    
  } catch (error) {
    console.error(`❌ 历史数据API错误 (${req.params.symbol}):`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// 辅助函数：获取指数名称
function getIndexName(symbol) {
  const indexNames = {
    '^GSPC': 'S&P 500',
    '^DJI': 'Dow Jones',
    '^IXIC': 'NASDAQ',
    '^RUT': 'Russell 2000'
  };
  return indexNames[symbol] || symbol;
}

module.exports = router; 