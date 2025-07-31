const { Transaction, Holding } = require('../models');

exports.createTransaction = async (req, res) => {
  const { holding_id, trade_type, quantity, price, trade_time } = req.body;
  if (!holding_id || !trade_type || !quantity || !price) {
    return res.status(400).json({ success: false, error: 'holding_id, trade_type, quantity, price required' });
  }
  try {
    const transaction = await Transaction.create({
      holding_id,
      trade_type,
      quantity,
      price,
      trade_time: trade_time ? new Date(trade_time) : new Date()
    });
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTransactionsByHolding = async (req, res) => {
  try {
    const { holding_id } = req.params;
    const transactions = await Transaction.findAll({ 
      where: { holding_id },
      order: [['trade_time', 'DESC']]
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTransactionsByPortfolio = async (req, res) => {
  try {
    const { portfolio_id } = req.params;
    const transactions = await Transaction.findAll({
      include: [{
        model: Holding,
        where: { portfolio_id },
        attributes: []
      }],
      order: [['trade_time', 'DESC']]
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ where: { transaction_id: req.params.transaction_id } });
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'transaction not found' });
    }
    res.json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};