const { Asset } = require('../models');
const yahooFinance = require('yahoo-finance2').default;

exports.searchAsset = async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ success: false, error: 'keyword required' });
  }
  try {
    const results = await yahooFinance.search(symbol);
    const list = await Promise.all(results.quotes.map(async q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname,
      type: q.quoteType,
      typeDisp: q.typeDisp,
    })));
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAssetQuote = async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ success: false, error: 'symbol required' });
  }
  try {
    const quote = await yahooFinance.quote(symbol);
    const assetData = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      asset_type: quote.quoteType,
      current_price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      change_percent: quote.regularMarketChangePercent,
      previous_close: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      day_high: quote.regularMarketDayHigh,
      day_low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      market_cap: quote.marketCap,
      exchange: quote.exchange,
      currency: quote.currency,
      market_state: quote.marketState,
      quote_time: quote.regularMarketTime
    };
    res.json({ success: true, data: assetData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createAsset = async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) {
    return res.status(400).json({ success: false, error: 'symbol required' });
  }
  try {
    const quote = await yahooFinance.quote(symbol);
    const asset = await Asset.create({
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      asset_type: quote.quoteType,
      current_price: quote.regularMarketPrice
    });
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findOne({ where: { asset_id: req.params.asset_id } });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateAssetPrice = async (req, res) => {
  try {
    const { asset_id } = req.params;
    const asset = await Asset.findOne({ where: { asset_id } });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    const quote = await yahooFinance.quote(asset.symbol);
    asset.current_price = quote.regularMarketPrice;
    await asset.save();
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};