const yahooFinance = require('yahoo-finance2').default;

// 🏢 Yahoo Finance API服务
class YahooFinanceService {
  constructor() {
    this.cache = new Map(); // 简单缓存
    this.cacheExpiry = 60000; // 1分钟缓存
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
      
      // 从Yahoo Finance获取数据
      const quote = await yahooFinance.quote(symbol, {
        fields: [
          'regularMarketPrice',
          'regularMarketChange',
          'regularMarketChangePercent',
          'regularMarketDayHigh',
          'regularMarketDayLow',
          'regularMarketOpen',
          'regularMarketPreviousClose',
          'regularMarketVolume',
          'marketCap',
          'shortName',
          'longName'
        ]
      });

      const stockData = {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || symbol,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        dayHigh: quote.regularMarketDayHigh || 0,
        dayLow: quote.regularMarketDayLow || 0,
        open: quote.regularMarketOpen || 0,
        previousClose: quote.regularMarketPreviousClose || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap || 0,
        lastUpdated: new Date().toISOString()
      };

      // 缓存数据
      this.cache.set(cacheKey, {
        data: stockData,
        timestamp: now
      });

      return stockData;
    } catch (error) {
      console.error(`❌ 获取股票数据失败 ${symbol}:`, error.message);
      return {
        error: error.message,
        symbol: symbol,
        price: 0,
        change: 0,
        changePercent: 0
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
      const promises = symbols.map(symbol => this.getStockPrice(symbol));
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
      console.error('❌ 批量获取股票数据失败:', error);
      throw error;
    }
  }

  // 🔍 搜索股票
  async searchStock(query) {
    try {
      const searchResults = await yahooFinance.search(query, {
        quotesCount: 10,
        newsCount: 0
      });

      return searchResults.quotes.map(quote => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname,
        exchange: quote.exchange,
        type: quote.typeDisp
      }));
    } catch (error) {
      console.error('❌ 搜索股票失败:', error);
      return [];
    }
  }

  // 📰 获取股票新闻
  async getStockNews(symbol, count = 5) {
    try {
      const news = await yahooFinance.search(symbol, {
        quotesCount: 0,
        newsCount: count
      });

      return news.news.map(item => ({
        title: item.title,
        summary: item.summary,
        url: item.link,
        publishTime: new Date(item.providerPublishTime * 1000).toISOString(),
        source: item.publisher
      }));
    } catch (error) {
      console.error('❌ 获取股票新闻失败:', error);
      return [];
    }
  }

  // 🗑️ 清除缓存
  clearCache() {
    this.cache.clear();
    console.log('🗑️ 股票数据缓存已清除');
  }

  // 📊 获取缓存统计
  // 📈 获取股票历史数据
  async getStockHistory(symbol, period = '1mo') {
    try {
      console.log(`📊 获取历史数据: ${symbol} (${period})`);
      
      // 计算日期范围
      const endDate = new Date();
      const startDate = new Date();
      
      // 根据period设置开始日期
      switch (period) {
        case '1mo':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3mo':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6mo':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);  
          break;
        case '5y':
          startDate.setFullYear(startDate.getFullYear() - 5);  
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }
      
      // 从Yahoo Finance获取历史数据 (使用chart方法替代已废弃的historical)
      let interval = '1d'; // 默认日线数据
      
      // 对于5年数据，可能需要使用更长的间隔来避免API限制
      if (period === '5y') {
        interval = '1wk'; // 使用周线数据来获取更长的历史
        console.log(`📊 5y数据使用周线间隔: ${interval}`);
      }
      
      const chartResult = await yahooFinance.chart(symbol, {
        period1: startDate,
        period2: endDate,
        interval: interval
      });
      
      // chart方法返回的格式: { quotes: [...] }
      const historicalResult = chartResult?.quotes || [];
      
      if (!historicalResult || historicalResult.length === 0) {
        console.log(`⚠️ ${symbol} 没有历史数据`);
        return [];
      }
      
      // 添加调试信息
      if (period === '5y') {
        console.log(`📊 ${symbol} 5y数据获取情况:`);
        console.log(`   - 请求时间范围: ${startDate.toLocaleDateString()} 到 ${endDate.toLocaleDateString()}`);
        console.log(`   - 使用间隔: ${interval}`);
        console.log(`   - 获取到数据点: ${historicalResult.length}`);
        if (historicalResult.length > 0) {
          const firstDate = historicalResult[0].date;
          const lastDate = historicalResult[historicalResult.length - 1].date;
          console.log(`   - 实际数据范围: ${firstDate.toLocaleDateString()} 到 ${lastDate.toLocaleDateString()}`);
        }
      }
      
      // 格式化数据 - chart数据格式与historical略有不同
      const formattedData = historicalResult.map(item => ({
        date: item.date ? item.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        timestamp: item.date ? item.date.getTime() : Date.now(),
        open: item.open || 0,
        high: item.high || 0,
        low: item.low || 0,
        close: item.close || 0,
        volume: item.volume || 0,
        price: item.close || 0 // 用收盘价作为price
      }));
      
      console.log(`✅ 获取到 ${symbol} 历史数据: ${formattedData.length} 个数据点`);
      return formattedData;
      
    } catch (error) {
      console.error(`❌ 获取 ${symbol} 历史数据失败:`, error.message);
      return [];
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// 创建单例实例
const yahooFinanceService = new YahooFinanceService();

module.exports = yahooFinanceService; 