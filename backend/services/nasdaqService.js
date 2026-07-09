const axios = require("axios");

const NASDAQ_BASE_URL = "https://api.nasdaq.com/api";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
};

const INDEX_MAP = {
  "^IXIC": "COMP",
  IXIC: "COMP",
  COMP: "COMP",
  "^NDX": "NDX",
  NDX: "NDX",
};

const INDEX_FALLBACK_ETFS = {
  "^GSPC": { symbol: "SPY", name: "S&P 500" },
  GSPC: { symbol: "SPY", name: "S&P 500" },
  "^DJI": { symbol: "DIA", name: "Dow Jones" },
  DJI: { symbol: "DIA", name: "Dow Jones" },
  "^RUT": { symbol: "IWM", name: "Russell 2000" },
  RUT: { symbol: "IWM", name: "Russell 2000" },
};

const BOND_ETF_UNIVERSE = [
  { symbol: "BND", name: "Vanguard Total Bond Market ETF" },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF" },
  { symbol: "IEF", name: "iShares 7-10 Year Treasury Bond ETF" },
  { symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF" },
  { symbol: "LQD", name: "iShares iBoxx Investment Grade Corporate Bond ETF" },
  { symbol: "HYG", name: "iShares iBoxx High Yield Corporate Bond ETF" },
  { symbol: "MUB", name: "iShares National Muni Bond ETF" },
  { symbol: "TIP", name: "iShares TIPS Bond ETF" },
  { symbol: "VCIT", name: "Vanguard Intermediate-Term Corporate Bond ETF" },
];

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatFixed = (value, digits = 2) => {
  const parsed = toNumber(value);
  return parsed ? parsed.toFixed(digits) : "0.00";
};

const formatPercent = (value, digits = 2) => {
  const raw = String(value || "").trim();
  if (raw.endsWith("%")) return raw.startsWith("+") || raw.startsWith("-") ? raw : `+${raw}`;
  const parsed = toNumber(value);
  if (!parsed) return "0.00%";
  return `${parsed > 0 ? "+" : ""}${parsed.toFixed(digits)}%`;
};

const compact = (value) => {
  const parsed = toNumber(value);
  if (!parsed) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(parsed);
};

const toIsoDate = (mmddyyyy) => {
  const parts = String(mmddyyyy || "").split("/");
  if (parts.length !== 3) return new Date().toISOString().slice(0, 10);
  const [month, day, year] = parts;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

class NasdaqService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiryMs = 60 * 1000;
  }

  async request(path, params = {}) {
    const response = await axios.get(`${NASDAQ_BASE_URL}${path}`, {
      params,
      headers: REQUEST_HEADERS,
      timeout: 12000,
    });
    return response.data;
  }

  async getQuote(symbol, assetClass = "stocks") {
    const normalized = String(symbol || "").trim().toUpperCase();
    if (!normalized) return null;

    const mappedIndex = INDEX_MAP[normalized];
    const fallbackEtf = INDEX_FALLBACK_ETFS[normalized];
    if (fallbackEtf) {
      const quote = await this.getQuote(fallbackEtf.symbol, "etf");
      return quote ? { ...quote, symbol: normalized, name: fallbackEtf.name } : null;
    }

    const symbolForRequest = mappedIndex || normalized.replace(/^\^/, "");
    const requestAssetClass = mappedIndex ? "index" : assetClass;
    const cacheKey = `quote:${requestAssetClass}:${symbolForRequest}`;
    const cached = this.getCached(cacheKey);
    if (cached) return mappedIndex ? { ...cached, symbol: normalized } : cached;

    let payload;
    try {
      payload = await this.request(`/quote/${encodeURIComponent(symbolForRequest)}/info`, {
        assetclass: requestAssetClass,
      });
    } catch (error) {
      if (requestAssetClass === "stocks") {
        payload = await this.request(`/quote/${encodeURIComponent(symbolForRequest)}/info`, {
          assetclass: "etf",
        });
      } else {
        throw error;
      }
    }

    if (!payload?.data && requestAssetClass === "stocks") {
      payload = await this.request(`/quote/${encodeURIComponent(symbolForRequest)}/info`, {
        assetclass: "etf",
      });
    }

    const data = payload?.data;
    const primary = data?.primaryData;
    if (!data || !primary) return null;

    const price = toNumber(primary.lastSalePrice);
    const change = toNumber(primary.netChange);
    const changePercent = toNumber(primary.percentageChange);
    const previousClose = price - change || price;

    const quote = {
      symbol: mappedIndex ? normalized : data.symbol || normalized,
      name: data.companyName || normalized,
      price,
      change,
      changePercent,
      dayHigh: price,
      dayLow: price,
      open: price,
      previousClose,
      volume: toNumber(primary.volume),
      marketCap: 0,
      lastUpdated: new Date().toISOString(),
      provider: "nasdaq",
    };

    this.setCached(cacheKey, quote);
    return quote;
  }

  async getHistory(symbol, period = "1mo") {
    const normalized = String(symbol || "").trim().toUpperCase();
    if (!normalized) return [];

    const cacheKey = `history:${normalized}:${period}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const periodDaysMap = {
      "1mo": 35,
      "3mo": 100,
      "6mo": 190,
      "1y": 380,
      "5y": 1900,
    };
    const days = periodDaysMap[period] || 35;
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const toRequestDate = (date) => date.toISOString().slice(0, 10);

    let payload = await this.request(`/quote/${encodeURIComponent(normalized)}/historical`, {
      assetclass: "stocks",
      fromdate: toRequestDate(start),
      todate: toRequestDate(end),
      limit: 9999,
    });

    let rows = payload?.data?.tradesTable?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      payload = await this.request(`/quote/${encodeURIComponent(normalized)}/historical`, {
        assetclass: "etf",
        fromdate: toRequestDate(start),
        todate: toRequestDate(end),
        limit: 9999,
      });
      rows = payload?.data?.tradesTable?.rows;
    }
    if (!Array.isArray(rows)) return [];

    const history = rows
      .map((row) => {
        const close = toNumber(row.close);
        if (!close) return null;
        const date = toIsoDate(row.date);
        return {
          date,
          timestamp: Date.parse(`${date}T00:00:00Z`) || Date.now(),
          open: toNumber(row.open) || close,
          high: toNumber(row.high) || close,
          low: toNumber(row.low) || close,
          close,
          volume: toNumber(row.volume),
          price: close,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);

    this.setCached(cacheKey, history);
    return history;
  }

  async search(query) {
    const safeQuery = String(query || "").trim();
    if (!safeQuery) return [];

    const payload = await this.request(`/autocomplete/slookup/10`, {
      search: safeQuery,
    });

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    return rows.slice(0, 10).map((item) => ({
      symbol: item.symbol,
      name: item.name || item.symbol,
      exchange: item.exchange || item.mrktCategory || "",
      type: item.asset || item.subCategory || "Unknown",
      typeDisp: item.subCategory || item.asset || "Unknown",
      quoteType: item.subCategory || item.asset || "Unknown",
    }));
  }

  async getMarketMovers(kind, limit = 25) {
    const payload = await this.request("/marketmovers", {
      assetclass: "stocks",
      limit,
    });
    const stocks = payload?.data?.STOCKS || {};
    const keyByKind = {
      active: "MostActiveByShareVolume",
      gainers: "MostAdvanced",
      losers: "MostDeclined",
      trending: "Nasdaq100Movers",
    };
    const key = keyByKind[kind] || "MostActiveByShareVolume";
    const rows = stocks?.[key]?.table?.rows;
    return Array.isArray(rows) ? rows.map((row) => this.formatMoverRow(row)) : [];
  }

  async getEtfPage(page, limit, category = "most-active") {
    const offset = (page - 1) * limit;
    const payload = await this.request("/screener/etf", {
      tableonly: true,
      limit,
      offset,
    });

    const records = payload?.data?.records;
    const rows = records?.data?.rows;
    const totalRecords = toNumber(records?.totalrecords) || (Array.isArray(rows) ? rows.length : 0);
    const mappedRows = (Array.isArray(rows) ? rows : []).map((row) => this.formatEtfRow(row));

    if (category === "gainers") {
      mappedRows.sort((a, b) => toNumber(b.changePercent) - toNumber(a.changePercent));
    } else if (category === "losers") {
      mappedRows.sort((a, b) => toNumber(a.changePercent) - toNumber(b.changePercent));
    }

    return {
      data: mappedRows,
      totalRecords,
      totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
      source: "nasdaq",
    };
  }

  async getBondEtfPage(page, limit) {
    const rows = await Promise.all(
      BOND_ETF_UNIVERSE.map(async (item) => {
        const quote = await this.getQuote(item.symbol, "etf");
        if (!quote) return null;
        return {
          symbol: item.symbol,
          name: item.name,
          price: formatFixed(quote.price),
          change: formatFixed(quote.change),
          changePercent: formatPercent(quote.changePercent),
          marketVolume: compact(quote.volume),
          fiftyDayAvg: "N/A",
          twoHundredDayAvg: "N/A",
          trailing3MonthReturn: "N/A",
          ytdReturn: "N/A",
          fiftyTwoWeekChangePercent: "N/A",
          fiftyTwoWeekRange: "N/A",
        };
      })
    );

    const validRows = rows.filter(Boolean);
    const start = (page - 1) * limit;
    return {
      data: validRows.slice(start, start + limit),
      totalRecords: validRows.length,
      totalPages: Math.max(1, Math.ceil(validRows.length / limit)),
      source: "nasdaq",
    };
  }

  formatMoverRow(row) {
    const price = toNumber(row.lastSalePrice);
    const change = toNumber(row.lastSaleChange);
    const changePercent = String(row.change || "").includes("%")
      ? toNumber(row.change)
      : price && change
      ? (change / (price - change)) * 100
      : 0;
    const volume = String(row.change || "").includes("%") ? 0 : toNumber(row.change);

    return {
      symbol: String(row.symbol || "").toUpperCase(),
      name: row.name || row.symbol || "",
      price: price >= 1 ? price.toFixed(2) : price.toFixed(4),
      change: change.toFixed(2),
      changePercent: `${changePercent.toFixed(2)}%`,
      volume: volume ? Math.round(volume).toLocaleString("en-US") : "N/A",
      avgVolume: "N/A",
      marketCap: "N/A",
      peRatio: "N/A",
      fiftyTwoWeekChangePercent: "N/A",
      fiftyTwoWeekRange: "N/A",
      open: "N/A",
    };
  }

  formatEtfRow(row) {
    return {
      symbol: row.symbol,
      name: row.companyName || row.name || row.symbol,
      price: formatFixed(row.lastSalePrice),
      change: formatFixed(row.netChange),
      changePercent: formatPercent(row.percentageChange),
      marketVolume: "N/A",
      fiftyDayAvg: "N/A",
      twoHundredDayAvg: "N/A",
      trailing3MonthReturn: "N/A",
      ytdReturn: "N/A",
      fiftyTwoWeekChangePercent: row.oneYearPercentage || "N/A",
      fiftyTwoWeekRange: "N/A",
    };
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }
    return cached.value;
  }

  setCached(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
}

module.exports = new NasdaqService();
