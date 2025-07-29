const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');

// 📖 GET /api/portfolio - 获取所有投资组合
router.get('/', portfolioController.getAllPortfolios);

// 📖 GET /api/portfolio/current - 获取当前投资组合
router.get('/current', portfolioController.getCurrentPortfolio);

// 📖 GET /api/portfolio/:id - 根据ID获取投资组合
router.get('/:id', portfolioController.getPortfolioById);

// 📝 POST /api/portfolio - 创建新投资组合

router.post('/', portfolioController.createPortfolio);

// ✏️ PUT /api/portfolio/:id - 更新投资组合
router.put('/:id', portfolioController.updatePortfolio);

// 🗑️ DELETE /api/portfolio/:id - 删除投资组合
router.delete('/:id', portfolioController.deletePortfolio);

// 🔄 POST /api/portfolio/:id/rebalance - 获取重新平衡建议
router.post('/:id/rebalance', portfolioController.getRebalanceRecommendations);

module.exports = router; 