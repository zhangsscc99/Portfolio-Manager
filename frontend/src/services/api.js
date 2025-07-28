import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Portfolio API
export const portfolioAPI = {
  // Get all portfolios
  getPortfolios: () => api.get('/portfolio'),
  
  // Get current portfolio
  getCurrentPortfolio: () => api.get('/portfolio/current'),
  
  // Get portfolio by ID
  getPortfolio: (id) => api.get(`/portfolio/${id}`),
  
  // Create new portfolio
  createPortfolio: (data) => api.post('/portfolio', data),
  
  // Update portfolio
  updatePortfolio: (id, data) => api.put(`/portfolio/${id}`, data),
  
  // Delete portfolio
  deletePortfolio: (id) => api.delete(`/portfolio/${id}`),
  
  // Get portfolio summary
  getPortfolioSummary: (id) => api.get(`/portfolio/${id}/summary`),
};

// Holdings API
export const holdingsAPI = {
  // Get all holdings
  getHoldings: () => api.get('/holdings'),
  
  // Get holding by ID
  getHolding: (id) => api.get(`/holdings/${id}`),
  
  // Add new holding
  addHolding: (data) => api.post('/holdings', data),
  
  // Update holding
  updateHolding: (id, data) => api.put(`/holdings/${id}`, data),
  
  // Delete holding
  deleteHolding: (id) => api.delete(`/holdings/${id}`),
  
  // Buy more shares
  buyShares: (id, data) => api.post(`/holdings/${id}/buy`, data),
  
  // Sell shares
  sellShares: (id, data) => api.post(`/holdings/${id}/sell`, data),
};

// Market Data API
export const marketAPI = {
  // Get quote for symbol
  getQuote: (symbol) => api.get(`/market/quote/${symbol}`),
  
  // Get multiple quotes
  getQuotes: (symbols) => api.get(`/market/quotes?symbols=${symbols.join(',')}`),
  
  // Get trending stocks
  getTrending: (limit = 10) => api.get(`/market/trending?limit=${limit}`),
  
  // Get top gainers
  getGainers: (limit = 5) => api.get(`/market/gainers?limit=${limit}`),
  
  // Get top losers
  getLosers: (limit = 5) => api.get(`/market/losers?limit=${limit}`),
  
  // Search stocks
  searchStocks: (query) => api.get(`/market/search/${query}`),
  
  // Get market indices
  getIndices: () => api.get('/market/indices'),
  
  // Get historical data
  getHistory: (symbol) => api.get(`/market/history/${symbol}`),
};

// Utility functions
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US').format(number);
};

export const formatPercentage = (percentage) => {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
};

export const getChangeColor = (change) => {
  if (change > 0) return '#10b981'; // green
  if (change < 0) return '#ef4444'; // red
  return '#6b7280'; // gray
};

export default api; 