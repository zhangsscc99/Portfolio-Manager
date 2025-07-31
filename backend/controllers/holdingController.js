const { Holding, Asset } = require('../models');
const yahooFinance = require('yahoo-finance2').default;

exports.createHolding = async (req, res) => {
  const { portfolio_id, asset_id, quantity, price, buy_date } = req.body;
  console.log("req.body", req.body);
  if (!portfolio_id || !asset_id || !quantity || !price) {
    return res.status(400).json({ success: false, error: 'portfolio_id, asset_id, quantity, price required' });
  }
  try {
    // 首先检查是否已存在该资产的持仓
    const existingHolding = await Holding.findOne({
      where: {
        portfolio_id,
        asset_id
      }
    });

    if (existingHolding) {
      // 如果已存在，更新持仓（追加购买逻辑）
      console.log(`Asset ${asset_id} already exists in portfolio ${portfolio_id}, updating holding`);
      
      // 重新计算加权平均成本
      const currentTotalCost = parseFloat(existingHolding.avg_cost) * parseFloat(existingHolding.quantity);
      const newPurchaseCost = parseFloat(price) * parseFloat(quantity);
      const totalCost = currentTotalCost + newPurchaseCost;
      const newQuantity = parseFloat(existingHolding.quantity) + parseFloat(quantity);
      const newAvgCost = totalCost / newQuantity;
      
      existingHolding.quantity = newQuantity;
      existingHolding.avg_cost = newAvgCost;
      await existingHolding.save();
      
      console.log(`Updated holding: 新数量=${newQuantity}, 新平均成本=${newAvgCost}`);
      res.status(200).json({ success: true, data: existingHolding, message: 'Holding updated' });
    } else {
      // 如果不存在，创建新持仓
      console.log(`Creating new holding for asset ${asset_id} in portfolio ${portfolio_id}`);
      const avg_cost = price;
      const holding = await Holding.create({
        portfolio_id,
        asset_id,
        quantity,
        avg_cost
      });
      res.status(201).json({ success: true, data: holding, message: 'New holding created' });
    }
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
    // 重新计算加权平均成本
    const currentTotalCost = parseFloat(holding.avg_cost) * parseFloat(holding.quantity);
    const newPurchaseCost = parseFloat(price) * parseFloat(quantity);
    const totalCost = currentTotalCost + newPurchaseCost;
    const newQuantity = parseFloat(holding.quantity) + parseFloat(quantity);
    const newAvgCost = totalCost / newQuantity;
    
    holding.quantity = newQuantity;
    holding.avg_cost = newAvgCost;
    await holding.save();
    
    console.log(`追加购买: 数量=${quantity}, 价格=${price}, 新平均成本=${newAvgCost}`);
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
    
    // 计算卖出获得的现金
    const cashAmount = parseFloat(quantity) * parseFloat(price);
    
    // 查找或创建cash资产
    let cashAsset = await Asset.findOne({ where: { symbol: 'CASH' } });
    if (!cashAsset) {
      cashAsset = await Asset.create({
        symbol: 'CASH',
        name: 'Cash',
        asset_type: 'cash',
        current_price: 1.00
      });
      console.log('Created cash asset');
    }
    
    // 查找portfolio中是否已有cash持仓
    let cashHolding = await Holding.findOne({
      where: {
        portfolio_id: holding.portfolio_id,
        asset_id: cashAsset.asset_id
      }
    });
    
    if (cashHolding) {
      // 更新现有cash持仓
      const newCashQuantity = parseFloat(cashHolding.quantity) + cashAmount;
      cashHolding.quantity = newCashQuantity;
      await cashHolding.save();
      console.log(`Updated cash holding: ${newCashQuantity}`);
    } else {
      // 创建新的cash持仓
      cashHolding = await Holding.create({
        portfolio_id: holding.portfolio_id,
        asset_id: cashAsset.asset_id,
        quantity: cashAmount,
        avg_cost: 1.00
      });
      console.log(`Created new cash holding: ${cashAmount}`);
    }
    
    // 卖出时保持avg_cost不变，只减少数量
    const remainingQuantity = parseFloat(holding.quantity) - parseFloat(quantity);
    holding.quantity = remainingQuantity;
    
    if (remainingQuantity <= 0) {
      await holding.destroy();
      console.log(`完全卖出: 数量=${quantity}, 价格=${price}, 获得现金=${cashAmount}, 平均成本=${holding.avg_cost}`);
      res.json({ success: true, message: 'holding sold out and deleted', cashAdded: cashAmount });
    } else {
      await holding.save();
      console.log(`部分卖出: 数量=${quantity}, 价格=${price}, 剩余数量=${remainingQuantity}, 获得现金=${cashAmount}, 平均成本=${holding.avg_cost}`);
      res.json({ success: true, data: holding, cashAdded: cashAmount });
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