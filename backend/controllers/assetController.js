const { Asset } = require('../models');
const yahooFinance = require('yahoo-finance2').default;

exports.searchAsset = async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ success: false, error: 'keyword required' });
  }
  try {
    const results = await yahooFinance.search(symbol);
    console.log(results);
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
    // 首先检查资产是否已存在
    const existingAsset = await Asset.findOne({ where: { symbol: symbol.toUpperCase() } });
    if (existingAsset) {
      console.log(`Asset ${symbol} already exists, returning existing asset`);
      return res.status(200).json({ success: true, data: existingAsset });
    }

    // 如果不存在，则创建新资产
    const quote = await yahooFinance.quote(symbol);
    const asset = await Asset.create({
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      asset_type: quote.quoteType,
      current_price: quote.regularMarketPrice
    });
    console.log(`Created new asset: ${symbol}`);
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

exports.getAssetPriceOnDate = async (req, res) => {
  const { symbol, date } = req.query;

  if (!symbol) {
    return res.status(400).json({ success: false, error: 'symbol required' });
  }

  if (!date) {
    return res.status(400).json({ success: false, error: 'date required (YYYY-MM-DD format)' });
  }

  try {
    console.log(`📅 获取 ${symbol} 在 ${date} 的价格`);

    // 确保日期格式正确
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // 查询该日期的历史数据
    const historicalResult = await yahooFinance.historical(symbol, {
      period1: targetDate,
      period2: targetDate,
      interval: '1d'
    });

    if (!historicalResult || historicalResult.length === 0) {
      console.log(`⚠️ ${symbol} 在 ${date} 没有价格数据`);
      return res.status(404).json({
        success: false,
        error: `No price data available for ${symbol} on ${date}`
      });
    }

    const priceData = historicalResult[0];
    res.json({
      success: true, data: {
        symbol: symbol.toUpperCase(),
        date: date,
        open: priceData.open || 0,
        high: priceData.high || 0,
        low: priceData.low || 0,
        close: priceData.close || 0,
        volume: priceData.volume || 0,
        price: priceData.close || 0 // 用收盘价作为价格
      }
    });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};