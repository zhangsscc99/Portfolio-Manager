const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const Holding = require('../models/Holding');

// In-memory storage (replace with database in production)
let portfolios = [];
let currentPortfolio = null;

// Initialize with sample data
const initializeSampleData = () => {
  if (portfolios.length === 0) {
    const samplePortfolio = new Portfolio('My Investment Portfolio', 'Main investment portfolio');
    samplePortfolio.cash = 25000;
    
    // Add sample holdings
    const sampleHoldings = [
      { symbol: 'AAPL', name: 'Apple Inc.', quantity: 10, avgPrice: 150.00, currentPrice: 175.25 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 5, avgPrice: 2500.00, currentPrice: 2680.50 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', quantity: 8, avgPrice: 300.00, currentPrice: 315.75 },
      { symbol: 'TSLA', name: 'Tesla Inc.', quantity: 3, avgPrice: 800.00, currentPrice: 245.60 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', quantity: 2, avgPrice: 3200.00, currentPrice: 3150.80 }
    ];

    sampleHoldings.forEach(holdingData => {
      const holding = new Holding(holdingData);
      samplePortfolio.addHolding(holding.toJSON());
    });

    portfolios.push(samplePortfolio);
    currentPortfolio = samplePortfolio;
  }
};

// Initialize sample data
initializeSampleData();

// GET /api/portfolio - Get all portfolios
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: portfolios.map(p => p.toJSON())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/portfolio/current - Get current portfolio
router.get('/current', (req, res) => {
  try {
    if (!currentPortfolio) {
      initializeSampleData();
    }
    res.json({
      success: true,
      data: currentPortfolio.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/portfolio/:id - Get portfolio by ID
router.get('/:id', (req, res) => {
  try {
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }
    res.json({
      success: true,
      data: portfolio.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/portfolio - Create new portfolio
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    const portfolio = new Portfolio(name, description);
    portfolios.push(portfolio);
    
    if (!currentPortfolio) {
      currentPortfolio = portfolio;
    }

    res.status(201).json({
      success: true,
      data: portfolio.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/portfolio/:id - Update portfolio
router.put('/:id', (req, res) => {
  try {
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    const { name, description, cash } = req.body;
    if (name) portfolio.name = name;
    if (description) portfolio.description = description;
    if (cash !== undefined) portfolio.cash = parseFloat(cash);
    
    portfolio.updatedAt = new Date().toISOString();
    portfolio.updateTotalValue();

    res.json({
      success: true,
      data: portfolio.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/portfolio/:id - Delete portfolio
router.delete('/:id', (req, res) => {
  try {
    const portfolioIndex = portfolios.findIndex(p => p.id === req.params.id);
    if (portfolioIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    const deletedPortfolio = portfolios.splice(portfolioIndex, 1)[0];
    
    if (currentPortfolio && currentPortfolio.id === deletedPortfolio.id) {
      currentPortfolio = portfolios.length > 0 ? portfolios[0] : null;
    }

    res.json({
      success: true,
      message: 'Portfolio deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/portfolio/:id/summary - Get portfolio summary with analytics
router.get('/:id/summary', (req, res) => {
  try {
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    const performance = portfolio.getPerformance();
    const summary = {
      ...performance,
      holdingsCount: portfolio.holdings.length,
      topGainers: portfolio.holdings
        .filter(h => h.gainLossPercent > 0)
        .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
        .slice(0, 5),
      topLosers: portfolio.holdings
        .filter(h => h.gainLossPercent < 0)
        .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
        .slice(0, 5),
      allocation: {
        stocks: portfolio.holdings.filter(h => h.type === 'stock').reduce((sum, h) => sum + h.currentValue, 0),
        bonds: portfolio.holdings.filter(h => h.type === 'bond').reduce((sum, h) => sum + h.currentValue, 0),
        etfs: portfolio.holdings.filter(h => h.type === 'etf').reduce((sum, h) => sum + h.currentValue, 0),
        cash: portfolio.cash
      }
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 