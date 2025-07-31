const express = require('express');
const router = express.Router();
const portfolioTrendService = require('../services/portfolioTrendService');

/**
 * @swagger
 * /api/portfolio-trend/{portfolio_id}:
 *   get:
 *     summary: 获取Portfolio收益趋势图数据
 *     description: 基于transaction记录和Yahoo Finance数据生成portfolio的收益趋势图
 *     parameters:
 *       - in: path
 *         name: portfolio_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Portfolio ID
 *     responses:
 *       200:
 *         description: 成功获取趋势图数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timePoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: date
 *                     portfolioValues:
 *                       type: array
 *                       items:
 *                         type: number
 *                     performanceData:
 *                       type: object
 *                       properties:
 *                         totalReturn:
 *                           type: number
 *                         totalReturnPercent:
 *                           type: number
 *                         dailyReturns:
 *                           type: array
 *                           items:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date
 *                         endDate:
 *                           type: string
 *                           format: date
 *                         totalReturn:
 *                           type: number
 *                         totalReturnPercent:
 *                           type: number
 *                         maxValue:
 *                           type: number
 *                         minValue:
 *                           type: number
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: Portfolio不存在
 *       500:
 *         description: 服务器内部错误
 */
router.get('/:portfolio_id', async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.portfolio_id);
    
    if (!portfolioId || isNaN(portfolioId)) {
      return res.status(400).json({
        success: false,
        error: '无效的Portfolio ID'
      });
    }
    
    console.log(`📊 请求Portfolio ${portfolioId} 趋势图数据`);
    
    const result = await portfolioTrendService.generatePortfolioTrend(portfolioId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Portfolio趋势图API错误:', error);
    res.status(500).json({
      success: false,
      error: '生成趋势图时发生错误'
    });
  }
});

module.exports = router; 