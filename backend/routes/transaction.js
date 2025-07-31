const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.post('/', transactionController.createTransaction);
router.get('/holding/:holding_id', transactionController.getTransactionsByHolding);
router.get('/portfolio/:portfolio_id', transactionController.getTransactionsByPortfolio);
router.get('/:transaction_id', transactionController.getTransactionById);

module.exports = router;