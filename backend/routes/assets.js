const express = require('express');
const router = express.Router();
const { Asset, Portfolio, Watchlist } = require('../models/index');
const yahooFinanceService = require('../services/yahooFinance');
const cryptoService = require('../services/cryptoService');

// 🎯 支持的资产类型配置
const ASSET_TYPES = {
  stock: { name: '股票', icon: '📈', priceSource: 'yahoo_finance' },
  crypto: { name: '加密货币', icon: '₿', priceSource: 'coingecko' },
  etf: { name: 'ETF基金', icon: '🏛️', priceSource: 'yahoo_finance' },
  bond: { name: '债券', icon: '📜', priceSource: 'manual' },
  cash: { name: '现金', icon: '💰', priceSource: 'manual' },
  commodity: { name: '商品', icon: '🥇', priceSource: 'manual' }
};

// 📊 GET /api/assets/portfolio/:portfolioId - 获取投资组合的分类资产
router.get('/portfolio/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    
    // 获取所有资产
    const assets = await Asset.findAll({
      where: { 
        portfolio_id: portfolioId,
        is_active: true 
      },
      order: [['asset_type', 'ASC'], ['symbol', 'ASC']]
    });
    
    // 按资产类型分组
    const assetsByType = {};
    let totalValue = 0;
    
    Object.keys(ASSET_TYPES).forEach(type => {
      assetsByType[type] = {
        ...ASSET_TYPES[type],
        assets: [],
        totalValue: 0,
        totalGainLoss: 0,
        count: 0
      };
    });
    
    assets.forEach(asset => {
      const currentValue = asset.getCurrentValue();
      const gainLoss = asset.getGainLoss();
      
      assetsByType[asset.asset_type].assets.push({
        ...asset.toJSON(),
        currentValue,
        gainLoss,
        gainLossPercent: asset.getGainLossPercent()
      });
      
      assetsByType[asset.asset_type].totalValue += currentValue;
      assetsByType[asset.asset_type].totalGainLoss += gainLoss;
      assetsByType[asset.asset_type].count++;
      
      totalValue += currentValue;
    });
    
    res.json({
      success: true,
      data: {
        assetsByType,
        totalValue,
        totalAssets: assets.length,
        summary: Object.keys(assetsByType).map(type => ({
          type,
          ...assetsByType[type],
          assets: undefined // 不在摘要中包含详细资产
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📝 POST /api/assets - 添加新资产
router.post('/', async (req, res) => {
  try {
    const {
      symbol,
      name,
      asset_type,
      quantity,
      avg_cost,
      current_price,
      currency = 'USD',
      exchange,
      portfolio_id,
      purchase_date,
      notes
    } = req.body;
    
    // 验证资产类型
    if (!ASSET_TYPES[asset_type]) {
      return res.status(400).json({
        success: false,
        error: `不支持的资产类型: ${asset_type}`
      });
    }
    
    // 根据资产类型设置价格源
    const priceSource = ASSET_TYPES[asset_type].priceSource;
    let sourceSymbol = symbol;
    
    // 对于加密货币，需要转换symbol
    if (asset_type === 'crypto') {
      sourceSymbol = symbol.toLowerCase();
    }
    
    const asset = await Asset.create({
      symbol: symbol.toUpperCase(),
      name,
      asset_type,
      quantity,
      avg_cost,
      current_price: current_price || avg_cost,
      currency,
      exchange,
      price_source: priceSource,
      source_symbol: sourceSymbol,
      portfolio_id,
      purchase_date,
      notes
    });
    
    res.status(201).json({
      success: true,
      data: asset
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 🔄 PUT /api/assets/:id - 更新资产信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const asset = await Asset.findByPk(id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '资产不存在'
      });
    }
    
    await asset.update(updates);
    
    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/assets/:id - 删除资产
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await Asset.findByPk(id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '资产不存在'
      });
    }
    
    await asset.destroy();
    
    res.json({
      success: true,
      message: '资产删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📋 GET /api/assets/watchlist - 获取关注列表
router.get('/watchlist', async (req, res) => {
  try {
    const watchlist = await Watchlist.findAll({
      order: [['asset_type', 'ASC'], ['symbol', 'ASC']]
    });
    
    // 按类型分组
    const watchlistByType = {};
    Object.keys(ASSET_TYPES).forEach(type => {
      watchlistByType[type] = {
        ...ASSET_TYPES[type],
        items: []
      };
    });
    
    watchlist.forEach(item => {
      watchlistByType[item.asset_type].items.push(item);
    });
    
    res.json({
      success: true,
      data: watchlistByType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ➕ POST /api/assets/watchlist - 添加到关注列表
router.post('/watchlist', async (req, res) => {
  try {
    const { symbol, name, asset_type, notes } = req.body;
    
    // 检查是否已存在
    const existing = await Watchlist.findOne({ where: { symbol } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '该资产已在关注列表中'
      });
    }
    
    const priceSource = ASSET_TYPES[asset_type]?.priceSource || 'manual';
    
    const watchlistItem = await Watchlist.create({
      symbol: symbol.toUpperCase(),
      name,
      asset_type,
      price_source: priceSource,
      source_symbol: asset_type === 'crypto' ? symbol.toLowerCase() : symbol,
      notes
    });
    
    res.status(201).json({
      success: true,
      data: watchlistItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 🔄 POST /api/assets/update-prices - 批量更新资产价格
router.post('/update-prices', async (req, res) => {
  try {
    const { portfolioId } = req.body;
    
    let assetsToUpdate;
    if (portfolioId) {
      assetsToUpdate = await Asset.findAll({
        where: { portfolio_id: portfolioId, is_active: true }
      });
    } else {
      assetsToUpdate = await Asset.findAll({ where: { is_active: true } });
    }
    
    const updateResults = { success: 0, failed: 0, details: [] };
    
    for (const asset of assetsToUpdate) {
      try {
        let newPrice = asset.current_price;
        
        if (asset.price_source === 'yahoo_finance') {
          const priceData = await yahooFinanceService.getStockPrice(asset.source_symbol);
          if (!priceData.error && priceData.price > 0) {
            newPrice = priceData.price;
          }
        } else if (asset.price_source === 'coingecko') {
          const priceData = await cryptoService.getCryptoPrice(asset.source_symbol);
          if (!priceData.error && priceData.price > 0) {
            newPrice = priceData.price;
          }
        }
        
        if (newPrice !== asset.current_price) {
          await asset.update({ current_price: newPrice });
          updateResults.success++;
          updateResults.details.push({
            symbol: asset.symbol,
            oldPrice: asset.current_price,
            newPrice,
            status: 'updated'
          });
        }
      } catch (error) {
        updateResults.failed++;
        updateResults.details.push({
          symbol: asset.symbol,
          error: error.message,
          status: 'failed'
        });
      }
    }
    
    res.json({
      success: true,
      message: `价格更新完成: 成功${updateResults.success}个，失败${updateResults.failed}个`,
      data: updateResults
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 GET /api/assets/types - 获取支持的资产类型
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: ASSET_TYPES
  });
});

module.exports = router; 