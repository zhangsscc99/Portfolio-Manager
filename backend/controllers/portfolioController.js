const { Portfolio, Asset, Holding, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getAllPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.findAll({ order: [['created_at', 'DESC']] });
    res.json({ success: true, data: portfolios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPortfolioById = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { portfolio_id: req.params.portfolio_id } });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const holdings = await Holding.findAll({
      where: { portfolio_id: portfolio.portfolio_id },
      include: [
        { model: Asset, as: 'asset' },
        { model: Transaction, as: 'transactions' }
      ]
    });

    const assetsByType = {};

    for (const holding of holdings) {
      const asset = holding.asset;
      if (!asset) continue;

      // 方法1：基于交易类型计算成本价格
      let costPrice = 0;
      let totalQuantity = 0;

      if (holding.transactions && holding.transactions.length > 0) {
        for (const transaction of holding.transactions) {
          if (transaction.type === 'buy') {
            costPrice += transaction.amount;
            totalQuantity += transaction.quantity;
          } else if (transaction.type === 'sell') {
            const sellRatio = transaction.quantity / totalQuantity;
            costPrice -= (costPrice * sellRatio);
            totalQuantity -= transaction.quantity;
          }
        }
      }

      const assetType = asset.asset_type || 'other';
      if (!assetsByType[assetType]) {
        assetsByType[assetType] = {
          count: 0,
          totalValue: 0,
          assets: []
        };
      }

      assetsByType[assetType].assets.push({
        symbol: asset.symbol,
        name: asset.name,
        quantity: holding.quantity,
        cost_price: costPrice
      });

      assetsByType[assetType].count += 1;
      assetsByType[assetType].totalValue += costPrice;
    }

    res.json({
      success: true,
      data: assetsByType  // 直接返回 assetsByType，不要包在对象里
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createPortfolio = async (req, res) => {
  try {
    const { name, total_value } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const portfolio = await Portfolio.create({ name, total_value });
    res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updatePortfolio = async (req, res) => {
  try {
    const { name, total_value } = req.body;
    const portfolio = await Portfolio.findOne({ where: { portfolio_id: req.params.portfolio_id } });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }
    if (name !== undefined) portfolio.name = name;
    if (total_value !== undefined) portfolio.total_value = total_value;
    await portfolio.save();
    res.json({ success: true, data: portfolio });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { portfolio_id: req.params.portfolio_id } });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }
    await portfolio.destroy();
    res.json({ success: true, message: 'Portfolio deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};