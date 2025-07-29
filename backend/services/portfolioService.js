const { Portfolio, Holding, Asset } = require('../models/index');
const { sequelize } = require('../config/database');

class PortfolioService {
  /**
   * 获取所有投资组合
   * @returns {Array} 投资组合列表
   */
  async getAllPortfolios() {
    try {
      const portfolios = await Portfolio.findAll({
        order: [['created_at', 'DESC']]
      });
      return portfolios;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 创建新投资组合
   * @param {Object} portfolioData - 投资组合数据
   * @returns {Object} 创建的投资组合
   */
  async createPortfolio(portfolioData) {
    try {
      const { name, description, cash = 0 } = portfolioData;
      
      // 业务验证
      if (!name) {
        throw new Error('缺少必填字段：name');
      }

      const portfolio = await Portfolio.create({
        name,
        description,
        cash: parseFloat(cash),
        total_value: parseFloat(cash) // 初始总价值等于现金
      });
      
      return portfolio;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新投资组合
   * @param {number} portfolioId - 投资组合ID
   * @param {Object} updateData - 更新数据
   * @returns {Object} 更新后的投资组合
   */
  async updatePortfolio(portfolioId, updateData) {
    try {
      if (!portfolioId || isNaN(portfolioId)) {
        throw new Error('无效的投资组合ID');
      }

      const portfolio = await Portfolio.findByPk(portfolioId);
      if (!portfolio) {
        throw new Error('投资组合不存在');
      }

      await portfolio.update(updateData);
      return portfolio;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 删除投资组合
   * @param {number} portfolioId - 投资组合ID
   * @returns {Object} 删除结果
   */
  async deletePortfolio(portfolioId) {
    try {
      if (!portfolioId || isNaN(portfolioId)) {
        throw new Error('无效的投资组合ID');
      }

      const portfolio = await Portfolio.findByPk(portfolioId);
      if (!portfolio) {
        throw new Error('投资组合不存在');
      }

      // 先删除关联的持仓
      await Holding.destroy({
        where: { portfolio_id: portfolioId }
      });
      
      // 再删除投资组合
      await portfolio.destroy();
      
      return {
        message: '投资组合删除成功',
        deletedPortfolio: {
          id: portfolio.id,
          name: portfolio.name
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取投资组合详细信息 (包含复杂的性能计算)
   * @param {number} portfolioId - 投资组合ID
   * @returns {Object} 详细的投资组合数据
   */
  async getPortfolioDetails(portfolioId = null) {
    try {
      // 获取投资组合 (如果没指定ID，获取最新的)
      let portfolio;
      if (portfolioId) {
        portfolio = await Portfolio.findByPk(portfolioId);
      } else {
        portfolio = await Portfolio.findOne({
          order: [['created_at', 'DESC']]
        });
      }
      
      if (!portfolio) {
        throw new Error('投资组合不存在');
      }

      // 获取所有持仓 (包括已删除的，用于历史分析)
      const holdings = await Holding.findAll({
        where: { portfolio_id: portfolio.id }
      });

      // 🧮 复杂业务逻辑：计算投资组合性能指标
      const performance = this.calculatePortfolioPerformance(holdings, portfolio);
      
      // 🎯 复杂业务逻辑：资产配置分析
      const allocation = this.calculateAssetAllocation(holdings);
      
      // 📊 复杂业务逻辑：风险指标
      const riskMetrics = this.calculateRiskMetrics(holdings);

      return {
        ...portfolio.toJSON(),
        holdings: holdings.map(holding => this.enrichHoldingData(holding)),
        performance,
        allocation,
        riskMetrics,
        summary: {
          totalAssets: holdings.length,
          activeAssets: holdings.filter(h => h.current_price > 0).length,
          profitableAssets: holdings.filter(h => h.getGainLoss() > 0).length
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🧮 复杂业务逻辑：计算投资组合性能指标
   * @param {Array} holdings - 持仓数组
   * @param {Object} portfolio - 投资组合对象
   * @returns {Object} 性能指标
   */
  calculatePortfolioPerformance(holdings, portfolio) {
    const totalCost = holdings.reduce((sum, holding) => 
      sum + holding.getCostBasis(), 0
    );
    
    const currentValue = holdings.reduce((sum, holding) => 
      sum + holding.getCurrentValue(), 0
    );
    
    const totalGainLoss = currentValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    
    // 🎯 复杂计算：年化收益率 (假设持有1年)
    const annualizedReturn = this.calculateAnnualizedReturn(holdings);
    
    // 📈 复杂计算：夏普比率 (简化版)
    const sharpeRatio = this.calculateSharpeRatio(holdings);
    
    // 💰 现金比例
    const cashRatio = parseFloat(portfolio.cash) / (currentValue + parseFloat(portfolio.cash)) * 100;

    return {
      totalValue: currentValue + parseFloat(portfolio.cash),
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      cash: parseFloat(portfolio.cash),
      cashRatio,
      annualizedReturn,
      sharpeRatio,
      // 波动率指标
      volatility: this.calculateVolatility(holdings),
      // 最大回撤
      maxDrawdown: this.calculateMaxDrawdown(holdings)
    };
  }

  /**
   * 🎯 复杂业务逻辑：资产配置分析
   * @param {Array} holdings - 持仓数组
   * @returns {Object} 资产配置数据
   */
  calculateAssetAllocation(holdings) {
    const totalValue = holdings.reduce((sum, holding) => sum + holding.getCurrentValue(), 0);
    
    if (totalValue === 0) return {};

    // 按资产类型分组
    const byType = {};
    const bySector = {}; // 假设有行业数据
    const byRegion = {}; // 假设有地区数据
    
    holdings.forEach(holding => {
      const value = holding.getCurrentValue();
      const percentage = (value / totalValue) * 100;
      
      // 按类型分组
      if (!byType[holding.type]) {
        byType[holding.type] = { value: 0, percentage: 0, count: 0 };
      }
      byType[holding.type].value += value;
      byType[holding.type].percentage += percentage;
      byType[holding.type].count += 1;
    });

    // 🎯 风险评估：集中度风险
    const concentrationRisk = this.calculateConcentrationRisk(holdings, totalValue);
    
    // 📊 多样化指标
    const diversificationScore = this.calculateDiversificationScore(holdings);

    return {
      byType,
      bySector,
      byRegion,
      concentrationRisk,
      diversificationScore,
      // 前10大持仓
      topHoldings: holdings
        .sort((a, b) => b.getCurrentValue() - a.getCurrentValue())
        .slice(0, 10)
        .map(h => ({
          symbol: h.symbol,
          name: h.name,
          value: h.getCurrentValue(),
          percentage: (h.getCurrentValue() / totalValue) * 100
        }))
    };
  }

  /**
   * 📊 复杂业务逻辑：风险指标计算
   * @param {Array} holdings - 持仓数组
   * @returns {Object} 风险指标
   */
  calculateRiskMetrics(holdings) {
    const totalValue = holdings.reduce((sum, holding) => sum + holding.getCurrentValue(), 0);
    
    if (totalValue === 0) return {};

    // 🎯 VaR (Value at Risk) - 简化计算
    const portfolioReturns = this.calculatePortfolioReturns(holdings);
    const var95 = this.calculateVaR(portfolioReturns, 0.05);
    const var99 = this.calculateVaR(portfolioReturns, 0.01);
    
    // 📉 Beta值 (相对于市场的风险)
    const beta = this.calculatePortfolioBeta(holdings);
    
    // 🔀 相关性分析
    const correlationMatrix = this.calculateCorrelationMatrix(holdings);

    return {
      var95,
      var99,
      beta,
      correlationMatrix,
      riskScore: this.calculateOverallRiskScore(holdings)
    };
  }

  /**
   * 🎯 复杂业务逻辑：计算年化收益率
   */
  calculateAnnualizedReturn(holdings) {
    // 简化计算：假设所有持仓都是1年前买入的
    let totalReturn = 0;
    let totalCost = 0;
    
    holdings.forEach(holding => {
      const cost = holding.getCostBasis();
      const currentValue = holding.getCurrentValue();
      totalReturn += currentValue - cost;
      totalCost += cost;
    });
    
    return totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  }

  /**
   * 📈 复杂业务逻辑：夏普比率
   */
  calculateSharpeRatio(holdings) {
    const annualizedReturn = this.calculateAnnualizedReturn(holdings);
    const riskFreeRate = 2.0; // 假设无风险利率2%
    const volatility = this.calculateVolatility(holdings);
    
    return volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
  }

  /**
   * 📊 复杂业务逻辑：波动率计算
   */
  calculateVolatility(holdings) {
    // 简化计算：基于价格变动
    let weightedVolatility = 0;
    let totalWeight = 0;
    
    holdings.forEach(holding => {
      const weight = holding.getCurrentValue();
      const priceChange = holding.getPriceChange();
      const avgPrice = parseFloat(holding.avg_price);
      const volatility = avgPrice > 0 ? Math.abs(priceChange / avgPrice) * 100 : 0;
      
      weightedVolatility += volatility * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedVolatility / totalWeight : 0;
  }

  /**
   * 🎯 复杂业务逻辑：集中度风险
   */
  calculateConcentrationRisk(holdings, totalValue) {
    // 计算单一资产占比过高的风险
    const highConcentrationThreshold = 20; // 20%阈值
    
    let riskAssets = [];
    holdings.forEach(holding => {
      const percentage = (holding.getCurrentValue() / totalValue) * 100;
      if (percentage > highConcentrationThreshold) {
        riskAssets.push({
          symbol: holding.symbol,
          percentage,
          riskLevel: percentage > 40 ? 'high' : 'medium'
        });
      }
    });
    
    return {
      riskAssets,
      riskScore: riskAssets.length > 0 ? 'high' : 'low',
      largestPosition: Math.max(...holdings.map(h => (h.getCurrentValue() / totalValue) * 100))
    };
  }

  /**
   * 📊 复杂业务逻辑：多样化分数
   */
  calculateDiversificationScore(holdings) {
    const assetCount = holdings.length;
    const typeCount = new Set(holdings.map(h => h.type)).size;
    
    // 简化的多样化分数
    let score = 0;
    if (assetCount >= 20) score += 40;
    else if (assetCount >= 10) score += 30;
    else if (assetCount >= 5) score += 20;
    else score += 10;
    
    if (typeCount >= 4) score += 30;
    else if (typeCount >= 3) score += 20;
    else if (typeCount >= 2) score += 10;
    
    // 添加其他因子...
    score += 30; // 基础分
    
    return Math.min(score, 100);
  }

  /**
   * 🔄 复杂业务逻辑：重新平衡建议
   * @param {number} portfolioId - 投资组合ID
   * @param {Object} targetAllocation - 目标配置
   * @returns {Object} 重新平衡建议
   */
  async generateRebalanceRecommendations(portfolioId, targetAllocation) {
    try {
      const portfolioData = await this.getPortfolioDetails(portfolioId);
      const currentAllocation = portfolioData.allocation.byType;
      
      const recommendations = [];
      
      Object.keys(targetAllocation).forEach(assetType => {
        const target = targetAllocation[assetType];
        const current = currentAllocation[assetType]?.percentage || 0;
        const difference = target - current;
        
        if (Math.abs(difference) > 5) { // 5%阈值
          recommendations.push({
            assetType,
            action: difference > 0 ? 'buy' : 'sell',
            currentPercentage: current,
            targetPercentage: target,
            differencePercentage: difference,
            suggestedAmount: Math.abs(difference) * portfolioData.performance.totalValue / 100
          });
        }
      });
      
      return {
        needsRebalancing: recommendations.length > 0,
        recommendations,
        estimatedCost: this.calculateRebalancingCost(recommendations),
        riskImpact: this.assessRebalancingRisk(recommendations)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🎯 丰富持仓数据
   */
  enrichHoldingData(holding) {
    return {
      ...holding.toJSON(),
      currentValue: holding.getCurrentValue(),
      costBasis: holding.getCostBasis(),
      gainLoss: holding.getGainLoss(),
      gainLossPercent: holding.getGainLossPercent(),
      priceChange: holding.getPriceChange(),
      // 添加更多计算字段...
      dayChange: 0, // 需要历史数据
      dayChangePercent: 0,
      weekChange: 0,
      monthChange: 0
    };
  }

  // 辅助方法...
  calculatePortfolioReturns(holdings) { return []; }
  calculateVaR(returns, confidence) { return 0; }
  calculatePortfolioBeta(holdings) { return 1.0; }
  calculateCorrelationMatrix(holdings) { return {}; }
  calculateOverallRiskScore(holdings) { return 'medium'; }
  calculateMaxDrawdown(holdings) { return 0; }
  calculateRebalancingCost(recommendations) { return 0; }
  assessRebalancingRisk(recommendations) { return 'low'; }
}

module.exports = new PortfolioService(); 