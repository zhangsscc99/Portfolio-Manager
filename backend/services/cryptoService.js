const axios = require('axios');

// 💎 加密货币价格服务
class CryptoService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1分钟缓存
    this.baseURL = 'https://api.coingecko.com/api/v3';
  }

  // 📊 获取单个加密货币价格
  async getCryptoPrice(symbol) {
    try {
      const cacheKey = symbol.toLowerCase();
      const now = Date.now();
      
      // 检查缓存
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (now - cached.timestamp < this.cacheExpiry) {
          console.log(`📦 加密货币缓存命中: ${symbol}`);
          return cached.data;
        }
      }

      console.log(`🔍 获取加密货币数据: ${symbol}`);
      
      // 映射常见的加密货币符号
      const coinMap = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'ada': 'cardano',
        'dot': 'polkadot',
        'link': 'chainlink',
        'matic': 'matic-network',
        'sol': 'solana',
        'avax': 'avalanche-2',
        'atom': 'cosmos',
        'near': 'near'
      };
      
      const coinId = coinMap[symbol.toLowerCase()] || symbol.toLowerCase();
      
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_24hr_vol: 'true',
          include_market_cap: 'true'
        },
        timeout: 5000
      });

      const coinData = response.data[coinId];
      if (!coinData) {
        throw new Error(`未找到加密货币数据: ${symbol}`);
      }

      const cryptoData = {
        symbol: symbol.toUpperCase(),
        name: coinId,
        price: coinData.usd || 0,
        change: coinData.usd_24h_change || 0,
        changePercent: coinData.usd_24h_change || 0,
        volume: coinData.usd_24h_vol || 0,
        marketCap: coinData.usd_market_cap || 0,
        lastUpdated: new Date().toISOString()
      };

      // 缓存数据
      this.cache.set(cacheKey, {
        data: cryptoData,
        timestamp: now
      });

      return cryptoData;
    } catch (error) {
      console.error(`❌ 获取加密货币数据失败 ${symbol}:`, error.message);
      
      // 返回默认数据避免崩溃
      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toLowerCase(),
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // 📈 批量获取加密货币价格
  async getMultipleCryptoPrices(symbols) {
    try {
      const promises = symbols.map(symbol => this.getCryptoPrice(symbol));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            symbol: symbols[index],
            name: symbols[index],
            price: 0,
            error: result.reason.message
          };
        }
      });
    } catch (error) {
      console.error('❌ 批量获取加密货币数据失败:', error);
      throw error;
    }
  }

  // 📦 获取缓存数据
  getCachedData(symbol) {
    const cacheKey = symbol.toLowerCase();
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

  // 🔍 搜索加密货币
  async searchCrypto(query) {
    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: { query },
        timeout: 5000
      });

      return response.data.coins.slice(0, 10).map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id,
        type: 'crypto'
      }));
    } catch (error) {
      console.error('❌ 搜索加密货币失败:', error);
      return [];
    }
  }

  // 🗑️ 清除缓存
  clearCache() {
    this.cache.clear();
    console.log('🗑️ 加密货币数据缓存已清除');
  }
}

// 创建单例实例
const cryptoService = new CryptoService();

module.exports = cryptoService; 