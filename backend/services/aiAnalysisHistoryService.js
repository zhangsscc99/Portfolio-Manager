const { AIAnalysisReport, Portfolio } = require('../models/index');

class AIAnalysisHistoryService {
  /**
   * 保存AI分析报告到数据库
   * @param {number} portfolioId - 投资组合ID
   * @param {object} analysisData - 分析数据
   * @param {object} portfolioData - 投资组合数据
   * @returns {Promise<object>} 保存结果
   */
  async saveAnalysisReport(portfolioId, analysisData, portfolioData) {
    try {
      // 提取关键数据
      const portfolioValue = portfolioData?.totalValue || 0;
      const overallScore = this.extractOverallScore(analysisData);
      const riskLevel = this.extractRiskLevel(analysisData);
      const totalReturn = this.extractTotalReturn(analysisData);
      const sharpeRatio = this.extractSharpeRatio(analysisData);
      const keyInsights = this.extractKeyInsights(analysisData);
      const recommendations = this.extractRecommendations(analysisData);
      const riskFactors = this.extractRiskFactors(analysisData);
      const stockAnalysis = this.extractStockAnalysis(analysisData);

      // 使用Sequelize ORM创建记录
      const report = await AIAnalysisReport.create({
        portfolio_id: portfolioId,
        portfolio_value: portfolioValue,
        overall_score: overallScore,
        risk_level: riskLevel,
        total_return: totalReturn,
        sharpe_ratio: sharpeRatio,
        key_insights: keyInsights,
        recommendations: recommendations,
        risk_factors: riskFactors,
        stock_analysis: stockAnalysis,
        raw_analysis_data: analysisData
      });
      
      console.log(`✅ AI分析报告已保存到数据库 - 报告ID: ${report.id}`);
      
      return {
        success: true,
        reportId: report.id,
        message: 'Analysis report saved successfully'
      };
    } catch (error) {
      console.error('❌ 保存AI分析报告失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取AI分析报告历史
   * @param {number} portfolioId - 投资组合ID (可选)
   * @param {number} limit - 限制数量 (默认20)
   * @returns {Promise<object>} 报告历史
   */
  async getAnalysisHistory(portfolioId = null, limit = 20) {
    try {
      const whereClause = portfolioId ? { portfolio_id: portfolioId } : {};
      
      const reports = await AIAnalysisReport.findAll({
        where: whereClause,
        attributes: [
          'id',
          'portfolio_id',
          'timestamp',
          'portfolio_value',
          'overall_score',
          'risk_level',
          'total_return',
          'sharpe_ratio',
          'key_insights',
          'recommendations',
          'risk_factors',
          'stock_analysis',
          'created_at'
        ],
        order: [['timestamp', 'DESC']],
        limit: limit,
        raw: true // 返回原始数据而不是Model实例
      });

      console.log(`✅ 获取到 ${reports.length} 条AI分析报告`);
      
      return {
        success: true,
        data: reports
      };
    } catch (error) {
      console.error('❌ 获取AI分析报告历史失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 获取特定的AI分析报告
   * @param {number} reportId - 报告ID
   * @returns {Promise<object>} 报告详情
   */
  async getAnalysisReport(reportId) {
    try {
      const report = await AIAnalysisReport.findByPk(reportId, {
        raw: true // 返回原始数据而不是Model实例
      });
      
      if (!report) {
        return {
          success: false,
          error: 'Report not found'
        };
      }

      return {
        success: true,
        data: report
      };
    } catch (error) {
      console.error('❌ 获取AI分析报告详情失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 数据提取辅助方法
  extractOverallScore(analysisData) {
    return analysisData?.summary?.overallScore || analysisData?.overallScore || analysisData?.score || 85;
  }

  extractRiskLevel(analysisData) {
    return analysisData?.summary?.riskLevel || analysisData?.riskLevel || analysisData?.risk || 'Medium';
  }

  extractTotalReturn(analysisData) {
    // 不再计算总回报，返回空字符串或null
    return null;
  }

  extractSharpeRatio(analysisData) {
    // 不再计算夏普比率，返回null
    return null;
  }

  extractKeyInsights(analysisData) {
    return analysisData?.keyInsights || analysisData?.insights || [];
  }

  extractRecommendations(analysisData) {
    return analysisData?.recommendations || [];
  }

  extractRiskFactors(analysisData) {
    return analysisData?.riskFactors || analysisData?.risks || [];
  }

  extractStockAnalysis(analysisData) {
    return analysisData?.stockAnalysis || analysisData?.stocks || {};
  }


}

module.exports = new AIAnalysisHistoryService(); 