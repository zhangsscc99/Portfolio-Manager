const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const Holding = require('../models/Holding'); // Added for dashboard
const Asset = require('../models/Asset'); // Added for dashboard

router.get('/', portfolioController.getAllPortfolios);
router.get('/:portfolio_id', portfolioController.getPortfolioById);
router.post('/', portfolioController.createPortfolio);
router.put('/:portfolio_id', portfolioController.updatePortfolio);
router.delete('/:portfolio_id', portfolioController.deletePortfolio);

// Dashboard数据端点 - 基于holding表提供简化数据
router.get('/dashboard/:portfolio_id', async (req, res) => {
  try {
    const { portfolio_id } = req.params;
    
    // 获取所有holdings
    const holdings = await Holding.findAll({
      where: { portfolio_id: parseInt(portfolio_id) }
    });

    // 获取所有相关的assets
    const assetIds = holdings.map(h => h.asset_id);
    const assets = await Asset.findAll({
      where: { asset_id: assetIds }
    });

    // 创建asset查找映射
    const assetMap = {};
    assets.forEach(asset => {
      assetMap[asset.asset_id] = asset;
    });

    if (holdings.length === 0) {
      return res.json({
        success: true,
        data: {
          totalValue: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          holdingsCount: 0,
          cash: 0,
          allocation: {
            stocks: { totalValue: 0, count: 0 },
            crypto: { totalValue: 0, count: 0 },
            etfs: { totalValue: 0, count: 0 },
            bonds: { totalValue: 0, count: 0 },
            cash: { totalValue: 0, count: 0 }
          },
          topHoldings: [],
          performance: {
            todayChange: 0,
            todayChangePercent: 0,
            weekChange: 0,
            monthChange: 0
          }
        }
      });
    }

    // 计算总投资组合价值
    let totalValue = 0;
    let totalCost = 0;
    let totalGainLoss = 0;
    let todayChange = 0;
    
    // 按类型分组
    const allocation = {
      stocks: { totalValue: 0, count: 0, holdings: [] },
      crypto: { totalValue: 0, count: 0, holdings: [] },
      etfs: { totalValue: 0, count: 0, holdings: [] },
      bonds: { totalValue: 0, count: 0, holdings: [] },
      cash: { totalValue: 0, count: 0, holdings: [] }
    };

    const topHoldings = [];

    for (const holding of holdings) {
      const asset = assetMap[holding.asset_id];
      if (!asset) continue;

      const currentValue = holding.quantity * asset.current_price;
      const costValue = holding.quantity * holding.avg_cost;
      const gainLoss = currentValue - costValue;
      const gainLossPercent = costValue > 0 ? (gainLoss / costValue) * 100 : 0;

      // 计算今日变化（基于change_percent）
      const todayAssetChange = asset.change_percent ? 
        (asset.change_percent / 100) * currentValue : 0;

      totalValue += currentValue;
      totalCost += costValue;
      totalGainLoss += gainLoss;
      todayChange += todayAssetChange;

      // 添加到topHoldings
      topHoldings.push({
        symbol: asset.symbol,
        name: asset.name,
        quantity: holding.quantity,
        currentPrice: asset.current_price,
        currentValue: currentValue,
        avgCost: holding.avg_cost,
        gainLoss: gainLoss,
        gainLossPercent: gainLossPercent,
        changePercent: asset.change_percent || 0
      });

      // 按类型分组
      const assetType = asset.asset_type?.toLowerCase() || 'stocks';
      if (allocation[assetType]) {
        allocation[assetType].totalValue += currentValue;
        allocation[assetType].count += 1;
        allocation[assetType].holdings.push({
          symbol: asset.symbol,
          currentValue: currentValue,
          gainLoss: gainLoss
        });
      }
    }

    // 排序topHoldings
    topHoldings.sort((a, b) => b.currentValue - a.currentValue);

    // 计算总收益率
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const todayChangePercent = totalValue > 0 ? (todayChange / totalValue) * 100 : 0;

    // 简化性能数据（模拟）
    const performance = {
      todayChange: todayChange,
      todayChangePercent: todayChangePercent,
      weekChange: totalGainLoss * 0.1, // 模拟周变化
      monthChange: totalGainLoss * 0.3  // 模拟月变化
    };

    // 现金数据（从cash类型的holdings获取）
    const cash = allocation.cash.totalValue;

    res.json({
      success: true,
      data: {
        totalValue,
        totalGainLoss,
        totalGainLossPercent,
        holdingsCount: holdings.length,
        cash,
        allocation,
        topHoldings: topHoldings.slice(0, 5), // 只返回前5个
        performance,
        // 添加简化的历史数据
        history: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: [
            totalValue * 0.85,
            totalValue * 0.90,
            totalValue * 0.95,
            totalValue * 0.98,
            totalValue * 1.02,
            totalValue
          ]
        }
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data' 
    });
  }
});

module.exports = router;