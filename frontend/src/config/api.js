// API Configuration
const getBaseURL = () => {
  // 优先使用环境变量
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 根据环境自动判断
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }
  
  // 生产环境默认使用公网IP
  return 'http://47.243.102.28:5000/api';
};

export const API_CONFIG = {
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// API endpoints
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

  // Holdings endpoints
  holdings: {
    getAll: '/holdings',
    getById: (id) => `/holdings/${id}`,
    create: '/holdings',
    update: (id) => `/holdings/${id}`,
    delete: (id) => `/holdings/${id}`,
    buy: (id) => `/holdings/${id}/buy`,
    sell: (id) => `/holdings/${id}/sell`,
  },

  // Market data endpoints
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

  // Assets endpoints (for Portfolio.js direct calls)
  assets: {
    portfolio: (id) => `/assets/portfolio/${id}`,
    watchlist: '/assets/watchlist',
    updatePrices: '/assets/update-prices',
    create: '/assets',
  },
};

// Helper function to build full URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.baseURL}${endpoint}`;
}; 