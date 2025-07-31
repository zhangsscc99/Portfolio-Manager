const express = require('express');
const router = express.Router();
const holdingController = require('../controllers/holdingController');

router.post('/', holdingController.createHolding);
router.get('/portfolio/:portfolio_id', holdingController.getHoldingsByPortfolio);
router.post('/:holding_id/buy', holdingController.buyMore);
router.post('/:holding_id/sell', holdingController.sell);
router.put('/:holding_id', holdingController.updateHolding);
router.delete('/:holding_id', holdingController.deleteHolding);

module.exports = router;