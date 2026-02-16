const axios = require("axios");

class AlphaVantageService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.cacheExpiryMs = 2 * 60 * 1000; // 2 minutes
  }

  getApiKey() {
    return (
      process.env.ALPHA_VANTAGE_API_KEY ||
      process.env.ALPHAVANTAGE_API_KEY ||
      "demo"
    );
  }

  async getTopGainersLosers(forceRefresh = false) {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cache &&
      now - this.cacheTimestamp < this.cacheExpiryMs
    ) {
      return this.cache;
    }

    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "TOP_GAINERS_LOSERS",
        apikey: this.getApiKey(),
      },
      timeout: 10000,
    });

    const payload = response.data || {};

    const topGainers = Array.isArray(payload.top_gainers)
      ? payload.top_gainers
      : [];
    const topLosers = Array.isArray(payload.top_losers) ? payload.top_losers : [];
    const mostActive = Array.isArray(payload.most_actively_traded)
      ? payload.most_actively_traded
      : [];

    if (!topGainers.length && !topLosers.length && !mostActive.length) {
      const apiError =
        payload.Note ||
        payload.Information ||
        payload.message ||
        "Alpha Vantage returned no market mover data";
      throw new Error(apiError);
    }

    const normalized = {
      metadata: payload.metadata || "",
      lastUpdated: payload.last_updated || null,
      topGainers,
      topLosers,
      mostActive,
    };

    this.cache = normalized;
    this.cacheTimestamp = now;
    return normalized;
  }
}

module.exports = new AlphaVantageService();
