const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

router.get('/portfolio/:portfolioId', assetController.getPortfolioAssets);
router.get('/search', assetController.searchAsset);
router.get('/quote', assetController.getAssetQuote);
router.get('/price-on-date', assetController.getAssetPriceOnDate);
router.post('/', assetController.createAsset);
router.get('/:asset_id', assetController.getAssetById);
router.put('/:asset_id/price', assetController.updateAssetPrice);


module.exports = router;
