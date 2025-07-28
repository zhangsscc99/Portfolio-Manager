const express = require('express');
const router = express.Router();

// Mock market data - in production, this would connect to real APIs like Yahoo Finance, Alpha Vantage, etc.
const mockMarketData = {
  'AAPL': { 
    symbol: 'AAPL', 
    name: 'Apple Inc.', 
    price: 175.25, 
    change: 2.34, 
    changePercent: 1.35,
    volume: 52847392,
    marketCap: 2745678123456,
    peRatio: 28.5,
    dividendYield: 0.51
  },
  'GOOGL': { 
    symbol: 'GOOGL', 
    name: 'Alphabet Inc.', 
    price: 2680.50, 
    change: -15.25, 
    changePercent: -0.56,
    volume: 1247392,
    marketCap: 1745678123456,
    peRatio: 25.2,
    dividendYield: 0.0
  },
  'MSFT': { 
    symbol: 'MSFT', 
    name: 'Microsoft Corporation', 
    price: 315.75, 
    change: 4.12, 
    changePercent: 1.32,
    volume: 28547392,
    marketCap: 2345678123456,
    peRatio: 32.1,
    dividendYield: 0.73
  },
  'TSLA': { 
    symbol: 'TSLA', 
    name: 'Tesla Inc.', 
    price: 245.60, 
    change: -12.80, 
    changePercent: -4.95,
    volume: 98547392,
    marketCap: 778678123456,
    peRatio: 65.4,
    dividendYield: 0.0
  },
  'AMZN': { 
    symbol: 'AMZN', 
    name: 'Amazon.com Inc.', 
    price: 3150.80, 
    change: 18.45, 
    changePercent: 0.59,
    volume: 3247392,
    marketCap: 1565678123456,
    peRatio: 58.2,
    dividendYield: 0.0
  }
};

// Generate mock trending stocks
const generateTrendingStocks = () => {
  const symbols = Object.keys(mockMarketData);
  return symbols.map(symbol => {
    const data = mockMarketData[symbol];
    return {
      ...data,
      // Add some randomness for trending effect
      change: data.change + (Math.random() - 0.5) * 5,
      changePercent: data.changePercent + (Math.random() - 0.5) * 2
    };
  }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
};

// GET /api/market/quote/:symbol - Get quote for specific symbol
router.get('/quote/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const quote = mockMarketData[symbol];
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: `Quote not found for symbol: ${symbol}`
      });
    }

    // Add some random fluctuation to simulate real-time data
    const fluctuation = (Math.random() - 0.5) * 0.02; // ±1% fluctuation
    const currentPrice = quote.price * (1 + fluctuation);
    const change = currentPrice - quote.price;
    const changePercent = (change / quote.price) * 100;

    res.json({
      success: true,
      data: {
        ...quote,
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/market/quotes - Get quotes for multiple symbols
router.get('/quotes', (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : [];
    
    if (symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No symbols provided. Use ?symbols=AAPL,GOOGL,MSFT'
      });
    }

    const quotes = symbols.map(symbol => {
      const upperSymbol = symbol.toUpperCase().trim();
      const quote = mockMarketData[upperSymbol];
      
      if (!quote) {
        return {
          symbol: upperSymbol,
          error: 'Quote not found'
        };
      }

      // Add random fluctuation
      const fluctuation = (Math.random() - 0.5) * 0.02;
      const currentPrice = quote.price * (1 + fluctuation);
      const change = currentPrice - quote.price;
      const changePercent = (change / quote.price) * 100;

      return {
        ...quote,
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        timestamp: new Date().toISOString()
      };
    });

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

// GET /api/market/trending - Get trending/most active stocks
router.get('/trending', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const trending = generateTrendingStocks().slice(0, limit);

    res.json({
      success: true,
      data: trending
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/market/gainers - Get top gainers
router.get('/gainers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const gainers = Object.values(mockMarketData)
      .filter(stock => stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);

    res.json({
      success: true,
      data: gainers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/market/losers - Get top losers
router.get('/losers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const losers = Object.values(mockMarketData)
      .filter(stock => stock.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);

    res.json({
      success: true,
      data: losers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/market/search/:query - Search for stocks
router.get('/search/:query', (req, res) => {
  try {
    const query = req.params.query.toUpperCase();
    const results = Object.values(mockMarketData).filter(stock => 
      stock.symbol.includes(query) || 
      stock.name.toUpperCase().includes(query)
    );

    // Add some additional mock search results
    const additionalStocks = [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 450.25 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', price: 125.30 },
      { symbol: 'INTC', name: 'Intel Corporation', price: 45.75 },
      { symbol: 'META', name: 'Meta Platforms Inc.', price: 285.60 },
      { symbol: 'NFLX', name: 'Netflix Inc.', price: 385.90 }
    ].filter(stock => 
      stock.symbol.includes(query) || 
      stock.name.toUpperCase().includes(query)
    );

    const allResults = [...results, ...additionalStocks];

    res.json({
      success: true,
      data: allResults,
      query: req.params.query
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/market/indices - Get major market indices
router.get('/indices', (req, res) => {
  try {
    const indices = [
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF',
        price: 425.75,
        change: 2.45,
        changePercent: 0.58
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        price: 365.20,
        change: -1.85,
        changePercent: -0.50
      },
      {
        symbol: 'DIA',
        name: 'SPDR Dow Jones Industrial Average ETF',
        price: 355.80,
        change: 1.25,
        changePercent: 0.35
      },
      {
        symbol: 'IWM',
        name: 'iShares Russell 2000 ETF',
        price: 195.45,
        change: 0.85,
        changePercent: 0.44
      }
    ];

    res.json({
      success: true,
      data: indices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/market/history/:symbol - Get historical price data
router.get('/history/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const quote = mockMarketData[symbol];
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: `Historical data not found for symbol: ${symbol}`
      });
    }

    // Generate mock historical data for the last 30 days
    const history = [];
    const today = new Date();
    let currentPrice = quote.price;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Add some random price movement
      const change = (Math.random() - 0.5) * currentPrice * 0.03; // ±1.5% daily change
      currentPrice += change;
      
      history.push({
        date: date.toISOString().split('T')[0],
        open: parseFloat((currentPrice * 0.995).toFixed(2)),
        high: parseFloat((currentPrice * 1.015).toFixed(2)),
        low: parseFloat((currentPrice * 0.985).toFixed(2)),
        close: parseFloat(currentPrice.toFixed(2)),
        volume: Math.floor(Math.random() * 50000000) + 1000000
      });
    }

    res.json({
      success: true,
      data: {
        symbol,
        name: quote.name,
        history
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 