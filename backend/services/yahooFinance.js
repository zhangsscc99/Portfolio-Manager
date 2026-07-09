const axios = require("axios");
const https = require("https");
const nasdaqService = require("./nasdaqService");

// 🏢 Yahoo Finance API服务
class YahooFinanceService {
  constructor() {
    this.cache = new Map(); // 简单缓存
    this.cacheExpiry = 60000; // 1分钟缓存
    this.secTickerMap = new Map();
    this.secTickerCacheAt = 0;
    this.secTickerCacheTtl = 24 * 60 * 60 * 1000; // 24小时
    this.secFactsCache = new Map();
    this.secFactsCacheTtl = 6 * 60 * 60 * 1000; // 6小时
    this.secSharesCache = new Map();
    this.secSharesCacheTtl = 6 * 60 * 60 * 1000; // 6小时
    this.secPublicFloatCache = new Map();
    this.secPublicFloatCacheTtl = 6 * 60 * 60 * 1000; // 6小时
    this.secUserAgent =
      process.env.SEC_USER_AGENT ||
      "PortfolioManager/1.0 (support@portfolio-manager.local)";
    // 某些服务器Node出站到SEC会走IPv6超时，强制IPv4更稳定
    this.secHttpsAgent = new https.Agent({ family: 4 });
  }

  getSecNormalizedTicker(symbol) {
    const raw = String(symbol || "").trim().toUpperCase();
    if (!raw) return "";
    // 兼容BRK.B这类类别股代码：SEC通常使用连字符形式 BRK-B
    if (/^[A-Z]+\.[A-Z]$/.test(raw)) {
      return raw.replace(".", "-");
    }

    // SEC ticker映射通常不包含交易所后缀（如 .US/.L 等）
    return raw.split(".")[0];
  }

  async ensureSecTickerMap() {
    const now = Date.now();
    if (
      this.secTickerMap.size > 0 &&
      now - this.secTickerCacheAt < this.secTickerCacheTtl
    ) {
      return;
    }

    try {
      const response = await axios.get(
        "https://www.sec.gov/files/company_tickers_exchange.json",
        {
          timeout: 10000,
          httpsAgent: this.secHttpsAgent,
          headers: {
            "User-Agent": this.secUserAgent,
            Accept: "application/json",
          },
        }
      );

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const nextMap = new Map();

      for (const row of rows) {
        const cik = Number(row?.[0]);
        const ticker = String(row?.[2] || "")
          .trim()
          .toUpperCase();
        if (!ticker || !Number.isFinite(cik)) continue;
        nextMap.set(ticker, cik);
      }

      if (nextMap.size > 0) {
        this.secTickerMap = nextMap;
        this.secTickerCacheAt = now;
      }
    } catch (error) {
      console.warn("⚠️ SEC ticker映射加载失败:", error.message);
    }
  }

  getLatestNumericFactValue(points) {
    if (!Array.isArray(points) || points.length === 0) return null;

    const latest = points
      .filter((item) => Number.isFinite(Number(item?.val)))
      .sort((a, b) => {
        const aDate = Date.parse(a?.filed || a?.end || 0) || 0;
        const bDate = Date.parse(b?.filed || b?.end || 0) || 0;
        return bDate - aDate;
      })[0];

    const value = Number(latest?.val || 0);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  async getSecCompanyFacts(symbol) {
    const ticker = this.getSecNormalizedTicker(symbol);
    if (!ticker) return null;

    const now = Date.now();
    const cached = this.secFactsCache.get(ticker);
    if (cached && now - cached.timestamp < this.secFactsCacheTtl) {
      return cached.value;
    }

    await this.ensureSecTickerMap();
    const cik = this.secTickerMap.get(ticker);
    if (!cik) return null;

    const cikPadded = String(cik).padStart(10, "0");

    try {
      const response = await axios.get(
        `https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded}.json`,
        {
          timeout: 12000,
          httpsAgent: this.secHttpsAgent,
          headers: {
            "User-Agent": this.secUserAgent,
            Accept: "application/json",
          },
        }
      );

      const value = response.data || null;
      this.secFactsCache.set(ticker, {
        value,
        timestamp: now,
      });
      return value;
    } catch (error) {
      console.warn(`⚠️ SEC companyfacts获取失败 ${ticker}:`, error.message);
      return null;
    }
  }

  async getSharesOutstandingFromSEC(symbol) {
    const ticker = this.getSecNormalizedTicker(symbol);
    if (!ticker) return null;

    const now = Date.now();
    const cached = this.secSharesCache.get(ticker);
    if (cached && now - cached.timestamp < this.secSharesCacheTtl) {
      return cached.value;
    }

    const facts = await this.getSecCompanyFacts(ticker);
    if (!facts) return null;

    try {
      const shareCandidates = [
        facts?.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares,
        facts?.facts?.["us-gaap"]?.CommonStockSharesOutstanding?.units?.shares,
        facts?.facts?.["us-gaap"]?.WeightedAverageNumberOfSharesOutstandingBasic
          ?.units?.shares,
        facts?.facts?.["us-gaap"]?.WeightedAverageNumberOfDilutedSharesOutstanding
          ?.units?.shares,
      ];

      const sharesOutstanding = shareCandidates
        .map((points) => this.getLatestNumericFactValue(points))
        .find((value) => Number.isFinite(value) && value > 0);

      if (!sharesOutstanding) {
        return null;
      }

      this.secSharesCache.set(ticker, {
        value: sharesOutstanding,
        timestamp: now,
      });
      return sharesOutstanding;
    } catch (error) {
      console.warn(`⚠️ SEC股本获取失败 ${ticker}:`, error.message);
      return null;
    }
  }

  async getPublicFloatFromSEC(symbol) {
    const ticker = this.getSecNormalizedTicker(symbol);
    if (!ticker) return null;

    const now = Date.now();
    const cached = this.secPublicFloatCache.get(ticker);
    if (cached && now - cached.timestamp < this.secPublicFloatCacheTtl) {
      return cached.value;
    }

    const facts = await this.getSecCompanyFacts(ticker);
    if (!facts) return null;

    try {
      const publicFloat = this.getLatestNumericFactValue(
        facts?.facts?.dei?.EntityPublicFloat?.units?.USD
      );
      if (!publicFloat) return null;

      this.secPublicFloatCache.set(ticker, {
        value: publicFloat,
        timestamp: now,
      });
      return publicFloat;
    } catch (error) {
      console.warn(`⚠️ SEC public float获取失败 ${ticker}:`, error.message);
      return null;
    }
  }

  async enrichMarketCapFromSEC(stockData) {
    if (!stockData || stockData.marketCap > 0 || stockData.price <= 0) {
      return stockData;
    }

    const [sharesOutstanding, publicFloat] = await Promise.all([
      this.getSharesOutstandingFromSEC(stockData.symbol),
      this.getPublicFloatFromSEC(stockData.symbol),
    ]);

    const marketCapFromShares =
      sharesOutstanding && Number(stockData.price) > 0
        ? Math.round(sharesOutstanding * Number(stockData.price))
        : 0;

    let marketCap = 0;
    if (marketCapFromShares > 0 && publicFloat > 0) {
      const ratio = marketCapFromShares / publicFloat;
      // 双股权结构可能让股本推导偏差很大，此时优先public float兜底
      marketCap = ratio < 0.2 || ratio > 5 ? publicFloat : marketCapFromShares;
    } else {
      marketCap = marketCapFromShares || publicFloat || 0;
    }

    if (!Number.isFinite(marketCap) || marketCap <= 0) {
      return stockData;
    }

    return {
      ...stockData,
      marketCap: Math.round(marketCap),
    };
  }

  // Stooq备用行情：当Yahoo在服务器环境被403/限流时兜底
  async getStockPriceFromStooq(symbol) {
    const cleanSymbol = String(symbol || "").trim().toLowerCase();
    if (!cleanSymbol) return null;

    const candidates = new Set([cleanSymbol]);

    // 兼容BRK.B -> BRK-B 的行情代码
    if (cleanSymbol.includes(".")) {
      candidates.add(cleanSymbol.replace(/\./g, "-"));
    }

    for (const baseSymbol of [...candidates]) {
      if (!baseSymbol.includes(".")) {
        candidates.add(`${baseSymbol}.us`);
      }
    }

    const toYmd = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");
    const endDate = new Date();
    const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    for (const candidate of candidates) {
      try {
        const response = await axios.get("https://stooq.com/q/d/l/", {
          params: {
            s: candidate,
            i: "d",
            d1: toYmd(startDate),
            d2: toYmd(endDate),
          },
          timeout: 6000,
          responseType: "text",
          transformResponse: [(data) => data],
        });

        const lines = String(response.data || "")
          .trim()
          .split(/\r?\n/)
          .filter(Boolean);

        if (lines.length <= 1) {
          continue;
        }

        const rows = lines
          .slice(1)
          .map((line) => line.split(","))
          .filter((cols) => cols.length >= 6)
          .map((cols) => ({
            date: cols[0],
            open: parseFloat(cols[1]),
            high: parseFloat(cols[2]),
            low: parseFloat(cols[3]),
            close: parseFloat(cols[4]),
            volume: parseFloat(cols[5]) || 0,
          }))
          .filter((row) => Number.isFinite(row.close) && row.close > 0);

        if (!rows.length) {
          continue;
        }

        const latest = rows[rows.length - 1];
        const previous = rows.length > 1 ? rows[rows.length - 2] : null;
        const previousClose =
          previous && Number.isFinite(previous.close) && previous.close > 0
            ? previous.close
            : Number.isFinite(latest.open) && latest.open > 0
            ? latest.open
            : latest.close;

        const change = latest.close - previousClose;
        const changePercent =
          previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          price: latest.close,
          change,
          changePercent,
          dayHigh: Number.isFinite(latest.high) ? latest.high : latest.close,
          dayLow: Number.isFinite(latest.low) ? latest.low : latest.close,
          open: Number.isFinite(latest.open) ? latest.open : latest.close,
          previousClose,
          volume: latest.volume,
          marketCap: 0,
          lastUpdated: new Date().toISOString(),
          provider: "stooq",
        };
      } catch (error) {
        console.warn(
          `⚠️ Stooq兜底获取失败 ${candidate}:`,
          error.message
        );
      }
    }

    return null;
  }

  // Stooq历史数据兜底：Yahoo chart 在部分服务器环境会长期返回空/403
  async getStockHistoryFromStooq(symbol, period = "1mo") {
    const cleanSymbol = String(symbol || "").trim().toLowerCase();
    if (!cleanSymbol) return [];

    const candidates = new Set([cleanSymbol]);
    if (!cleanSymbol.includes(".") && !cleanSymbol.startsWith("^")) {
      candidates.add(`${cleanSymbol}.us`);
    }

    const periodDaysMap = {
      "1mo": 35,
      "3mo": 100,
      "6mo": 190,
      "1y": 380,
      "5y": 1900,
    };
    const periodDays = periodDaysMap[period] || 35;

    const endDate = new Date();
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const toYmd = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");
    const toTimestamp = (dateString) => {
      const ts = Date.parse(`${dateString}T00:00:00Z`);
      return Number.isFinite(ts) ? ts : Date.now();
    };

    for (const candidate of candidates) {
      try {
        const response = await axios.get("https://stooq.com/q/d/l/", {
          params: {
            s: candidate,
            i: "d",
            d1: toYmd(startDate),
            d2: toYmd(endDate),
          },
          timeout: 7000,
          responseType: "text",
          transformResponse: [(data) => data],
        });

        const lines = String(response.data || "")
          .trim()
          .split(/\r?\n/)
          .filter(Boolean);

        if (lines.length <= 1) {
          continue;
        }

        const rows = lines
          .slice(1)
          .map((line) => line.split(","))
          .filter((cols) => cols.length >= 6)
          .map((cols) => {
            const close = parseFloat(cols[4]);
            if (!Number.isFinite(close) || close <= 0) return null;
            const open = parseFloat(cols[1]);
            const high = parseFloat(cols[2]);
            const low = parseFloat(cols[3]);
            const volume = parseFloat(cols[5]) || 0;

            return {
              date: cols[0],
              timestamp: toTimestamp(cols[0]),
              open: Number.isFinite(open) ? open : close,
              high: Number.isFinite(high) ? high : close,
              low: Number.isFinite(low) ? low : close,
              close,
              volume,
              price: close,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.timestamp - b.timestamp);

        if (rows.length > 0) {
          console.log(`✅ Stooq历史数据兜底成功: ${symbol} (${period}) ${rows.length} 个点`);
          return rows;
        }
      } catch (error) {
        console.warn(`⚠️ Stooq历史数据兜底失败 ${candidate}:`, error.message);
      }
    }

    return [];
  }

  async getDailyGainers(region = "US", options = {}) {
    try {
      const limit = options?.count || options?.limit || 25;
      const rows = await nasdaqService.getMarketMovers("gainers", limit);
      return { quotes: rows };
    } catch (error) {
      console.error("❌ 获取日涨幅榜失败:", error.message);
      return { quotes: [] };
    }
  }

  async getTrendingSymbols(region = "US", options = {}) {
    try {
      const limit = options?.count || options?.limit || 25;
      const rows = await nasdaqService.getMarketMovers("trending", limit);
      return rows.map((quote) => ({
        symbol: quote.symbol,
      }));
    } catch (error) {
      console.error("❌ 获取热门股票失败:", error.message);
      return [];
    }
  }

  // 📊 获取单个股票实时价格
  async getStockPrice(symbol) {
    try {
      const cacheKey = symbol.toUpperCase();
      const now = Date.now();

      // 检查缓存
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (now - cached.timestamp < this.cacheExpiry) {
          console.log(`📦 缓存命中: ${symbol}`);
          return cached.data;
        }
      }

      console.log(`🔍 获取股票数据: ${symbol}`);

      let fallbackStockData = await nasdaqService.getQuote(symbol).catch(() => null);
      if (!fallbackStockData) {
        fallbackStockData = await this.getStockPriceFromStooq(symbol);
      }
      if (fallbackStockData) {
        fallbackStockData = await this.enrichMarketCapFromSEC(fallbackStockData);
        this.cache.set(cacheKey, {
          data: fallbackStockData,
          timestamp: now,
        });
        return fallbackStockData;
      }

      return {
        symbol,
        name: symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        dayHigh: 0,
        dayLow: 0,
        open: 0,
        previousClose: 0,
        volume: 0,
        marketCap: 0,
        lastUpdated: new Date().toISOString(),
        provider: "fallback",
      };
    } catch (error) {
      console.error(`❌ 获取股票数据失败 ${symbol}:`, error.message);

      return {
        symbol: symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        dayHigh: 0,
        dayLow: 0,
        open: 0,
        previousClose: 0,
        volume: 0,
        marketCap: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  // 📦 获取缓存数据
  getCachedData(symbol) {
    const cacheKey = symbol.toUpperCase();
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      // 如果缓存还有效，返回数据
      if (now - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }
    return null;
  }

  // 📈 批量获取多个股票价格
  async getMultipleStockPrices(symbols) {
    try {
      const promises = symbols.map((symbol) => this.getStockPrice(symbol));
      const results = await Promise.allSettled(promises);

      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            symbol: symbols[index],
            name: symbols[index],
            price: 0,
            error: result.reason.message,
          };
        }
      });
    } catch (error) {
      console.error("❌ 批量获取股票数据失败:", error);
      throw error;
    }
  }

  // 🔍 搜索股票
  async searchStock(query) {
    try {
      const fallbackResults = await this.searchStockFallback(query);
      if (fallbackResults.length > 0) {
        return fallbackResults;
      }

      return [];
    } catch (error) {
      console.error("❌ 搜索股票失败:", error);
      return [];
    }
  }

  // 🛟 搜索降级方案：Yahoo不可用时使用公开符号搜索
  async searchStockFallback(query) {
    try {
      const nasdaqResults = await nasdaqService.search(query);
      if (nasdaqResults.length > 0) {
        return nasdaqResults;
      }

      const response = await axios.get(
        "https://api.twelvedata.com/symbol_search",
        {
          params: {
            symbol: query,
            outputsize: 10,
          },
          timeout: 5000,
        }
      );

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];

      return rows.map((item) => ({
        symbol: item.symbol,
        name: item.instrument_name || item.symbol,
        exchange: item.exchange || item.mic_code || "",
        type: item.instrument_type || "Unknown",
        typeDisp: item.instrument_type || "Unknown",
        quoteType: item.instrument_type || "Unknown",
      }));
    } catch (fallbackError) {
      console.error("❌ 搜索股票降级方案失败:", fallbackError.message);
      return [];
    }
  }

  decodeHtmlEntities(text = "") {
    return String(text)
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#([0-9]+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  }

  stripHtmlTags(text = "") {
    return String(text)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  extractRssTag(itemBlock, tagName) {
    const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
    const match = String(itemBlock || "").match(regex);
    return match ? match[1].trim() : "";
  }

  parseRssItems(xmlText, count = 5, defaultSource = "Google News") {
    const itemBlocks = String(xmlText || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];

    const parsedItems = itemBlocks
      .slice(0, count)
      .map((itemBlock) => {
        const rawTitle = this.extractRssTag(itemBlock, "title");
        const rawLink = this.extractRssTag(itemBlock, "link");
        const rawDescription = this.extractRssTag(itemBlock, "description");
        const rawPubDate = this.extractRssTag(itemBlock, "pubDate");
        const rawSource = this.extractRssTag(itemBlock, "source");

        const title = this.decodeHtmlEntities(rawTitle);
        const link = this.decodeHtmlEntities(rawLink);
        const summaryText = this.stripHtmlTags(this.decodeHtmlEntities(rawDescription));
        const compactSummary = summaryText.length > 280
          ? `${summaryText.slice(0, 277)}...`
          : summaryText;
        const source = this.stripHtmlTags(this.decodeHtmlEntities(rawSource)) || defaultSource;
        const publishDate = new Date(rawPubDate);
        const publishTime = Number.isNaN(publishDate.getTime())
          ? new Date().toISOString()
          : publishDate.toISOString();

        return {
          title,
          summary: compactSummary || "No summary available.",
          url: link,
          publishTime,
          source,
        };
      })
      .filter((item) => item.title && item.url);

    return parsedItems;
  }

  // Google News RSS兜底（免费、免API Key）
  async getStockNewsFromGoogle(symbol, count = 5) {
    const safeSymbol = String(symbol || "").trim().toUpperCase();
    if (!safeSymbol) return [];

    try {
      const query = encodeURIComponent(`${safeSymbol} stock`);
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

      const response = await axios.get(rssUrl, {
        timeout: 8000,
        responseType: "text",
        transformResponse: [(data) => data],
      });

      const parsed = this.parseRssItems(response.data, count, "Google News");
      if (parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn(`⚠️ Google News RSS兜底失败 ${safeSymbol}:`, error.message);
    }

    return [];
  }

  // 📰 获取股票新闻
  async getStockNews(symbol, count = 5) {
    return await this.getStockNewsFromGoogle(symbol, count);
  }

  // 🗑️ 清除缓存
  clearCache() {
    this.cache.clear();
    console.log("🗑️ 股票数据缓存已清除");
  }

  // 📊 获取缓存统计
  // 📈 获取股票历史数据
  async getStockHistory(symbol, period = '1mo') {
    try {
      console.log(`📊 获取历史数据: ${symbol} (${period})`);

      const nasdaqHistory = await nasdaqService.getHistory(symbol, period).catch(() => []);
      if (nasdaqHistory.length > 0) {
        return nasdaqHistory;
      }

      const stooqHistory = await this.getStockHistoryFromStooq(symbol, period);
      if (stooqHistory.length > 0) {
        return stooqHistory;
      }
      
      console.log(`⚠️ ${symbol} 在替代源无历史数据`);
      return [];
      
    } catch (error) {
      console.error(`❌ 获取 ${symbol} 历史数据失败:`, error.message);
      return [];
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// 创建单例实例
const yahooFinanceService = new YahooFinanceService();

module.exports = yahooFinanceService;
