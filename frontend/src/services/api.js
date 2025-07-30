import axios from "axios";
import { API_CONFIG } from "../config/api";

// Create axios instance with default config
const api = axios.create(API_CONFIG);

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("token");
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
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

// Portfolio API
export const portfolioAPI = {
  // Get all portfolios
  getPortfolios: () => api.get("/portfolio"),

  // Get current portfolio
  getCurrentPortfolio: () => api.get("/portfolio/current"),

  // Get portfolio by ID
  getPortfolio: (id) => api.get(`/portfolio/${id}`),

  // Create new portfolio
  createPortfolio: (data) => api.post("/portfolio", data),

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
  getHoldings: () => api.get("/holdings"),

  // Get holding by ID
  getHolding: (id) => api.get(`/holdings/${id}`),

  // Add new holding
  addHolding: (data) => api.post("/holdings", data),

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
  getQuotes: (symbols) =>
    api.get(`/market/quotes?symbols=${symbols.join(",")}`),

  // Get trending stocks
  getTrending: (page = 1, rowsPerPage = 10) => api.get(`/market/trending?page=${page}&limit=${rowsPerPage}`),

  getMostActive: (page = 1, rowsPerPage = 10) => api.get(`/market/most-active?page=${page}&limit=${rowsPerPage}`),

  // Get top gainers
  getGainers: (page = 1, rowsPerPage = 10) => api.get(`/market/gainers?page=${page}&limit=${rowsPerPage}`),

  // Get top losers
  getLosers: (page = 1, rowsPerPage = 10) => api.get(`/market/losers?page=${page}&limit=${rowsPerPage}`),

  // Search stocks
  searchStocks: (query) =>
    api.get(`/market/search?q=${encodeURIComponent(query)}`),

  // Get market indices
  getIndices: () => api.get("/market/indices"),

  // Get historical data
  getHistory: (symbol) => api.get(`/market/history/${symbol}`),

  getCryptos: (page = 1, rowsPerPage = 10) => api.get(`/market/crypto?page=${page}&limit=${rowsPerPage}`),

  getETFsMostActive: (page = 1, rowsPerPage = 10) => api.get(`/market/etfs/most-active?page=${page}&limit=${rowsPerPage}`),

  getETFGainers: (page = 1, rowsPerPage = 10) => api.get(`/market/etfs/gainers?page=${page}&limit=${rowsPerPage}`),  

  getETFLosers: (page = 1, rowsPerPage = 10) => api.get(`/market/etfs/losers?page=${page}&limit=${rowsPerPage}`),

  getETFtrending: (page = 1, rowsPerPage = 10) => api.get(`/market/etfs/trending?page=${page}&limit=${rowsPerPage}`),

  getBonds: (page = 1) => api.get(`/market/bonds?page=${page}`),
  // --- END NEW ---
};

// Utility functions
export const formatCurrency = (amount, currency = "USD") => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return currency === "USD" ? "$0.00" : `0.00 ${currency}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4, // Increased precision for currency display
  }).format(amount);
};

export const formatNumber = (number) => {
  if (number === undefined || number === null || isNaN(number)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US").format(number);
};

export const formatPercentage = (percentage) => {
  if (percentage === undefined || percentage === null || isNaN(percentage)) {
    return "0.00%";
  }
  return `${percentage >= 0 ? "+" : ""}${(percentage * 100).toFixed(2)}%`;
};

export const getChangeColor = (change) => {
  if (change === undefined || change === null || isNaN(change)) {
    return "text.primary";
  }
  if (change > 0) return "#10b981"; // green
  if (change < 0) return "#ef4444"; // red
  return "#6b7280"; // gray
};

export const getPercentageColorFromString = (percentageString) => {
  // Handle null, undefined, or empty strings gracefully
  if (percentageString === undefined || percentageString === null || percentageString === '') {
    return "#6b7280"; // Default to gray for missing/invalid data
  }

  // 1. Clean the string: Remove '%' and any leading/trailing whitespace.
  // parseFloat can handle leading '+' or '-' signs directly.
  const cleanedString = percentageString.replace(/%/g, '').trim();

  // 2. Parse the cleaned string into a floating-point number.
  const numericPercentage = parseFloat(cleanedString);

  // 3. Check if the parsing was successful.
  if (isNaN(numericPercentage)) {
    // Log a warning if the string couldn't be converted to a number,
    // which helps in debugging unexpected API formats.
    console.warn(`Could not parse percentage string for color determination: "${percentageString}". Cleaned: "${cleanedString}"`);
    return "#6b7280"; // Fallback to gray for unparseable strings
  }

  // 4. Apply color logic based on the numeric value.
  if (numericPercentage > 0) {
    return "#10b981"; // Green for positive change
  }
  if (numericPercentage < 0) {
    return "#ef4444"; // Red for negative change
  }
  return "#6b7280"; // Gray for zero or no change
};
export default api;
