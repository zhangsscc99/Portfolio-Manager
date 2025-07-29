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
const dailyGainersLink =
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=100&formatted=true&scrIds=DAY_GAINERS&sortField=&sortType=&start=0&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CaverageDailyVolume3Month%2CmarketCap%2CtrailingPE%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange%2CregularMarketOpen&lang=en-US&region=US"
const dailyLosersLink =
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=100&formatted=true&scrIds=DAY_LOSERS&sortField=&sortType=&start=0&useRecordsResponse=false&fields=ticker%2Csymbol%2ClongName%2Csparkline%2CshortName%2CregularMarketPrice%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketVolume%2CaverageDailyVolume3Month%2CmarketCap%2CtrailingPE%2CfiftyTwoWeekChangePercent%2CfiftyTwoWeekRange%2CregularMarketOpen&lang=en-US&region=US"

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

// 🌟 GET /api/market/most-active - 获取最活跃股票 (增加分页)
router.get("/most-active", async (req, res) => {
  // 从查询参数获取 page 和 limit，并转换为数字
  const page = parseInt(req.query.page || '1', 10); // 默认为第1页
  const limit = parseInt(req.query.limit || '10', 10); // 默认为每页10条

  // 验证 page 和 limit 是否是有效数字且大于0
  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const response = await fetch(mostActiveStockLink); // 确保 mostActiveStockLink 已定义

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `HTTP 错误！状态码: ${response.status}`,
        error: `Failed to fetch data from ${mostActiveStockLink}`,
      });
    }

    const responseJson = await response.json();

    const rawQuotes = responseJson.finance?.result?.[0]?.quotes;

    if (!rawQuotes || !Array.isArray(rawQuotes) || rawQuotes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "未找到活跃股票数据。",
        data: [],
        totalRecords: 0, // 没有数据，总记录数为0
        currentPage: page,
        perPage: limit,
      });
    }

    // 映射并转换每个股票对象到你需要的格式 (所有原始数据)
    const allFormattedStocks = rawQuotes.map((item) => item.symbol);

    // 获取总记录数
    const totalRecords = allFormattedStocks.length;

    // 计算分页索引
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // 对数据进行分页切片
    const pagedSymbols = allFormattedStocks.slice(startIndex, endIndex);

    // 如果当前页没有数据 (例如请求的页数超出了总页数)
    if (pagedSymbols.length === 0 && page > 1) {
      return res.status(200).json({
        success: true,
        message: "当前页没有数据，可能已超出总页数。",
        data: [],
        totalRecords: totalRecords,
        currentPage: page,
        perPage: limit,
      });
    }

    // 获取分页后的股票价格数据
    const mostActiveStocks = await yahooFinanceService.getMultipleStockPrices(
      pagedSymbols
    );

    return res.status(200).json({
      success: true,
      message: "成功获取最活跃股票数据。",
      data: mostActiveStocks,
      totalRecords: totalRecords, // 返回总记录数
      currentPage: page, // 返回当前页码
      perPage: limit, // 返回每页显示数量
    });
  } catch (error) {
    console.error("获取最活跃股票数据时发生错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器内部错误，无法获取股票数据。",
      error: error.message,
    });
  }
});


// 🔥 GET /api/market/trending - 获取热门股票 (带分页和总记录数)
router.get("/trending", async (req, res) => {
  const page = parseInt(req.query.page || '1', 10); // Default to page 1
  const limit = parseInt(req.query.limit || '10', 10); // Default to 10 items per page

  // Input validation for page and limit
  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    // Crucial: Call getTrendingSymbols without passing 'limit' directly as 'count'
    // It should now return all (or a large set of) trending symbols.
    // We pass an empty options object or just region if the service has its own defaults for count.
    const allTrendingSymbols = await yahooFinanceService.getTrendingSymbols(
      "US", // Assuming "US" is the desired region
      { lang: "en-US",count: parseInt(300) } // Pass other desired options like language
      // NOTE: Do NOT pass count: limit here if you want to paginate the full set.
      // If your service inherently limits, consider modifying the service.
    );

    // Get the total number of records *before* pagination
    const totalRecords = allTrendingSymbols.length;

    // Calculate start and end indices for the current page
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Slice the trending symbols array to get only the data for the current page
    const pagedSymbols = allTrendingSymbols.slice(startIndex, endIndex);

    // If no symbols on this page (e.g., requested page is too high)
    if (pagedSymbols.length === 0 && page > 1) {
      return res.status(200).json({
        success: true,
        message: "当前页没有数据，可能已超出总页数。",
        data: [],
        totalRecords: totalRecords,
        currentPage: page,
        perPage: limit,
      });
    }

    // Get real-time price data for the *paged* symbols
    const stocksData = await yahooFinanceService.getMultipleStockPrices(
      pagedSymbols.map((stock) => stock.symbol)
    );

    // Format the data as before
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
      totalRecords: totalRecords, // Provide total records for frontend pagination
      currentPage: page,         // Provide current page number
      perPage: limit,            // Provide items per page
    });
  } catch (error) {
    console.error("获取热门股票失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "服务器内部错误，无法获取热门股票数据。",
    });
  }
});

// 📈 GET /api/market/gainers - 获取涨幅榜
// router.get("/gainers", async (req, res) => {
//   const { limit = 100 } = req.query;
//   try {
//     const response = await fetch(dailyGainersLink); // 确保 mostActiveStockLink 已定义

//     if (!response.ok) {
//       // 如果响应不成功，直接返回错误信息
//       return res.status(response.status).json({
//         success: false,
//         message: `HTTP 错误！状态码: ${response.status}`,
//         error: `Failed to fetch data from ${mostActiveStockLink}`,
//       });
//     }

//     const responseJson = await response.json();

//     // 安全地访问 quotes 数组
//     const rawQuotes = responseJson.finance?.result?.[0]?.quotes;

//     // 如果 quotes 数组不存在或为空，返回一个空数组
//     if (!rawQuotes || !Array.isArray(rawQuotes) || rawQuotes.length === 0) {
//       return res.status(200).json({
//         // 200 OK，但数据为空
//         success: true,
//         message: "未找到日涨幅股票数据。",
//         data: [],
//       });
//     }

//     // 映射并转换每个股票对象到你需要的格式
//     const formattedStocks = rawQuotes.map((item) => {
//       return item.symbol;
//     }).slice(0, parseInt(limit));
    

//     const mostActiveStocks = await yahooFinanceService.getMultipleStockPrices(
//       formattedStocks
//     );

//     // 返回包含格式化后股票信息的对象
//     return res.status(200).json({
//       success: true,
//       message: "成功获取日涨幅股票数据。",
//       data: mostActiveStocks,
//     });
//   } catch (error) {
//     console.error("获取日涨幅股票数据时发生错误:", error);
//     // 捕获并处理任何在请求或处理过程中发生的网络或其他错误
//     return res.status(500).json({
//       success: false,
//       message: "服务器内部错误，无法获取股票数据。",
//       error: error.message,
//     });
//   }
// });

// 📈 GET /api/market/gainers - 获取涨幅榜 (带分页和总记录数)
router.get("/gainers", async (req, res) => {
  const page = parseInt(req.query.page || '1', 10); // 默认为第1页
  const limit = parseInt(req.query.limit || '10', 10); // 默认为每页10条

  // 验证 page 和 limit 是否是有效数字且大于0
  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const response = await fetch(dailyGainersLink); // 确保 dailyGainersLink 已定义

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `HTTP 错误！状态码: ${response.status}`,
        // Note: Changed error message from mostActiveStockLink to dailyGainersLink for accuracy
        error: `Failed to fetch data from ${dailyGainersLink}`,
      });
    }

    const responseJson = await response.json();

    const rawQuotes = responseJson.finance?.result?.[0]?.quotes;

    if (!rawQuotes || !Array.isArray(rawQuotes) || rawQuotes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "未找到日涨幅股票数据。",
        data: [],
        totalRecords: 0, // 没有数据，总记录数为0
        currentPage: page,
        perPage: limit,
      });
    }

    // 映射并转换所有股票对象到你需要的格式 (获取所有原始股票符号)
    const allFormattedSymbols = rawQuotes.map((item) => item.symbol);

    // 获取总记录数
    const totalRecords = allFormattedSymbols.length;

    // 计算分页索引
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // 对数据进行分页切片
    const pagedSymbols = allFormattedSymbols.slice(startIndex, endIndex);

    // 如果当前页没有数据 (例如请求的页数超出了总页数)
    if (pagedSymbols.length === 0 && page > 1) {
      return res.status(200).json({
        success: true,
        message: "当前页没有数据，可能已超出总页数。",
        data: [],
        totalRecords: totalRecords,
        currentPage: page,
        perPage: limit,
      });
    }

    // 获取分页后的股票价格数据
    const gainersStocks = await yahooFinanceService.getMultipleStockPrices(
      pagedSymbols
    );

    return res.status(200).json({
      success: true,
      message: "成功获取日涨幅股票数据。",
      data: gainersStocks,
      totalRecords: totalRecords, // 返回总记录数
      currentPage: page,         // 返回当前页码
      perPage: limit,            // 返回每页显示数量
    });
  } catch (error) {
    console.error("获取日涨幅股票数据时发生错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器内部错误，无法获取股票数据。",
      error: error.message,
    });
  }
});

// 📉 GET /api/market/losers - 获取跌幅榜
// router.get("/losers", async (req, res) => {
//   const { limit = 100 } = req.query;
//   try {
//     const response = await fetch(dailyLosersLink); 

//     if (!response.ok) {
//       // 如果响应不成功，直接返回错误信息
//       return res.status(response.status).json({
//         success: false,
//         message: `HTTP 错误！状态码: ${response.status}`,
//         error: `Failed to fetch data from ${mostActiveStockLink}`,
//       });
//     }

//     const responseJson = await response.json();

//     // 安全地访问 quotes 数组
//     const rawQuotes = responseJson.finance?.result?.[0]?.quotes;

//     // 如果 quotes 数组不存在或为空，返回一个空数组
//     if (!rawQuotes || !Array.isArray(rawQuotes) || rawQuotes.length === 0) {
//       return res.status(200).json({
//         // 200 OK，但数据为空
//         success: true,
//         message: "未找到日跌幅股票数据。",
//         data: [],
//       });
//     }

//     // 映射并转换每个股票对象到你需要的格式
//     const formattedStocks = rawQuotes.map((item) => {
//       return item.symbol;
//     }).slice(0, parseInt(limit));
    

//     const mostActiveStocks = await yahooFinanceService.getMultipleStockPrices(
//       formattedStocks
//     );

//     // 返回包含格式化后股票信息的对象
//     return res.status(200).json({
//       success: true,
//       message: "成功获取日跌幅股票数据。",
//       data: mostActiveStocks,
//     });
//   } catch (error) {
//     console.error("获取日跌幅股票数据时发生错误:", error);
//     // 捕获并处理任何在请求或处理过程中发生的网络或其他错误
//     return res.status(500).json({
//       success: false,
//       message: "服务器内部错误，无法获取股票数据。",
//       error: error.message,
//     });
//   }
// });
// 📉 GET /api/market/losers - 获取跌幅榜 (带分页和总记录数)
router.get("/losers", async (req, res) => {
  const page = parseInt(req.query.page || '1', 10); // 默认为第1页
  const limit = parseInt(req.query.limit || '10', 10); // 默认为每页10条

  // 验证 page 和 limit 是否是有效数字且大于0
  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
  }

  try {
    const response = await fetch(dailyLosersLink); // 确保 dailyLosersLink 已定义

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `HTTP 错误！状态码: ${response.status}`,
        // Note: Changed error message from mostActiveStockLink to dailyLosersLink for accuracy
        error: `Failed to fetch data from ${dailyLosersLink}`,
      });
    }

    const responseJson = await response.json();

    const rawQuotes = responseJson.finance?.result?.[0]?.quotes;

    if (!rawQuotes || !Array.isArray(rawQuotes) || rawQuotes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "未找到日跌幅股票数据。",
        data: [],
        totalRecords: 0, // 没有数据，总记录数为0
        currentPage: page,
        perPage: limit,
      });
    }

    // 映射并转换所有股票对象到你需要的格式 (获取所有原始股票符号)
    const allFormattedSymbols = rawQuotes.map((item) => item.symbol);

    // 获取总记录数
    const totalRecords = allFormattedSymbols.length;

    // 计算分页索引
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // 对数据进行分页切片
    const pagedSymbols = allFormattedSymbols.slice(startIndex, endIndex);

    // 如果当前页没有数据 (例如请求的页数超出了总页数)
    if (pagedSymbols.length === 0 && page > 1) {
      return res.status(200).json({
        success: true,
        message: "当前页没有数据，可能已超出总页数。",
        data: [],
        totalRecords: totalRecords,
        currentPage: page,
        perPage: limit,
      });
    }

    // 获取分页后的股票价格数据
    const losersStocks = await yahooFinanceService.getMultipleStockPrices(
      pagedSymbols
    );

    return res.status(200).json({
      success: true,
      message: "成功获取日跌幅股票数据。",
      data: losersStocks,
      totalRecords: totalRecords, // 返回总记录数
      currentPage: page,         // 返回当前页码
      perPage: limit,            // 返回每页显示数量
    });
  } catch (error) {
    console.error("获取日跌幅股票数据时发生错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器内部错误，无法获取股票数据。",
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
