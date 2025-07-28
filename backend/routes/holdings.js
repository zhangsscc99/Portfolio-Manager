const express = require('express');
const router = express.Router();
const Holding = require('../models/Holding');

// Import portfolio data (shared with portfolio routes)
const portfolioModule = require('./portfolio');

// GET /api/holdings - Get all holdings from current portfolio
router.get('/', (req, res) => {
  try {
    // This would typically get current portfolio from database
    // For now, we'll use a simple approach
    const portfolios = require('./portfolio').portfolios || [];
    const currentPortfolio = portfolios[0];
    
    if (!currentPortfolio) {
      return res.json({
        success: true,
        data: []
      });
    }

    res.json({
      success: true,
      data: currentPortfolio.holdings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/holdings/:id - Get specific holding
router.get('/:id', (req, res) => {
  try {
    const portfolios = require('./portfolio').portfolios || [];
    const currentPortfolio = portfolios[0];
    
    if (!currentPortfolio) {
      return res.status(404).json({
        success: false,
        error: 'No portfolio found'
      });
    }

    const holding = currentPortfolio.holdings.find(h => h.id === req.params.id);
    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    res.json({
      success: true,
      data: holding
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/holdings - Add new holding to portfolio
router.post('/', (req, res) => {
  try {
    const { symbol, name, type, quantity, avgPrice, currentPrice } = req.body;

    // Validation
    if (!symbol || !name || !quantity || !avgPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, name, quantity, avgPrice'
      });
    }

    const holding = new Holding({
      symbol,
      name,
      type: type || 'stock',
      quantity: parseFloat(quantity),
      avgPrice: parseFloat(avgPrice),
      currentPrice: currentPrice ? parseFloat(currentPrice) : parseFloat(avgPrice)
    });

    // Add to current portfolio (this would be done through database in production)
    const portfolios = require('./portfolio').portfolios || [];
    if (portfolios.length > 0) {
      portfolios[0].addHolding(holding.toJSON());
    }

    res.status(201).json({
      success: true,
      data: holding.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/holdings/:id - Update holding
router.put('/:id', (req, res) => {
  try {
    const portfolios = require('./portfolio').portfolios || [];
    const currentPortfolio = portfolios[0];
    
    if (!currentPortfolio) {
      return res.status(404).json({
        success: false,
        error: 'No portfolio found'
      });
    }

    const holdingIndex = currentPortfolio.holdings.findIndex(h => h.id === req.params.id);
    if (holdingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    const { name, quantity, avgPrice, currentPrice, type } = req.body;
    const holding = currentPortfolio.holdings[holdingIndex];

    // Update fields
    if (name) holding.name = name;
    if (type) holding.type = type;
    if (quantity !== undefined) holding.quantity = parseFloat(quantity);
    if (avgPrice !== undefined) holding.avgPrice = parseFloat(avgPrice);
    if (currentPrice !== undefined) holding.currentPrice = parseFloat(currentPrice);
    
    holding.updatedAt = new Date().toISOString();
    currentPortfolio.updateTotalValue();

    res.json({
      success: true,
      data: holding
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/holdings/:id - Remove holding from portfolio
router.delete('/:id', (req, res) => {
  try {
    const portfolios = require('./portfolio').portfolios || [];
    const currentPortfolio = portfolios[0];
    
    if (!currentPortfolio) {
      return res.status(404).json({
        success: false,
        error: 'No portfolio found'
      });
    }

    const holdingIndex = currentPortfolio.holdings.findIndex(h => h.id === req.params.id);
    if (holdingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    currentPortfolio.holdings.splice(holdingIndex, 1);
    currentPortfolio.updateTotalValue();

    res.json({
      success: true,
      message: 'Holding removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/holdings/:id/buy - Buy more shares of existing holding
router.post('/:id/buy', (req, res) => {
  try {
    const { quantity, price } = req.body;

    if (!quantity || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: quantity, price'
      });
    }

    const portfolios = require('./portfolio').portfolios || [];
    const currentPortfolio = portfolios[0];
    
    if (!currentPortfolio) {
      return res.status(404).json({
        success: false,
        error: 'No portfolio found'
      });
    }

    const holding = currentPortfolio.holdings.find(h => h.id === req.params.id);
    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    // Update holding with new purchase
    const currentValue = holding.avgPrice * holding.quantity;
    const newValue = parseFloat(quantity) * parseFloat(price);
    holding.quantity += parseFloat(quantity);
    holding.avgPrice = (currentValue + newValue) / holding.quantity;
    holding.currentPrice = parseFloat(price);
    holding.updatedAt = new Date().toISOString();

    currentPortfolio.updateTotalValue();

    res.json({
      success: true,
      data: holding
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/holdings/:id/sell - Sell shares of existing holding
router.post('/:id/sell', (req, res) => {
  try {
    const { quantity, price } = req.body;

    if (!quantity || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: quantity, price'
      });
    }

    const portfolios = require('./portfolio').portfolios || [];
    const currentPortfolio = portfolios[0];
    
    if (!currentPortfolio) {
      return res.status(404).json({
        success: false,
        error: 'No portfolio found'
      });
    }

    const holding = currentPortfolio.holdings.find(h => h.id === req.params.id);
    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    const sellQuantity = parseFloat(quantity);
    if (sellQuantity > holding.quantity) {
      return res.status(400).json({
        success: false,
        error: 'Cannot sell more shares than owned'
      });
    }

    // Update holding after sale
    holding.quantity -= sellQuantity;
    holding.currentPrice = parseFloat(price);
    holding.updatedAt = new Date().toISOString();

    // Add cash from sale to portfolio
    const saleProceeds = sellQuantity * parseFloat(price);
    currentPortfolio.cash += saleProceeds;

    // Remove holding if all shares sold
    if (holding.quantity === 0) {
      const holdingIndex = currentPortfolio.holdings.findIndex(h => h.id === req.params.id);
      currentPortfolio.holdings.splice(holdingIndex, 1);
    }

    currentPortfolio.updateTotalValue();

    res.json({
      success: true,
      data: holding.quantity > 0 ? holding : null,
      message: holding.quantity > 0 ? 'Shares sold successfully' : 'All shares sold, holding removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 