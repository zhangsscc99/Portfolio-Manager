const express = require('express');
const router = express.Router();
const { Holding, Portfolio } = require('../models/index');

const parsePositiveNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getCurrentPortfolio = async () => {
  return Portfolio.findOne({
    order: [['created_at', 'DESC']]
  });
};

const resolvePortfolioId = async (portfolioId) => {
  if (portfolioId !== undefined && portfolioId !== null) {
    const parsed = parseInt(portfolioId, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error('Invalid portfolioId');
    }

    const portfolio = await Portfolio.findByPk(parsed);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }
    return parsed;
  }

  const currentPortfolio = await getCurrentPortfolio();
  if (!currentPortfolio) {
    throw new Error('No portfolio found');
  }

  return currentPortfolio.id;
};

// GET /api/holdings - Get holdings from current portfolio (or ?portfolioId=)
router.get('/', async (req, res) => {
  try {
    const portfolioId = await resolvePortfolioId(req.query.portfolioId);
    const holdings = await Holding.findAll({
      where: { portfolio_id: portfolioId },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: holdings
    });
  } catch (error) {
    const statusCode = error.message === 'No portfolio found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/holdings/:id - Get specific holding
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid holding id'
      });
    }

    const holding = await Holding.findByPk(id);
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

// POST /api/holdings - Add new holding
router.post('/', async (req, res) => {
  try {
    const { symbol, name, type, quantity, avgPrice, currentPrice, portfolioId } = req.body;

    const parsedQuantity = parsePositiveNumber(quantity);
    const parsedAvgPrice = parsePositiveNumber(avgPrice);
    const parsedCurrentPrice = currentPrice !== undefined && currentPrice !== null
      ? parsePositiveNumber(currentPrice)
      : parsedAvgPrice;

    if (!symbol || !name || !parsedQuantity || !parsedAvgPrice || !parsedCurrentPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, name, quantity, avgPrice'
      });
    }

    const targetPortfolioId = await resolvePortfolioId(portfolioId);

    const holding = await Holding.create({
      symbol: symbol.toUpperCase(),
      name,
      type: type || 'stock',
      quantity: parsedQuantity,
      avg_price: parsedAvgPrice,
      current_price: parsedCurrentPrice,
      portfolio_id: targetPortfolioId
    });

    res.status(201).json({
      success: true,
      data: holding
    });
  } catch (error) {
    const statusCode = error.message === 'No portfolio found' || error.message === 'Portfolio not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/holdings/:id - Update holding
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid holding id'
      });
    }

    const holding = await Holding.findByPk(id);
    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.quantity !== undefined) {
      const parsed = parsePositiveNumber(req.body.quantity);
      if (!parsed) {
        return res.status(400).json({ success: false, error: 'quantity must be > 0' });
      }
      updates.quantity = parsed;
    }
    if (req.body.avgPrice !== undefined) {
      const parsed = parsePositiveNumber(req.body.avgPrice);
      if (!parsed) {
        return res.status(400).json({ success: false, error: 'avgPrice must be > 0' });
      }
      updates.avg_price = parsed;
    }
    if (req.body.currentPrice !== undefined) {
      const parsed = parsePositiveNumber(req.body.currentPrice);
      if (!parsed) {
        return res.status(400).json({ success: false, error: 'currentPrice must be > 0' });
      }
      updates.current_price = parsed;
    }

    await holding.update(updates);

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

// DELETE /api/holdings/:id - Remove holding
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid holding id'
      });
    }

    const holding = await Holding.findByPk(id);
    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    await holding.destroy();

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
router.post('/:id/buy', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const buyQuantity = parsePositiveNumber(req.body.quantity);
    const buyPrice = parsePositiveNumber(req.body.price);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid holding id' });
    }

    if (!buyQuantity || !buyPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: quantity, price'
      });
    }

    const holding = await Holding.findByPk(id);
    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    const currentQuantity = parseFloat(holding.quantity);
    const currentAvgPrice = parseFloat(holding.avg_price);
    const currentValue = currentQuantity * currentAvgPrice;
    const newValue = buyQuantity * buyPrice;
    const totalQuantity = currentQuantity + buyQuantity;

    await holding.update({
      quantity: totalQuantity,
      avg_price: (currentValue + newValue) / totalQuantity,
      current_price: buyPrice
    });

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
router.post('/:id/sell', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sellQuantity = parsePositiveNumber(req.body.quantity);
    const sellPrice = parsePositiveNumber(req.body.price);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid holding id' });
    }

    if (!sellQuantity || !sellPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: quantity, price'
      });
    }

    const holding = await Holding.findByPk(id);
    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found'
      });
    }

    const currentQuantity = parseFloat(holding.quantity);
    if (sellQuantity > currentQuantity) {
      return res.status(400).json({
        success: false,
        error: 'Cannot sell more shares than owned'
      });
    }

    const remainingQuantity = currentQuantity - sellQuantity;

    if (remainingQuantity <= 0) {
      await holding.destroy();
      return res.json({
        success: true,
        data: null,
        message: 'All shares sold, holding removed'
      });
    }

    await holding.update({
      quantity: remainingQuantity,
      current_price: sellPrice
    });

    res.json({
      success: true,
      data: holding,
      message: 'Shares sold successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
