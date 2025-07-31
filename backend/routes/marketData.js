const express = require("express");
const router = express.Router();
const yahooFinanceService = require("../services/yahooFinance");
const cryptoService = require("../services/cryptoService"); // 添加crypto服务
const scheduledUpdatesService = require("../services/scheduledUpdates");
const { Holding } = require("../models/index");
const { HttpsProxyAgent } = require("https-proxy-agent");
// 设置代理地址
// const proxy = "http://127.0.0.1:7777"; // 替换为你的代理地址
// const agent = new HttpsProxyAgent(proxy);
const axios = require("axios");

// 📊 GET /api/market/quote/:symbol - 获取单个股票报价
router.get("/quote/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinanceService.getStockPrice(symbol);

    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 📈 GET /api/market/quotes - 批量获取股票报价
router.get("/quotes", async (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) {
      return res.status(400).json({
        success: false,
        error: "Missing symbols parameter",
      });
    }

    const symbolList = symbols.split(",").map((s) => s.trim());
    const quotes = await yahooFinanceService.getMultipleStockPrices(symbolList);

    res.json({
      success: true,
      data: quotes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔍 GET /api/market/search - 搜索股票
router.get("/search", async (req, res) => {
  try {
    const { q: query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Missing search query",
      });
    }

    // 使用Yahoo Finance搜索
    const results = await yahooFinanceService.searchStock(query);

    // 为搜索结果获取价格数据
    if (results && results.length > 0) {
      const symbols = results.slice(0, 5).map((r) => r.symbol);
      const pricesData = await yahooFinanceService.getMultipleStockPrices(
        symbols
      );

      const enrichedResults = results.slice(0, 5).map((result) => {
        const priceData = pricesData.find((p) => p.symbol === result.symbol);
        return {
          ...result,
          price: priceData?.price || 0,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || 0,
          volume: priceData?.volume || 0,
        };
      });

      res.json({
        success: true,
        data: enrichedResults,
      });
    } else {
      res.json({
        success: true,
        data: [],
      });
    }
  } catch (error) {
    console.error("搜索股票失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 📰 GET /api/market/news/:symbol - 获取股票新闻
router.get("/news/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const news = await yahooFinanceService.getStockNews(symbol);

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔄 POST /api/market/update-holdings - 更新持仓价格
router.post("/update-holdings", async (req, res) => {
  try {
    const holdings = await Holding.findAll();
    const updatePromises = holdings.map(async (holding) => {
      try {
        const quote = await yahooFinanceService.getStockPrice(holding.symbol);
        if (!quote.error && quote.price > 0) {
          await holding.updatePrice(quote.price);
          return { symbol: holding.symbol, success: true, price: quote.price };
        }
        return {
          symbol: holding.symbol,
          success: false,
          error: "Invalid price data",
        };
      } catch (error) {
        return { symbol: holding.symbol, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(updatePromises);
    const updatedResults = results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : { success: false, error: result.reason.message }
    );

    res.json({
      success: true,
      data: {
        totalHoldings: holdings.length,
        results: updatedResults,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 📊 GET /api/market/stats - 获取定时更新统计
router.get("/stats", async (req, res) => {
  try {
    const stats = scheduledUpdatesService.getUpdateStats();

    res.json({
      success: true,
      data: {
        ...stats,
        cacheStats: yahooFinanceService.getCacheStats(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔄 POST /api/market/trigger-update - 手动触发价格更新
router.post("/trigger-update", async (req, res) => {
  try {
    await scheduledUpdatesService.triggerManualUpdate();

    res.json({
      success: true,
      message: "Manual update triggered successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🛑 POST /api/market/stop-scheduler - 停止定时任务
router.post("/stop-scheduler", async (req, res) => {
  try {
    scheduledUpdatesService.stopAllTasks();

    res.json({
      success: true,
      message: "Scheduled tasks stopped",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🚀 POST /api/market/start-scheduler - 启动定时任务
router.post("/start-scheduler", async (req, res) => {
  try {
    scheduledUpdatesService.startAllTasks();

    res.json({
      success: true,
      message: "Scheduled tasks started",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 📈 GET /api/market/cache-stats - 获取缓存统计
router.get("/cache-stats", async (req, res) => {
  try {
    const cacheStats = yahooFinanceService.getCacheStats();

    res.json({
      success: true,
      data: cacheStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🗑️ DELETE /api/market/clear-cache - 清除缓存
router.delete("/clear-cache", async (req, res) => {
  try {
    yahooFinanceService.clearCache();

    res.json({
      success: true,
      message: "Cache cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/most-active", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const offset = (page - 1) * limit;
    const apiURL = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${limit}&formatted=true&scrIds=MOST_ACTIVES&sortField=&sortType=&start=${offset}&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CaverageDailyVolume3Month%2CmarketCap%2CtrailingPE%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange%2CregularMarketOpen&lang=en-US&region=US`;

    const response = await axios.get(apiURL, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const result = response.data.finance?.result?.[0];
    const quotes = result?.quotes || [];
    const totalRecords = result?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    // 使用 fmt 字段构造简化后的数据结构
    const formattedStocks = quotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      volume: item.regularMarketVolume?.fmt || "N/A",
      avgVolume: item.averageDailyVolume3Month?.fmt || "N/A",
      marketCap: item.marketCap?.fmt || "N/A",
      peRatio: item.trailingPE?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
      open: item.regularMarketOpen?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取最活跃股票数据。",
      data: formattedStocks,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取最活跃股票数据时发生错误:", error);
    const statusCode = error.response?.status || 500;

    return res.status(statusCode).json({
      success: false,
      message: "获取最活跃股票数据时失败。",
      error: error.message,
    });
  }
});

// 🔥 GET /api/market/trending - 获取热门股票 (带分页和总记录数)
router.get("/trending", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/trending/US?count=25&fields=logoUrl%2ClongName%2CshortName%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketPrice%2Cticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CaverageDailyVolume3Month%2CmarketCap%2CtrailingPE%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange%2CregularMarketOpen&format=true&useQuotes=true&quoteType=equity&lang=en-US&region=US`;

    const response = await axios.get(url, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const quotes = response.data.finance?.result?.[0]?.quotes || [];
    const totalRecords = quotes.length;
    const totalPages = Math.ceil(totalRecords / limit);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paged = quotes.slice(startIndex, endIndex);

    const trendingStocks = paged.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      volume: item.regularMarketVolume?.fmt || "N/A",
      avgVolume: item.averageDailyVolume3Month?.fmt || "N/A",
      marketCap: item.marketCap?.fmt || "N/A",
      peRatio: item.trailingPE?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
      open: item.regularMarketOpen?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取热门趋势股票数据。",
      data: trendingStocks,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取热门趋势股票数据失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取热门趋势股票失败。",
      error: error.message,
    });
  }
});

// 📈 GET /api/market/gainers - 获取涨幅榜 (带分页和总记录数)
router.get("/gainers", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const offset = (page - 1) * limit;
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${limit}&formatted=true&scrIds=DAY_GAINERS&sortField=&sortType=&start=${offset}&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CaverageDailyVolume3Month%2CmarketCap%2CtrailingPE%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange%2CregularMarketOpen&lang=en-US&region=US`;

    const response = await axios.get(url, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const result = response.data.finance?.result?.[0];
    const quotes = result?.quotes || [];
    const totalRecords = result?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const gainers = quotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      volume: item.regularMarketVolume?.fmt || "N/A",
      avgVolume: item.averageDailyVolume3Month?.fmt || "N/A",
      marketCap: item.marketCap?.fmt || "N/A",
      peRatio: item.trailingPE?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
      open: item.regularMarketOpen?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取日涨幅股票数据。",
      data: gainers,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取涨幅股票失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取涨幅股票失败。",
      error: error.message,
    });
  }
});

// 📉 GET /api/market/losers - 获取跌幅榜 (带分页和总记录数)
router.get("/losers", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const offset = (page - 1) * limit;
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${limit}&formatted=true&scrIds=DAY_LOSERS&sortField=&sortType=&start=${offset}&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CaverageDailyVolume3Month%2CmarketCap%2CtrailingPE%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange%2CregularMarketOpen&lang=en-US&region=US`;

    const response = await axios.get(url, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const result = response.data.finance?.result?.[0];
    const quotes = result?.quotes || [];
    const totalRecords = result?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const losers = quotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      volume: item.regularMarketVolume?.fmt || "N/A",
      avgVolume: item.averageDailyVolume3Month?.fmt || "N/A",
      marketCap: item.marketCap?.fmt || "N/A",
      peRatio: item.trailingPE?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
      open: item.regularMarketOpen?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取日跌幅股票数据。",
      data: losers,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取跌幅股票失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取跌幅股票失败。",
      error: error.message,
    });
  }
});

// 📊 GET /api/market/indices - 获取主要指数
router.get("/indices", async (req, res) => {
  try {
    // 主要市场指数
    const indexSymbols = ["^GSPC", "^DJI", "^IXIC", "^RUT"]; // S&P 500, Dow, Nasdaq, Russell 2000

    // 获取指数数据
    const indicesData = await yahooFinanceService.getMultipleStockPrices(
      indexSymbols
    );

    const indices = indicesData.map((index) => ({
      symbol: index.symbol,
      name: getIndexName(index.symbol),
      price: index.price || 0,
      change: index.change || 0,
      changePercent: index.changePercent || 0,
    }));

    res.json({
      success: true,
      data: indices,
    });
  } catch (error) {
    console.error("获取指数数据失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
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
// crypto 路由
router.get("/crypto", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const start = (page - 1) * limit;
    const cryptoApiUrl = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${limit}&formatted=true&scrIds=ALL_CRYPTOCURRENCIES_US&sortField=&sortType=&start=${start}&useRecordsResponse=false&fields=ticker%2ClogoUrl%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CmarketCap%2CregularMarketVolume%2Cvolume24Hr%2CvolumeAllCurrencies%2CcirculatingSupply%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange&lang=en-US&region=US`;

    const response = await axios.get(cryptoApiUrl, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const result = response.data.finance?.result?.[0];

    const rawQuotes = result?.quotes || [];
    const totalRecords = result?.total || rawQuotes.length;
    const totalPages = Math.ceil(totalRecords / limit);

    const cryptoData = rawQuotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      marketCap: item.marketCap?.fmt || "N/A",
      volume24Hr: item.volume24Hr?.fmt || "N/A",
      totalVolume: item.volumeAllCurrencies?.fmt || "N/A",
      circulatingSupply: item.circulatingSupply?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
      logoUrl: item.logoUrl || item.coinImageUrl || null,
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取加密货币数据。",
      data: cryptoData,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取加密货币数据失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取加密货币数据失败。",
      error: error.message,
    });
  }
});

// 💎 GET /api/market/crypto/:symbol - 获取单个加密货币详细数据
router.get('/crypto/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`💎 获取加密货币详细数据: ${symbol}`);
    
    // 清理symbol格式（移除-USD后缀等）
    const cleanSymbol = symbol.replace('-USD', '').replace('-USDT', '').toLowerCase();
    
    const cryptoData = await cryptoService.getCryptoPrice(cleanSymbol);
    
    if (cryptoData && !cryptoData.error) {
      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          name: cryptoData.name,
          price: cryptoData.price,
          change: cryptoData.change,
          changePercent: cryptoData.changePercent,
          volume: cryptoData.volume,
          marketCap: cryptoData.marketCap,
          lastUpdated: cryptoData.lastUpdated
        }
      });
    } else {
      res.json({
        success: false,
        error: `无法获取 ${symbol} 的加密货币数据`,
        data: null
      });
    }
    
  } catch (error) {
    console.error(`❌ 获取加密货币数据失败 ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: null
    });
  }
});

router.get("/etfs/most-active", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const start = (page - 1) * limit;
    const etfApiUrl = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${limit}&formatted=true&scrIds=MOST_ACTIVES_ETFS&sortField=&sortType=&start=${start}&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CfiftyDayAverage%2CtwoHundredDayAverage%2CtrailingThreeMonthReturns%2CytdReturn%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange&lang=en-US&region=US`;

    const response = await axios.get(etfApiUrl, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const result = response.data.finance?.result?.[0];
    const rawQuotes = result?.quotes || [];
    const totalRecords = result?.total || rawQuotes.length;
    const totalPages = Math.ceil(totalRecords / limit);

    const etfData = rawQuotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      marketVolume: item.regularMarketVolume?.fmt || "N/A",
      fiftyDayAvg: item.fiftyDayAverage?.fmt || "N/A",
      twoHundredDayAvg: item.twoHundredDayAverage?.fmt || "N/A",
      trailing3MonthReturn: item.trailingThreeMonthReturns?.fmt || "N/A",
      ytdReturn: item.ytdReturn?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取ETF活跃榜单。",
      data: etfData,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取ETF数据失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取ETF数据失败。",
      error: error.message,
    });
  }
});

// 📈 GET /api/market/etfs/gainers - 获取 ETF 涨幅榜 (带分页和总记录数)
router.get("/etfs/gainers", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const offset = (page - 1) * limit;
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${limit}&formatted=true&scrIds=DAY_GAINERS_ETFS&sortField=&sortType=&start=${offset}&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CfiftyDayAverage%2CtwoHundredDayAverage%2CtrailingThreeMonthReturns%2CytdReturn%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange&lang=en-US&region=US`;

    const response = await axios.get(url, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const result = response.data.finance?.result?.[0];
    const rawQuotes = result?.quotes || [];
    const totalRecords = result?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const etfGainers = rawQuotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      marketVolume: item.regularMarketVolume?.fmt || "N/A",
      fiftyDayAvg: item.fiftyDayAverage?.fmt || "N/A",
      twoHundredDayAvg: item.twoHundredDayAverage?.fmt || "N/A",
      trailing3MonthReturn: item.trailingThreeMonthReturns?.fmt || "N/A",
      ytdReturn: item.ytdReturn?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取 ETF 日涨幅数据。",
      data: etfGainers,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取 ETF Gainers 失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取 ETF Gainers 失败",
      error: error.message,
    });
  }
});

router.get("/etfs/losers", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const offset = (page - 1) * limit;
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${limit}&formatted=true&scrIds=DAY_LOSERS_ETFS&sortField=&sortType=&start=${offset}&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CfiftyDayAverage%2CtwoHundredDayAverage%2CtrailingThreeMonthReturns%2CytdReturn%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange&lang=en-US&region=US`;

    const response = await axios.get(url, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const result = response.data.finance?.result?.[0];
    const rawQuotes = result?.quotes || [];
    const totalRecords = result?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const etfLosers = rawQuotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      marketVolume: item.regularMarketVolume?.fmt || "N/A",
      fiftyDayAvg: item.fiftyDayAverage?.fmt || "N/A",
      twoHundredDayAvg: item.twoHundredDayAverage?.fmt || "N/A",
      trailing3MonthReturn: item.trailingThreeMonthReturns?.fmt || "N/A",
      ytdReturn: item.ytdReturn?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取 ETF 日跌幅数据。",
      data: etfLosers,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取 ETF Losers 失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取 ETF Losers 失败",
      error: error.message,
    });
  }
});

// 📊 GET /api/market/etfs/trending - 获取 ETF 热门榜 (模拟分页)
router.get("/etfs/trending", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const offset = (page - 1) * limit;
    const url = `https://query1.finance.yahoo.com/v1/finance/trending/US?count=100&fields=logoUrl%2ClongName%2CshortName%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketPrice%2Cticker%2Csymbol%2Csparkline%2CregularMarketVolume%2CfiftyDayAverage%2CtwoHundredDayAverage%2CtrailingThreeMonthReturns%2CytdReturn%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange&format=true&useQuotes=true&quoteType=etf&lang=en-US&region=US`;

    const response = await axios.get(url, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const rawQuotes = response.data.finance?.result?.[0]?.quotes || [];
    const totalRecords = rawQuotes.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedQuotes = rawQuotes.slice(offset, offset + limit);

    const etfTrending = paginatedQuotes.map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice?.fmt || "N/A",
      change: item.regularMarketChange?.fmt || "N/A",
      changePercent: item.regularMarketChangePercent?.fmt || "N/A",
      marketVolume: item.regularMarketVolume?.fmt || "N/A",
      fiftyDayAvg: item.fiftyDayAverage?.fmt || "N/A",
      twoHundredDayAvg: item.twoHundredDayAverage?.fmt || "N/A",
      trailing3MonthReturn: item.trailingThreeMonthReturns?.fmt || "N/A",
      ytdReturn: item.ytdReturn?.fmt || "N/A",
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent?.fmt || "N/A",
      fiftyTwoWeekRange: item.fiftyTwoWeekRange?.fmt || "N/A",
    }));

    return res.status(200).json({
      success: true,
      message: "成功获取 ETF 热门榜数据。",
      data: etfTrending,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取 ETF Trending 失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取 ETF Trending 失败",
      error: error.message,
    });
  }
});

// 🏦 GET /api/market/bonds - 获取美国国债收益率（不分页）

router.get("/bonds", async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "5", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const symbols = [
      "%5EIRX",
      "%5EFVX",
      "%5ETNX",
      "%5ETYX",
      "2YY%3DF",
      "ZN%3DF",
    ].join(",");

    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols}&range=1d&interval=5m&indicators=close&includeTimestamps=false&includePrePost=false&corsDomain=finance.yahoo.com`;

    const response = await axios.get(url, {
      // httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const results = response.data.spark?.result || [];

    const bonds = results.map((bond) => {
      const meta = bond.response?.[0]?.meta || {};
      const closes = bond.response?.[0]?.indicators?.quote?.[0]?.close || [];
      const latestPrice = closes[closes.length - 1];
      const prevClose = meta.previousClose;

      const change = latestPrice - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : null;

      return {
        symbol: meta.symbol || bond.symbol,
        name: meta.shortName || meta.symbol,
        price: latestPrice?.toFixed(3) || "N/A",
        change: change?.toFixed(3) || "N/A",
        changePercent: changePercent?.toFixed(2) + "%" || "N/A",
      };
    });

    const totalRecords = bonds.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const start = (page - 1) * limit;
    const paged = bonds.slice(start, start + limit);

    return res.status(200).json({
      success: true,
      message: "成功获取国债趋势数据。",
      data: paged,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取国债收益率失败:", error);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "获取国债趋势失败。",
      error: error.message,
    });
  }
});

// 🔥 GET /api/market/crypto/:symbol - 获取单个加密货币详细数据
router.get('/crypto/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`🧪 测试获取 ${symbol} 价格...`);
    
    const cryptoData = await cryptoService.getCryptoPrice(symbol);
    
    if (cryptoData) {
      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        price: parseFloat(cryptoData.price),
        currency: cryptoData.currency || 'USD',
        marketTime: cryptoData.marketTime || new Date().toISOString(),
        data: cryptoData, // 保留完整数据以备调试
        message: `成功获取 ${symbol} 的价格信息`
      });
    } else {
      res.json({
        success: false,
        symbol: symbol.toUpperCase(),
        error: `无法获取 ${symbol} 的有效价格`,
        data: cryptoData
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

function getIndexName(symbol) {
  const indexNames = {
    "^GSPC": "S&P 500",
    "^DJI": "Dow Jones",
    "^IXIC": "NASDAQ",
    "^RUT": "Russell 2000",
  };
  return indexNames[symbol] || symbol;
}

module.exports = router;
