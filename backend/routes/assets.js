const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { Asset, Watchlist } = require('../models/index');
const { ASSET_TYPES } = require('../services/assetService');
const yahooFinanceService = require('../services/yahooFinance');
const cryptoService = require('../services/cryptoService');
const scheduledUpdatesService = require('../services/scheduledUpdates');

// 📊 GET /api/assets/portfolio/:portfolioId - 获取投资组合的分类资产
router.get('/portfolio/:portfolioId', assetController.getPortfolioAssets);

// 📝 POST /api/assets - 添加新资产
router.post('/', assetController.createAsset);

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

// 💰 PUT /api/assets/:id/sell - 部分卖出资产
router.put('/:id/sell', assetController.sellAsset);

// 🔧 POST /api/assets/fix-prices - 修复现有资产的价格问题
router.post('/fix-prices', async (req, res) => {
  try {
    const { portfolioId } = req.body;
    console.log(`🔧 开始修复投资组合 ${portfolioId} 的资产价格...`);
    
    // 获取所有资产
    const assets = await Asset.findAll({
      where: { 
        portfolio_id: portfolioId || 1,
        is_active: true 
      }
    });

    let fixCount = 0;
    const results = [];

    for (const asset of assets) {
      try {
        // 检查是否平均成本等于当前价格（说明需要修复）
        if (Math.abs(asset.avg_cost - asset.current_price) < 0.01) {
          console.log(`🔍 发现需要修复的资产: ${asset.symbol}`);
          
          // 获取实时价格
          let realCurrentPrice = asset.current_price;
          
          if (asset.price_source === 'yahoo_finance') {
            const priceData = await yahooFinanceService.getStockPrice(asset.source_symbol);
            if (priceData && priceData.price && priceData.price > 0) {
              realCurrentPrice = parseFloat(priceData.price);
            }
          }
          
          // 只有当实时价格与平均成本不同时才更新
          if (Math.abs(realCurrentPrice - asset.avg_cost) > 0.01) {
            await asset.update({
              current_price: realCurrentPrice
            });
            
            console.log(`✅ 修复 ${asset.symbol}: 平均成本 $${asset.avg_cost} → 当前价格 $${realCurrentPrice}`);
            fixCount++;
            
            results.push({
              symbol: asset.symbol,
              avgCost: asset.avg_cost,
              oldCurrentPrice: asset.current_price,
              newCurrentPrice: realCurrentPrice,
              fixed: true
            });
          } else {
            results.push({
              symbol: asset.symbol,
              avgCost: asset.avg_cost,
              currentPrice: realCurrentPrice,
              fixed: false,
              reason: 'Real-time price same as avg cost'
            });
          }
        } else {
          results.push({
            symbol: asset.symbol,
            avgCost: asset.avg_cost,
            currentPrice: asset.current_price,
            fixed: false,
            reason: 'No fix needed'
          });
        }
      } catch (error) {
        console.error(`❌ 修复 ${asset.symbol} 失败:`, error.message);
        results.push({
          symbol: asset.symbol,
          fixed: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `价格修复完成，共修复 ${fixCount} 个资产`,
      fixedCount: fixCount,
      totalAssets: assets.length,
      results: results
    });

  } catch (error) {
    console.error('❌ 价格修复失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/assets/:id - 删除资产
router.delete('/:id', assetController.deleteAsset);

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
    
    // 首先清除所有缓存，强制获取最新数据
    console.log('🗑️ 清除Yahoo Finance缓存，强制获取最新数据...');
    yahooFinanceService.clearCache();
    
    for (const asset of assetsToUpdate) {
      try {
        const oldPrice = parseFloat(asset.current_price);
        let newPrice = oldPrice;
        let updateInfo = {
          symbol: asset.symbol,
          oldPrice: oldPrice,
          status: 'no_change'
        };
        
        if (asset.price_source === 'yahoo_finance') {
          const symbol = asset.source_symbol || asset.symbol;
          console.log(`🔄 强制更新 ${symbol} 的价格数据...`);
          
          const priceData = await yahooFinanceService.getStockPrice(symbol);
          if (!priceData.error && priceData.price > 0) {
            newPrice = parseFloat(priceData.price);
            updateInfo.newPrice = newPrice;
            updateInfo.change = priceData.change || 0;
            updateInfo.changePercent = priceData.changePercent || 0;
            
            console.log(`📊 ${symbol}: 价格=${newPrice}, 变化=${priceData.change}, 变化%=${priceData.changePercent}%`);
          } else {
            throw new Error(priceData.error || `Failed to fetch valid price for ${symbol}`);
          }
        } else if (asset.price_source === 'coingecko') {
          const symbol = asset.source_symbol || asset.symbol;
          const priceData = await cryptoService.getCryptoPrice(symbol);
          if (!priceData.error && priceData.price > 0) {
            newPrice = parseFloat(priceData.price);
            updateInfo.newPrice = newPrice;
            updateInfo.change = priceData.change || 0;
            updateInfo.changePercent = priceData.changePercent || 0;
          } else {
            throw new Error(priceData.error || `Failed to fetch valid crypto price for ${symbol}`);
          }
        }
        
        // 总是更新资产记录，即使价格没变化（为了刷新updated_at时间戳）
        await asset.update({ current_price: newPrice });
        if (newPrice !== oldPrice) {
          updateInfo.status = 'updated';
        }
        
        updateResults.success++;
        
        updateResults.details.push(updateInfo);
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

// 🔄 POST /api/assets/refresh-market-data - 手动触发价格更新
router.post('/refresh-market-data', async (req, res) => {
  try {
    console.log('🔄 手动触发市场数据更新...');
    
    // 并行更新股票和加密货币价格
    const updatePromises = [
      scheduledUpdatesService.updateStockPrices(),
      scheduledUpdatesService.updateCryptoPrices()
    ];
    
    await Promise.allSettled(updatePromises);
    
    console.log('✅ 市场数据更新完成');
    
    res.json({
      success: true,
      message: 'Market data refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 手动更新市场数据失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh market data',
      details: error.message
    });
  }
});

module.exports = router; 
