const { Holding, Asset } = require('../models');
const yahooFinance = require('yahoo-finance2').default;

exports.createHolding = async (req, res) => {
  const { portfolio_id, asset_id, quantity, avg_cost } = req.body;
  if (!portfolio_id || !asset_id || !quantity || !avg_cost) {
    return res.status(400).json({ success: false, error: 'portfolio_id, asset_id, quantity, avg_cost required' });
  }
  try {
    const holding = await Holding.create({
      portfolio_id,
      asset_id,
      quantity,
      avg_cost
    });
    res.status(201).json({ success: true, data: holding });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getHoldingsByPortfolio = async (req, res) => {
  try {
    const { portfolio_id } = req.params;
    const holdings = await Holding.findAll({ 
      where: { portfolio_id },
      include: [{ model: Asset, as: 'asset' }]
    });
    res.json({ success: true, data: holdings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.buyMore = async (req, res) => {
  const { holding_id } = req.params;
  const { quantity, price } = req.body;
  if (!quantity || !price) {
    return res.status(400).json({ success: false, error: 'quantity, price required' });
  }
  try {
    const holding = await Holding.findOne({ where: { holding_id } });
    if (!holding) {
      return res.status(404).json({ success: false, error: 'holding not found' });
    }
    // 重新计算加权均价
    const totalCost = parseFloat(holding.avg_cost) * parseFloat(holding.quantity) + price * quantity;
    const newQuantity = parseFloat(holding.quantity) + parseFloat(quantity);
    const newAvgCost = totalCost / newQuantity;
    holding.quantity = newQuantity;
    holding.avg_cost = newAvgCost;
    await holding.save();
    res.json({ success: true, data: holding });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.sell = async (req, res) => {
  const { holding_id } = req.params;
  const { quantity, price } = req.body;
  if (!quantity || !price) {
    return res.status(400).json({ success: false, error: 'quantity, price required' });
  }
  try {
    const holding = await Holding.findOne({ where: { holding_id } });
    if (!holding) {
      return res.status(404).json({ success: false, error: 'holding not found' });
    }
    if (quantity > holding.quantity) {
      return res.status(400).json({ success: false, error: 'not enough quantity' });
    }
    holding.quantity -= quantity;
    if (holding.quantity <= 0) {
      await holding.destroy();
      res.json({ success: true, message: 'holding sold out and deleted' });
    } else {
      await holding.save();
      res.json({ success: true, data: holding });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateHolding = async (req, res) => {
  try {
    const { holding_id } = req.params;
    const updateData = req.body;
    const holding = await Holding.findOne({ where: { holding_id } });
    if (!holding) {
      return res.status(404).json({ success: false, error: 'holding not found' });
    }
    await holding.update(updateData);
    res.json({ success: true, data: holding });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteHolding = async (req, res) => {
  try {
    const { holding_id } = req.params;
    const holding = await Holding.findOne({ where: { holding_id } });
    if (!holding) {
      return res.status(404).json({ success: false, error: 'holding not found' });
    }
    await holding.destroy();
    res.json({ success: true, message: 'holding deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};