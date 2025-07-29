const express = require("express");
const router = express.Router();
const yahooFinanceService = require("../services/yahooFinance");
const scheduledUpdatesService = require("../services/scheduledUpdates");
const { Holding } = require("../models/index");
const cron = require("node-cron");

const stock = {
  symbol: "",
  name: "",
  price: 0,
  change: 0,
  changePercent: "",
  volume: "",
  avgVol: "",
  marketCap: "",
  peRatio: "",
  fiveTwoWeekChange: "",
};

const mostActiveStockLink =
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=200&formatted=true&scrIds=MOST_ACTIVES&sortField=&sortType=&start=0&useRecordsResponse=false&fields=symbol&lang=en-US&region=US";

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
  const { limit = 100 } = req.query;
  try {
    const response = await fetch(mostActiveStockLink); // 确保 mostActiveStockLink 已定义

    if (!response.ok) {
      // 如果响应不成功，直接返回错误信息
      return res.status(response.status).json({
        success: false,
        message: `HTTP 错误！状态码: ${response.status}`,
        error: `Failed to fetch data from ${mostActiveStockLink}`,
      });
    }

    const responseJson = await response.json();

    // 安全地访问 quotes 数组
    const rawQuotes = responseJson.finance?.result?.[0]?.quotes;

    // 如果 quotes 数组不存在或为空，返回一个空数组
    if (!rawQuotes || !Array.isArray(rawQuotes) || rawQuotes.length === 0) {
      return res.status(200).json({
        // 200 OK，但数据为空
        success: true,
        message: "未找到活跃股票数据。",
        data: [],
      });
    }

    // 映射并转换每个股票对象到你需要的格式
    const formattedStocks = rawQuotes.map((item) => {
      return item.symbol;
    }).slice(0, parseInt(limit));
    

    const mostActiveStocks = await yahooFinanceService.getMultipleStockPrices(
      formattedStocks
    );

    // 返回包含格式化后股票信息的对象
    return res.status(200).json({
      success: true,
      message: "成功获取最活跃股票数据。",
      data: mostActiveStocks,
    });
  } catch (error) {
    console.error("获取最活跃股票数据时发生错误:", error);
    // 捕获并处理任何在请求或处理过程中发生的网络或其他错误
    return res.status(500).json({
      success: false,
      message: "服务器内部错误，无法获取股票数据。",
      error: error.message,
    });
  }
});

// 🔥 GET /api/market/trending - 获取热门股票
router.get("/trending", async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const queryOptions = { count: limit, lang: "en-US" };
    const trendingSymbols = await yahooFinanceService.getTrendingSymbols(
      "US",
      queryOptions
    );
    // 热门股票列表
    const selectedSymbols = trendingSymbols.slice(0, parseInt(limit));

    // 获取实时价格数据
    const stocksData = await yahooFinanceService.getMultipleStockPrices(
      selectedSymbols.map((stock) => {
        return stock.symbol;
      })
    );

    // 格式化数据
    const trendingStocks = stocksData.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name || `${stock.symbol} Inc.`,
      price: stock.price || 0,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
      volume: stock.volume || 0,
    }));

    res.json({
      success: true,
      data: trendingStocks,
    });
  } catch (error) {
    console.error("获取热门股票失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 📈 GET /api/market/gainers - 获取涨幅榜
router.get("/gainers", async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const queryOptions = { count: limit, lang: "en-US" };
    console.log("Query Options:", queryOptions);
    const activeSymbols = await yahooFinanceService.getDailyGainers("US", queryOptions);
    console.log("Active Symbols:", activeSymbols);
    // 获取价格数据
    const stocksData = await yahooFinanceService.getMultipleStockPrices(
      activeSymbols
    );

    // 筛选出涨幅最大的股票
    const gainers = stocksData
      .filter((stock) => !stock.error && stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, parseInt(limit))
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name || `${stock.symbol} Inc.`,
        price: stock.price || 0,
        change: stock.change || 0,
        changePercent: stock.changePercent || 0,
        volume: stock.volume || 0,
      }));

    res.json({
      success: true,
      data: gainers,
    });
  } catch (error) {
    console.error("获取涨幅榜失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 📉 GET /api/market/losers - 获取跌幅榜
router.get("/losers", async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // 一些活跃股票列表
    const activeSymbols = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "TSLA",
      "META",
      "NVDA",
      "NFLX",
      "AMD",
      "CRM",
      "ADBE",
      "ORCL",
      "INTC",
      "IBM",
      "CSCO",
    ];

    // 获取价格数据
    const stocksData = await yahooFinanceService.getMultipleStockPrices(
      activeSymbols
    );

    // 筛选出跌幅最大的股票
    const losers = stocksData
      .filter((stock) => !stock.error && stock.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, parseInt(limit))
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name || `${stock.symbol} Inc.`,
        price: stock.price || 0,
        change: stock.change || 0,
        changePercent: stock.changePercent || 0,
        volume: stock.volume || 0,
      }));

    res.json({
      success: true,
      data: losers,
    });
  } catch (error) {
    console.error("获取跌幅榜失败:", error);
    res.status(500).json({
      success: false,
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

// 辅助函数：获取指数名称
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
