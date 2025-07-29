// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// API endpoints
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export const API_ENDPOINTS = {
  portfolio_history: {
    portfolio_history: '/portfolio-history',  // 历史数据
  },

  // Portfolio endpoints
  portfolio: {
    getAll: '/portfolio',
    getCurrent: '/portfolio/current',
    getById: (id) => `/portfolio/${id}`,
    create: '/portfolio',
    update: (id) => `/portfolio/${id}`,
    delete: (id) => `/portfolio/${id}`,
    getSummary: (id) => `/portfolio/${id}/summary`,
  },

  // Holdings endpoints (保持原有格式)
  holdings: {
    getAll: '/holdings',
    getById: (id) => `/holdings/${id}`,
    create: '/holdings',
    update: (id) => `/holdings/${id}`,
    delete: (id) => `/holdings/${id}`,
    buy: (id) => `/holdings/${id}/buy`,
    sell: (id) => `/holdings/${id}/sell`,
  },

  // Market data endpoints (保持原有格式)
  market: {
    quote: (symbol) => `/market/quote/${symbol}`,
    quotes: (symbols) => `/market/quotes?symbols=${symbols.join(',')}`,
    trending: (limit = 10) => `/market/trending?limit=${limit}`,
    gainers: (limit = 5) => `/market/gainers?limit=${limit}`,
    losers: (limit = 5) => `/market/losers?limit=${limit}`,
    search: (query) => `/market/search?q=${encodeURIComponent(query)}`,
    indices: '/market/indices',
    history: (symbol) => `/market/history/${symbol}`,
  },

  // Assets endpoints (保持原有格式，用于Portfolio.js)
  assets: {
    portfolio: (id) => `/assets/portfolio/${id}`,
    watchlist: '/assets/watchlist',
    updatePrices: '/assets/update-prices',
    create: '/assets',
    list: '/assets',
    byId: (id) => `/assets/${id}`,
    byPortfolio: (portfolioId) => `/assets/portfolio/${portfolioId}`,
    update: (id) => `/assets/${id}`,
    delete: (id) => `/assets/${id}`,
  },

  // AI Analysis endpoints (新功能)
  aiAnalysis: {
    portfolio: (id) => `/ai-analysis/portfolio/${id}`,
    generateReport: '/ai-analysis/portfolio',
    quickInsights: (id) => `/ai-analysis/quick-insights/${id}`,
    testConnection: '/ai-analysis/test-connection',
    
    // Chat endpoints (新的AI助手功能)
    chat: '/ai-analysis/chat',
    sessionInfo: (sessionId) => `/ai-analysis/chat/session/${sessionId}`,
  },

  // Market data endpoints (新格式，如果需要的话)
  marketData: {
    stocks: '/market/stocks',
    crypto: '/market/crypto',
    updatePrices: '/market/update-prices',
  },
}; 