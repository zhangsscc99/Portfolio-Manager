const { Transaction, Holding, Asset } = require('../models');
const yahooFinance = require('yahoo-finance2').default;
const { Op } = require('sequelize');

class PortfolioTrendService {
  /**
   * 生成portfolio收益趋势图数据
   * @param {number} portfolioId - Portfolio ID
   * @returns {Object} 趋势图数据
   */
  async generatePortfolioTrend(portfolioId) {
    try {
      console.log(`📈 生成Portfolio ${portfolioId} 收益趋势图...`);
      
      // 1. 获取portfolio的所有holdings
      const holdings = await Holding.findAll({
        where: { portfolio_id: portfolioId }
      });
      
      if (holdings.length === 0) {
        return {
          success: false,
          error: 'Portfolio没有持仓'
        };
      }
      
      // 2. 获取所有相关的transactions
      const holdingIds = holdings.map(h => h.holding_id);
      const transactions = await Transaction.findAll({
        where: { holding_id: { [Op.in]: holdingIds } },
        order: [['trade_time', 'ASC']]
      });
      
      if (transactions.length === 0) {
        return {
          success: false,
          error: 'Portfolio没有交易记录'
        };
      }
      
      // 3. 获取所有相关的assets
      const assetIds = holdings.map(h => h.asset_id);
      const assets = await Asset.findAll({
        where: { asset_id: { [Op.in]: assetIds } }
      });
      
      // 4. 确定时间范围
      const earliestDate = new Date(transactions[0].trade_time);
      const latestDate = new Date();
      
      console.log(`📅 时间范围: ${earliestDate.toISOString()} 到 ${latestDate.toISOString()}`);
      
      // 5. 生成时间序列数据点
      const timePoints = this.generateTimePoints(earliestDate, latestDate);
      
      // 6. 计算每个时间点的portfolio价值
      const portfolioValues = await this.calculatePortfolioValues(
        timePoints,
        transactions,
        assets,
        holdings
      );
      
      // 7. 计算收益数据
      const performanceData = this.calculatePerformanceData(portfolioValues);
      
      return {
        success: true,
        data: {
          timePoints: timePoints.map(date => date.toISOString().split('T')[0]),
          portfolioValues: portfolioValues.map(p => p.totalValue),
          performanceData: performanceData,
          summary: {
            startDate: earliestDate.toISOString().split('T')[0],
            endDate: latestDate.toISOString().split('T')[0],
            totalReturn: performanceData.totalReturn,
            totalReturnPercent: performanceData.totalReturnPercent,
            maxValue: Math.max(...portfolioValues.map(p => p.totalValue)),
            minValue: Math.min(...portfolioValues.map(p => p.totalValue))
          }
        }
      };
      
    } catch (error) {
      console.error('❌ 生成Portfolio趋势图失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 生成时间点序列
   */
  generateTimePoints(startDate, endDate) {
    const timePoints = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      timePoints.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return timePoints;
  }
  
  /**
   * 计算每个时间点的portfolio价值
   */
  async calculatePortfolioValues(timePoints, transactions, assets, holdings) {
    const portfolioValues = [];
    
    // 批量获取所有资产的历史价格数据
    const assetPriceData = await this.getAssetPriceData(assets, timePoints);
    
    for (const date of timePoints) {
      const portfolioValue = await this.calculatePortfolioValueAtDate(
        date,
        transactions,
        assets,
        holdings,
        assetPriceData
      );
      portfolioValues.push(portfolioValue);
    }
    
    return portfolioValues;
  }
  
  /**
   * 计算特定日期的portfolio价值
   */
  async calculatePortfolioValueAtDate(date, transactions, assets, holdings, assetPriceData) {
    let totalValue = 0;
    const assetValues = {};
    const dateStr = date.toISOString().split('T')[0];
    
    // 按资产分组计算
    for (const asset of assets) {
      const assetHoldings = holdings.filter(h => h.asset_id === asset.asset_id);
      
      for (const holding of assetHoldings) {
        // 计算到该日期为止的持仓数量
        const quantityAtDate = this.calculateQuantityAtDate(
          date,
          transactions.filter(t => t.holding_id === holding.holding_id)
        );
        
        if (quantityAtDate > 0) {
          // 从预加载的价格数据中获取该日期的资产价格
          const priceAtDate = assetPriceData[asset.symbol]?.[dateStr] || 
                             assetPriceData[asset.symbol]?.current || 0;
          
          if (priceAtDate) {
            const assetValue = quantityAtDate * priceAtDate;
            totalValue += assetValue;
            
            if (!assetValues[asset.symbol]) {
              assetValues[asset.symbol] = 0;
            }
            assetValues[asset.symbol] += assetValue;
          }
        }
      }
    }
    
    return {
      date: dateStr,
      totalValue: totalValue,
      assetValues: assetValues
    };
  }
  
  /**
   * 计算特定日期的持仓数量
   */
  calculateQuantityAtDate(date, transactions) {
    let quantity = 0;
    
    for (const transaction of transactions) {
      if (new Date(transaction.trade_time) <= date) {
        if (transaction.trade_type === 'buy') {
          quantity += parseFloat(transaction.quantity);
        } else if (transaction.trade_type === 'sell') {
          quantity -= parseFloat(transaction.quantity);
        }
      }
    }
    
    return Math.max(0, quantity); // 确保不为负数
  }
  
  /**
   * 批量获取资产价格数据
   */
  async getAssetPriceData(assets, timePoints) {
    const assetPriceData = {};
    
    for (const asset of assets) {
      if (asset.symbol === 'CASH') {
        // CASH资产价格始终为1
        assetPriceData[asset.symbol] = {};
        for (const date of timePoints) {
          const dateStr = date.toISOString().split('T')[0];
          assetPriceData[asset.symbol][dateStr] = 1.0;
        }
        continue;
      }
      
      try {
        // 获取整个时间范围的历史价格
        const startDate = timePoints[0];
        const endDate = timePoints[timePoints.length - 1];
        
        const result = await yahooFinance.chart(asset.symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        });
        
        assetPriceData[asset.symbol] = {};
        
                 if (result.quotes && result.quotes.length > 0) {
           // 将历史价格数据按日期索引
           for (const quote of result.quotes) {
             const quoteDate = new Date(quote.date);
             const dateStr = quoteDate.toISOString().split('T')[0];
             assetPriceData[asset.symbol][dateStr] = quote.close;
           }
         }
        
        // 获取当前价格作为备用
        try {
          const quote = await yahooFinance.quote(asset.symbol);
          assetPriceData[asset.symbol].current = quote.regularMarketPrice;
        } catch (quoteError) {
          console.warn(`⚠️ 无法获取 ${asset.symbol} 的当前价格:`, quoteError.message);
          assetPriceData[asset.symbol].current = 0;
        }
        
      } catch (error) {
        console.warn(`⚠️ 无法获取 ${asset.symbol} 的历史价格:`, error.message);
        
        // 使用当前价格作为所有日期的价格
        try {
          const quote = await yahooFinance.quote(asset.symbol);
          assetPriceData[asset.symbol] = { current: quote.regularMarketPrice };
        } catch (quoteError) {
          console.error(`❌ 无法获取 ${asset.symbol} 的价格:`, quoteError.message);
          assetPriceData[asset.symbol] = { current: 0 };
        }
      }
    }
    
    return assetPriceData;
  }
  
  /**
   * 获取特定日期的资产价格（已弃用，使用批量获取）
   */
  async getAssetPriceAtDate(symbol, date) {
    try {
      // 对于CASH资产，价格始终为1
      if (symbol === 'CASH') {
        return 1.0;
      }
      
      // 使用yahoo-finance2获取历史价格
      const targetDate = new Date(date);
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 1); // 前一天
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1); // 后一天
      
      const result = await yahooFinance.chart(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });
      
      if (result.quotes && result.quotes.length > 0) {
        // 找到最接近目标日期的价格
        const targetTime = targetDate.getTime();
        let closestQuote = result.quotes[0];
        let minDiff = Math.abs(new Date(closestQuote.timestamp).getTime() - targetTime);
        
        for (const quote of result.quotes) {
          const diff = Math.abs(new Date(quote.timestamp).getTime() - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestQuote = quote;
          }
        }
        
        return closestQuote.close;
      }
      
      // 如果没有历史数据，使用当前价格
      const quote = await yahooFinance.quote(symbol);
      return quote.regularMarketPrice;
      
    } catch (error) {
      console.warn(`⚠️ 无法获取 ${symbol} 在 ${date.toISOString()} 的价格:`, error.message);
      
      // 对于无法获取价格的资产，尝试使用当前价格
      try {
        const quote = await yahooFinance.quote(symbol);
        return quote.regularMarketPrice;
      } catch (quoteError) {
        console.error(`❌ 无法获取 ${symbol} 的当前价格:`, quoteError.message);
        return 0;
      }
    }
  }
  
  /**
   * 计算收益数据
   */
  calculatePerformanceData(portfolioValues) {
    if (portfolioValues.length < 2) {
      return {
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyReturns: []
      };
    }
    
    const initialValue = portfolioValues[0].totalValue;
    const finalValue = portfolioValues[portfolioValues.length - 1].totalValue;
    const totalReturn = finalValue - initialValue;
    const totalReturnPercent = initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;
    
    // 计算每日收益率
    const dailyReturns = [];
    for (let i = 1; i < portfolioValues.length; i++) {
      const previousValue = portfolioValues[i - 1].totalValue;
      const currentValue = portfolioValues[i].totalValue;
      
      if (previousValue > 0) {
        const dailyReturn = ((currentValue - previousValue) / previousValue) * 100;
        dailyReturns.push(dailyReturn);
      } else {
        dailyReturns.push(0);
      }
    }
    
    return {
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent,
      dailyReturns: dailyReturns
    };
  }
}

module.exports = new PortfolioTrendService(); 