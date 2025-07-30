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

    // 手动查询 holdings
    const holdings = await Holding.findAll({
      where: { portfolio_id: portfolio.portfolio_id }
    });

    // 获取所有相关的 asset_id 和 holding_id
    const assetIds = holdings.map(h => h.asset_id);
    const holdingIds = holdings.map(h => h.holding_id);

    // 批量查询 assets 和 transactions
    const assets = await Asset.findAll({ where: { asset_id: assetIds } });
    const transactions = await Transaction.findAll({
      where: { holding_id: holdingIds },
      order: [['trade_time', 'ASC']]
    });

    const assetsByType = {};

    for (const holding of holdings) {
      // 找到对应的 asset
      const asset = assets.find(a => a.asset_id === holding.asset_id);
      if (!asset) continue;

      // 找到该 holding 的所有交易
      const holdingTransactions = transactions.filter(t => t.holding_id === holding.holding_id);

      // 基于交易类型计算成本价格
      let costPrice = 0;
      let totalQuantity = 0;

      if (holdingTransactions && holdingTransactions.length > 0) {
        for (const transaction of holdingTransactions) {
          if (transaction.trade_type === 'buy') {
            costPrice += transaction.price * transaction.quantity;
            totalQuantity += transaction.quantity;
          } else if (transaction.trade_type === 'sell') {
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
      data: { assetsByType: assetsByType }
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