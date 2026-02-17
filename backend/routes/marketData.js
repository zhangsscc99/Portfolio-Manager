const express = require("express");
const router = express.Router();
const yahooFinanceService = require("../services/yahooFinance");
const alphaVantageService = require("../services/alphaVantageService");
const cryptoService = require("../services/cryptoService"); // 添加crypto服务
const scheduledUpdatesService = require("../services/scheduledUpdates");
const { Holding } = require("../models/index");
const { HttpsProxyAgent } = require("https-proxy-agent");
// 设置代理地址
// const proxy = "http://127.0.0.1:7777"; // 替换为你的代理地址
// const agent = new HttpsProxyAgent(proxy);
const axios = require("axios");

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const ETF_FALLBACK_CACHE_TTL = 5 * 60 * 1000;
const ETF_FALLBACK_CACHE = {
  updatedAt: 0,
  rows: [],
};

const ETF_FALLBACK_UNIVERSE = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF" },
  { symbol: "IVV", name: "iShares Core S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF" },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF" },
  { symbol: "XLK", name: "Technology Select Sector SPDR Fund" },
  { symbol: "XLF", name: "Financial Select Sector SPDR Fund" },
  { symbol: "XLE", name: "Energy Select Sector SPDR Fund" },
  { symbol: "XLY", name: "Consumer Discretionary Select Sector SPDR Fund" },
  { symbol: "XLV", name: "Health Care Select Sector SPDR Fund" },
  { symbol: "XLI", name: "Industrial Select Sector SPDR Fund" },
  { symbol: "XLP", name: "Consumer Staples Select Sector SPDR Fund" },
  { symbol: "XLU", name: "Utilities Select Sector SPDR Fund" },
  { symbol: "XLB", name: "Materials Select Sector SPDR Fund" },
  { symbol: "XLRE", name: "Real Estate Select Sector SPDR Fund" },
  { symbol: "ARKK", name: "ARK Innovation ETF" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF" },
  { symbol: "SOXX", name: "iShares Semiconductor ETF" },
  { symbol: "VGT", name: "Vanguard Information Technology ETF" },
  { symbol: "IEMG", name: "iShares Core MSCI Emerging Markets ETF" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets ETF" },
  { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF" },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF" },
  { symbol: "IEF", name: "iShares 7-10 Year Treasury Bond ETF" },
  { symbol: "HYG", name: "iShares iBoxx High Yield Corporate Bond ETF" },
  { symbol: "LQD", name: "iShares iBoxx Investment Grade Corporate Bond ETF" },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF" },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "SLV", name: "iShares Silver Trust" },
  { symbol: "USO", name: "United States Oil Fund" },
  { symbol: "XBI", name: "SPDR S&P Biotech ETF" },
  { symbol: "KRE", name: "SPDR S&P Regional Banking ETF" },
];

const toNumeric = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/[$,%\s,]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatFixed = (value, digits = 2) => {
  const parsed = toNumeric(value);
  return parsed === null ? "N/A" : parsed.toFixed(digits);
};

const formatPercent = (value, digits = 2) => {
  const parsed = toNumeric(value);
  return parsed === null ? "N/A" : `${parsed.toFixed(digits)}%`;
};

const formatCompact = (value) => {
  const parsed = toNumeric(value);
  if (parsed === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(parsed);
};

const formatCryptoPrice = (value) => {
  const parsed = toNumeric(value);
  if (parsed === null) return "N/A";
  if (parsed === 0) return "0.00";
  if (parsed < 1) return parsed.toFixed(6);
  return parsed.toFixed(2);
};

const toYmd = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");

async function getStooqSnapshot(symbol) {
  const raw = String(symbol || "").trim().toLowerCase();
  if (!raw) return null;

  const candidates = raw.includes(".") ? [raw] : [raw, `${raw}.us`];
  const endDate = new Date();
  const startDate = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  for (const candidate of candidates) {
    try {
      const response = await axios.get("https://stooq.com/q/d/l/", {
        params: {
          s: candidate,
          i: "d",
          d1: toYmd(startDate),
          d2: toYmd(endDate),
        },
        timeout: 8000,
        responseType: "text",
        transformResponse: [(data) => data],
      });

      const lines = String(response.data || "")
        .trim()
        .split(/\r?\n/)
        .filter(Boolean);
      if (lines.length <= 1) continue;

      const rows = lines
        .slice(1)
        .map((line) => line.split(","))
        .filter((cols) => cols.length >= 6)
        .map((cols) => {
          const close = Number(cols[4]);
          const volume = Number(cols[5]);
          return {
            close,
            volume: Number.isFinite(volume) ? volume : 0,
          };
        })
        .filter((row) => Number.isFinite(row.close) && row.close > 0);

      if (rows.length === 0) continue;

      const latest = rows[rows.length - 1];
      const previous = rows.length > 1 ? rows[rows.length - 2] : null;
      const previousClose =
        previous && Number.isFinite(previous.close) && previous.close > 0
          ? previous.close
          : latest.close;

      const change = latest.close - previousClose;
      const changePercent =
        previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        price: latest.close,
        change,
        changePercent,
        volume: latest.volume,
      };
    } catch (error) {
      // 尝试下一个候选symbol
    }
  }

  return null;
}

async function getEtfFallbackUniverse() {
  const now = Date.now();
  if (
    ETF_FALLBACK_CACHE.rows.length > 0 &&
    now - ETF_FALLBACK_CACHE.updatedAt < ETF_FALLBACK_CACHE_TTL
  ) {
    return ETF_FALLBACK_CACHE.rows;
  }

  const rows = await Promise.all(
    ETF_FALLBACK_UNIVERSE.map(async (etf) => {
      const snapshot = await getStooqSnapshot(etf.symbol);
      if (!snapshot) return null;

      return {
        symbol: etf.symbol,
        name: etf.name,
        price: formatFixed(snapshot.price, 2),
        change: formatFixed(snapshot.change, 2),
        changePercent: formatPercent(snapshot.changePercent, 2),
        marketVolume: formatCompact(snapshot.volume),
        fiftyDayAvg: "N/A",
        twoHundredDayAvg: "N/A",
        trailing3MonthReturn: "N/A",
        ytdReturn: "N/A",
        fiftyTwoWeekChangePercent: "N/A",
        fiftyTwoWeekRange: "N/A",
        _volumeNumeric: snapshot.volume || 0,
        _changePercentNumeric: snapshot.changePercent || 0,
      };
    })
  );

  const validRows = rows.filter(Boolean);
  ETF_FALLBACK_CACHE.rows = validRows;
  ETF_FALLBACK_CACHE.updatedAt = now;
  return validRows;
}

async function getEtfFallbackPage(page, limit, category) {
  const allRows = await getEtfFallbackUniverse();
  if (!allRows.length) return null;

  const sorted = [...allRows];
  if (category === "gainers") {
    sorted.sort((a, b) => b._changePercentNumeric - a._changePercentNumeric);
  } else if (category === "losers") {
    sorted.sort((a, b) => a._changePercentNumeric - b._changePercentNumeric);
  } else {
    sorted.sort((a, b) => b._volumeNumeric - a._volumeNumeric);
  }

  const totalRecords = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const start = (page - 1) * limit;
  const pagedRows = sorted.slice(start, start + limit).map((row) => {
    const { _volumeNumeric, _changePercentNumeric, ...publicRow } = row;
    return publicRow;
  });

  return {
    data: pagedRows,
    totalRecords,
    totalPages,
    source: "stooq",
  };
}

async function getCryptoFallbackPage(page, limit) {
  const response = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
    params: {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: limit,
      page,
      sparkline: false,
      price_change_percentage: "24h",
    },
    timeout: 10000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  const rawRows = Array.isArray(response.data) ? response.data : [];
  const totalRecords = Number(response.headers?.total) || rawRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return {
    data: rawRows.map((item) => ({
      symbol: String(item.symbol || "").toUpperCase(),
      name: item.name || String(item.symbol || "").toUpperCase(),
      price: formatCryptoPrice(item.current_price),
      change: formatFixed(item.price_change_24h, 2),
      changePercent: formatPercent(item.price_change_percentage_24h, 2),
      marketCap: formatCompact(item.market_cap),
      volume24Hr: formatCompact(item.total_volume),
      totalVolume: formatCompact(item.total_volume),
      circulatingSupply: formatCompact(item.circulating_supply),
      fiftyTwoWeekRange: "N/A",
      logoUrl: item.image || null,
    })),
    totalRecords,
    totalPages,
    source: "coingecko",
  };
}

// 📊 GET /api/market/quote/:symbol - 获取单个股票报价
router.get("/quote/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinanceService.getStockPrice(symbol);

    if (quote.error) {
      return res.status(502).json({
        success: false,
        error: quote.error,
        data: quote,
      });
    }

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
      const normalizedQuery = String(query || "").trim().toUpperCase();
      const candidates = results.slice(0, 10);
      const symbols = candidates.map((r) => r.symbol);
      const pricesData = await yahooFinanceService.getMultipleStockPrices(
        symbols
      );

      const enrichedResults = candidates.map((result) => {
        const priceData = pricesData.find((p) => p.symbol === result.symbol);
        return {
          ...result,
          price: priceData?.price || 0,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || 0,
          volume: priceData?.volume || 0,
        };
      });

      const scoreResult = (item) => {
        const symbol = String(item.symbol || "").toUpperCase();
        const exchange = String(item.exchange || "").toUpperCase();
        let score = 0;

        if (symbol === normalizedQuery) score += 100;
        else if (symbol.startsWith(normalizedQuery)) score += 70;
        else if (symbol.includes(normalizedQuery)) score += 40;

        if (item.price > 0) score += 120;
        if (exchange.includes("NASDAQ") || exchange.includes("NYSE")) score += 10;

        return score;
      };

      const rankedResults = enrichedResults.sort(
        (a, b) => scoreResult(b) - scoreResult(a)
      );

      const dedupedResults = [];
      const seenSymbols = new Set();
      for (const item of rankedResults) {
        const key = String(item.symbol || "").toUpperCase();
        if (!key || seenSymbols.has(key)) continue;
        seenSymbols.add(key);
        dedupedResults.push(item);
      }

      res.json({
        success: true,
        data: dedupedResults.slice(0, 5),
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

const parsePagination = (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
    res.status(400).json({
      success: false,
      message: "分页参数 page 和 limit 必须是大于0的有效数字。",
    });
    return null;
  }

  return { page, limit };
};

const toNumber = (value) => {
  if (value === null || value === undefined) return NaN;
  const cleaned = String(value).replace(/[,%$]/g, "").trim();
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : NaN;
};

const formatMoverRow = (item) => {
  const symbol = String(item?.ticker || item?.symbol || "").toUpperCase();
  const priceNum = toNumber(item?.price);
  const changeNum = toNumber(item?.change_amount || item?.change);
  const changePctNum = toNumber(item?.change_percentage || item?.changePercent);
  const volumeNum = toNumber(item?.volume);

  return {
    symbol,
    name: symbol,
    price: Number.isFinite(priceNum)
      ? (priceNum >= 1 ? priceNum.toFixed(2) : priceNum.toFixed(4))
      : "0.00",
    change: Number.isFinite(changeNum) ? changeNum.toFixed(2) : "0.00",
    changePercent: Number.isFinite(changePctNum)
      ? `${changePctNum.toFixed(2)}%`
      : "0.00%",
    volume: Number.isFinite(volumeNum)
      ? Math.round(volumeNum).toLocaleString("en-US")
      : "0",
    avgVolume: "N/A",
    marketCap: "N/A",
    peRatio: "N/A",
    fiftyTwoWeekChangePercent: "N/A",
    fiftyTwoWeekRange: "N/A",
    open: "N/A",
    _changePctNum: Number.isFinite(changePctNum) ? changePctNum : 0,
    _volumeNum: Number.isFinite(volumeNum) ? volumeNum : 0,
  };
};

const paginateRows = (rows, page, limit) => {
  const totalRecords = rows.length;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;
  const offset = (page - 1) * limit;
  const paged = rows.slice(offset, offset + limit);
  return { paged, totalRecords, totalPages };
};

const stripInternalFields = (row) => {
  const { _changePctNum, _volumeNum, _score, ...publicFields } = row;
  return publicFields;
};

router.get("/most-active", async (req, res) => {
  const paging = parsePagination(req, res);
  if (!paging) {
    return;
  }
  const { page, limit } = paging;

  try {
    const movers = await alphaVantageService.getTopGainersLosers();
    const rows = movers.mostActive.map(formatMoverRow).map(stripInternalFields);
    const { paged, totalRecords, totalPages } = paginateRows(rows, page, limit);

    return res.status(200).json({
      success: true,
      message: "成功获取最活跃股票数据（Alpha Vantage）。",
      data: paged,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取最活跃股票数据时发生错误:", error);
    return res.status(502).json({
      success: false,
      message: "获取最活跃股票数据失败。",
      error: error.message,
    });
  }
});

// 🔥 GET /api/market/trending - 获取热门股票 (带分页和总记录数)
router.get("/trending", async (req, res) => {
  const paging = parsePagination(req, res);
  if (!paging) {
    return;
  }
  const { page, limit } = paging;

  try {
    const movers = await alphaVantageService.getTopGainersLosers();
    const sourceRows = [
      ...movers.topGainers,
      ...movers.mostActive,
      ...movers.topLosers,
    ].map(formatMoverRow);

    const bySymbol = new Map();
    for (const row of sourceRows) {
      if (!row.symbol) continue;
      const score =
        Math.abs(row._changePctNum) + (row._volumeNum > 0 ? Math.log10(row._volumeNum) : 0);
      const existing = bySymbol.get(row.symbol);
      if (!existing || score > existing._score) {
        bySymbol.set(row.symbol, { ...row, _score: score });
      }
    }

    const rows = Array.from(bySymbol.values())
      .sort((a, b) => b._score - a._score)
      .map(stripInternalFields);
    const { paged, totalRecords, totalPages } = paginateRows(rows, page, limit);

    return res.status(200).json({
      success: true,
      message: "成功获取热门趋势股票数据（Alpha Vantage）。",
      data: paged,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取热门趋势股票数据失败:", error);
    return res.status(502).json({
      success: false,
      message: "获取热门趋势股票失败。",
      error: error.message,
    });
  }
});

// 📈 GET /api/market/gainers - 获取涨幅榜 (带分页和总记录数)
router.get("/gainers", async (req, res) => {
  const paging = parsePagination(req, res);
  if (!paging) {
    return;
  }
  const { page, limit } = paging;

  try {
    const movers = await alphaVantageService.getTopGainersLosers();
    const rows = movers.topGainers.map(formatMoverRow).map(stripInternalFields);
    const { paged, totalRecords, totalPages } = paginateRows(rows, page, limit);

    return res.status(200).json({
      success: true,
      message: "成功获取日涨幅股票数据（Alpha Vantage）。",
      data: paged,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取涨幅股票失败:", error);
    return res.status(502).json({
      success: false,
      message: "获取涨幅股票失败。",
      error: error.message,
    });
  }
});

// 📉 GET /api/market/losers - 获取跌幅榜 (带分页和总记录数)
router.get("/losers", async (req, res) => {
  const paging = parsePagination(req, res);
  if (!paging) {
    return;
  }
  const { page, limit } = paging;

  try {
    const movers = await alphaVantageService.getTopGainersLosers();
    const rows = movers.topLosers.map(formatMoverRow).map(stripInternalFields);
    const { paged, totalRecords, totalPages } = paginateRows(rows, page, limit);

    return res.status(200).json({
      success: true,
      message: "成功获取日跌幅股票数据（Alpha Vantage）。",
      data: paged,
      totalRecords,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error) {
    console.error("获取跌幅股票失败:", error);
    return res.status(502).json({
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

    if (cryptoData.length === 0) {
      throw new Error("Yahoo crypto screener returned empty rows");
    }

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
    try {
      const fallback = await getCryptoFallbackPage(page, limit);
      return res.status(200).json({
        success: true,
        message: "Yahoo不可用，已切换到CoinGecko数据源。",
        data: fallback.data,
        totalRecords: fallback.totalRecords,
        totalPages: fallback.totalPages,
        currentPage: page,
        perPage: limit,
        source: fallback.source,
      });
    } catch (fallbackError) {
      return res.status(error.response?.status || 500).json({
        success: false,
        message: "获取加密货币数据失败。",
        error: fallbackError.message || error.message,
      });
    }
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

    if (etfData.length === 0) {
      throw new Error("Yahoo ETF most-active returned empty rows");
    }

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
    try {
      const fallback = await getEtfFallbackPage(page, limit, "most-active");
      if (fallback) {
        return res.status(200).json({
          success: true,
          message: "Yahoo不可用，已切换到ETF备用数据源。",
          data: fallback.data,
          totalRecords: fallback.totalRecords,
          totalPages: fallback.totalPages,
          currentPage: page,
          perPage: limit,
          source: fallback.source,
        });
      }
    } catch (fallbackError) {
      return res.status(error.response?.status || 500).json({
        success: false,
        message: "获取ETF数据失败。",
        error: fallbackError.message || error.message,
      });
    }

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

    if (etfGainers.length === 0) {
      throw new Error("Yahoo ETF gainers returned empty rows");
    }

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
    try {
      const fallback = await getEtfFallbackPage(page, limit, "gainers");
      if (fallback) {
        return res.status(200).json({
          success: true,
          message: "Yahoo不可用，已切换到ETF涨幅备用数据源。",
          data: fallback.data,
          totalRecords: fallback.totalRecords,
          totalPages: fallback.totalPages,
          currentPage: page,
          perPage: limit,
          source: fallback.source,
        });
      }
    } catch (fallbackError) {
      return res.status(error.response?.status || 500).json({
        success: false,
        message: "获取 ETF Gainers 失败",
        error: fallbackError.message || error.message,
      });
    }

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

    if (etfLosers.length === 0) {
      throw new Error("Yahoo ETF losers returned empty rows");
    }

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
    try {
      const fallback = await getEtfFallbackPage(page, limit, "losers");
      if (fallback) {
        return res.status(200).json({
          success: true,
          message: "Yahoo不可用，已切换到ETF跌幅备用数据源。",
          data: fallback.data,
          totalRecords: fallback.totalRecords,
          totalPages: fallback.totalPages,
          currentPage: page,
          perPage: limit,
          source: fallback.source,
        });
      }
    } catch (fallbackError) {
      return res.status(error.response?.status || 500).json({
        success: false,
        message: "获取 ETF Losers 失败",
        error: fallbackError.message || error.message,
      });
    }

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

    if (etfTrending.length === 0) {
      throw new Error("Yahoo ETF trending returned empty rows");
    }

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
    try {
      const fallback = await getEtfFallbackPage(page, limit, "trending");
      if (fallback) {
        return res.status(200).json({
          success: true,
          message: "Yahoo不可用，已切换到ETF热门备用数据源。",
          data: fallback.data,
          totalRecords: fallback.totalRecords,
          totalPages: fallback.totalPages,
          currentPage: page,
          perPage: limit,
          source: fallback.source,
        });
      }
    } catch (fallbackError) {
      return res.status(error.response?.status || 500).json({
        success: false,
        message: "获取 ETF Trending 失败",
        error: fallbackError.message || error.message,
      });
    }

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
