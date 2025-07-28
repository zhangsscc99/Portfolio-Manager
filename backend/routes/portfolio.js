const express = require('express');
const router = express.Router();
const { Portfolio, Holding, User } = require('../models/index');

// 🎯 初始化示例数据 - 使用数据库操作
const initializeSampleData = async () => {
  try {
    // 检查是否已有数据
    const portfolioCount = await Portfolio.count();
    if (portfolioCount === 0) {
      console.log('📊 正在创建示例数据...');
      
      // 创建示例投资组合
      const samplePortfolio = await Portfolio.create({
        name: 'My Investment Portfolio',
        description: 'Main investment portfolio',
        cash: 25000.00,
        total_value: 0.00
      });

      // 创建示例持仓
      const sampleHoldings = [
        { symbol: 'AAPL', name: 'Apple Inc.', quantity: 10, avg_price: 150.00, current_price: 175.25, portfolio_id: samplePortfolio.id },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 5, avg_price: 2500.00, current_price: 2680.50, portfolio_id: samplePortfolio.id },
        { symbol: 'MSFT', name: 'Microsoft Corporation', quantity: 8, avg_price: 300.00, current_price: 315.75, portfolio_id: samplePortfolio.id },
        { symbol: 'TSLA', name: 'Tesla Inc.', quantity: 3, avg_price: 800.00, current_price: 245.60, portfolio_id: samplePortfolio.id },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', quantity: 2, avg_price: 3200.00, current_price: 3150.80, portfolio_id: samplePortfolio.id }
      ];

      await Holding.bulkCreate(sampleHoldings);
      
      // 更新投资组合总价值
      const totalValue = sampleHoldings.reduce((sum, holding) => 
        sum + (holding.current_price * holding.quantity), 0
      ) + samplePortfolio.cash;
      
      await samplePortfolio.update({ total_value: totalValue });
      
      console.log('✅ 示例数据创建成功!');
    }
  } catch (error) {
    console.error('❌ 初始化示例数据失败:', error);
  }
};

// 🚀 启动时初始化数据
initializeSampleData();

// 📖 GET /api/portfolio - 获取所有投资组合
router.get('/', async (req, res) => {
  try {
    const portfolios = await Portfolio.findAll();
    res.json({
      success: true,
      data: portfolios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📖 GET /api/portfolio/current - 获取当前投资组合
router.get('/current', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      order: [['created_at', 'DESC']] // 获取最新的投资组合
    });
    
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'No portfolio found'
      });
    }

    // 获取持仓数据
    const holdings = await Holding.findAll({
      where: { portfolio_id: portfolio.id }
    });

    // 计算性能数据
    const totalCost = holdings.reduce((sum, holding) => 
      sum + (parseFloat(holding.avg_price) * parseFloat(holding.quantity)), 0
    );
    
    const currentValue = holdings.reduce((sum, holding) => 
      sum + (parseFloat(holding.current_price) * parseFloat(holding.quantity)), 0
    );
    
    const totalGainLoss = currentValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    res.json({
      success: true,
      data: {
        ...portfolio.toJSON(),
        holdings: holdings.map(holding => ({
          ...holding.toJSON(),
          currentValue: holding.getCurrentValue(),
          costBasis: holding.getCostBasis(),
          gainLoss: holding.getGainLoss(),
          gainLossPercent: holding.getGainLossPercent()
        })),
        performance: {
          totalValue: parseFloat(portfolio.total_value),
          totalCost,
          totalGainLoss,
          totalGainLossPercent,
          cash: parseFloat(portfolio.cash)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📝 POST /api/portfolio - 创建新投资组合
router.post('/', async (req, res) => {
  try {
    const { name, description, cash = 0 } = req.body;
    
    const portfolio = await Portfolio.create({
      name,
      description,
      cash: parseFloat(cash),
      total_value: parseFloat(cash)
    });

    res.status(201).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ✏️ PUT /api/portfolio/:id - 更新投资组合
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const portfolio = await Portfolio.findByPk(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    await portfolio.update(updates);
    
    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 🗑️ DELETE /api/portfolio/:id - 删除投资组合
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findByPk(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    // 先删除关联的持仓
    await Holding.destroy({
      where: { portfolio_id: id }
    });
    
    // 再删除投资组合
    await portfolio.destroy();
    
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

module.exports = router; 