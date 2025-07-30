// routes/portfolioHistory.js
const express = require('express');
const router = express.Router();
const PortfolioHistory = require('../models/PortfolioHistory');
const { Op } = require('sequelize');

router.get('/:portfolioId', async (req, res) => {
  const { range = '1M' } = req.query;
  const { portfolioId } = req.params;

  // 计算起始日期
  const daysMap = {
    '1M': 30,
    '3M': 90,
    '1Y': 365,
    'ALL': 9999
  };
  const days = daysMap[range] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const records = await PortfolioHistory.findAll({
      where: {
        portfolio_id: portfolioId,
        date: {
          [Op.gte]: startDate.toISOString().split('T')[0]
        }
      },
      order: [['date', 'ASC']]
    });

    const labels = records.map(r => r.date);
    const data = records.map(r => parseFloat(r.total_value));

    res.json({ success: true, data: { labels, data } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
