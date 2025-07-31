const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');

router.get('/', portfolioController.getAllPortfolios);
router.get('/:portfolio_id', portfolioController.getPortfolioById);
router.post('/', portfolioController.createPortfolio);
router.put('/:portfolio_id', portfolioController.updatePortfolio);
router.delete('/:portfolio_id', portfolioController.deletePortfolio);

module.exports = router;