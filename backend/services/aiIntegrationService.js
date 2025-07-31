const chatDatabaseService = require('./chatDatabaseService');
const aiChatService = require('./aiChatService');

class AIIntegrationService {
  constructor() {
    // Store recent AI analysis results for reference
    this.analysisCache = new Map();
  }

  /**
   * Store AI Analysis results and update AI Assistant context
   * @param {number} portfolioId - Portfolio ID
   * @param {Object} analysisData - Complete AI analysis result
   * @param {Object} portfolioData - Portfolio data used for analysis
   */
  async storeAnalysisResult(portfolioId, analysisData, portfolioData) {
    try {
      console.log(`📊 Storing AI analysis result for portfolio ${portfolioId}...`);
      
      // Cache the analysis result
      const analysisKey = `portfolio_${portfolioId}`;
      this.analysisCache.set(analysisKey, {
        data: analysisData,
        portfolioData: portfolioData,
        timestamp: new Date(),
        summary: this.extractAnalysisSummary(analysisData)
      });

      // Update AI Assistant memory with new analysis
      const enhancedContext = this.createEnhancedContext(portfolioData, analysisData);
      const updated = aiChatService.updatePortfolioMemory(portfolioId, enhancedContext);

      if (updated) {
        // Add system message with analysis highlights
        const systemMessage = this.generateAnalysisUpdateMessage(analysisData);
        await this.addAnalysisSystemMessage(portfolioId, systemMessage);
      }

      console.log(`✅ Analysis result stored and AI Assistant updated for portfolio ${portfolioId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to store analysis result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cached analysis for AI Assistant reference
   * @param {number} portfolioId - Portfolio ID
   * @returns {Object|null} Cached analysis data
   */
  getCachedAnalysis(portfolioId) {
    const analysisKey = `portfolio_${portfolioId}`;
    return this.analysisCache.get(analysisKey) || null;
  }

  /**
   * Create enhanced context combining portfolio data and analysis insights
   * @param {Object} portfolioData - Current portfolio data
   * @param {Object} analysisData - AI analysis result
   * @returns {Object} Enhanced context for AI Assistant
   */
  createEnhancedContext(portfolioData, analysisData) {
    const summary = this.extractAnalysisSummary(analysisData);
    
    return {
      portfolioData: portfolioData,
      analysisData: {
        summary: summary,
        fullAnalysis: analysisData,
        analysisTimestamp: new Date(),
        keyInsights: this.extractKeyInsights(analysisData),
        recommendations: this.extractRecommendations(analysisData),
        riskFactors: this.extractRiskFactors(analysisData),
        stockAnalysis: this.extractStockAnalysis(analysisData)
      }
    };
  }

  /**
   * Extract analysis summary for quick reference
   * @param {Object} analysisData - Complete analysis data
   * @returns {Object} Analysis summary
   */
  extractAnalysisSummary(analysisData) {
    if (!analysisData) return { riskLevel: 'Unknown', overallScore: 50 };

    // 🔧 处理新的数据结构：analysis可能是对象或字符串
    let analysisText = '';
    
    if (analysisData.analysis) {
      if (typeof analysisData.analysis === 'string') {
        // 旧格式：analysis是字符串
        analysisText = analysisData.analysis;
      } else if (typeof analysisData.analysis === 'object') {
        // 新格式：analysis是对象，合并所有sections
        analysisText = Object.values(analysisData.analysis).join(' ');
      }
    }
    
    // 如果analysis为空，尝试使用rawAnalysis
    if (!analysisText && analysisData.rawAnalysis) {
      analysisText = analysisData.rawAnalysis;
    }
    
    // 确保analysisText是字符串
    if (typeof analysisText !== 'string') {
      console.warn('⚠️ analysisText不是字符串类型:', typeof analysisText, analysisText);
      analysisText = '';
    }

    // Extract risk level from analysis text
    let riskLevel = 'Medium';
    
    if (analysisText && analysisText.toLowerCase().includes('high risk') || 
        analysisText && analysisText.toLowerCase().includes('aggressive')) {
      riskLevel = 'High';
    } else if (analysisText && analysisText.toLowerCase().includes('low risk') || 
               analysisText && analysisText.toLowerCase().includes('conservative')) {
      riskLevel = 'Low';
    } else if (analysisText && analysisText.toLowerCase().includes('medium risk') || 
               analysisText && analysisText.toLowerCase().includes('moderate')) {
      riskLevel = 'Medium';
    }

    // Extract overall score
    let overallScore = 50;
    if (analysisData.summary && analysisData.summary.overallScore) {
      overallScore = analysisData.summary.overallScore;
    } else if (analysisText) {
      // Try to extract score from text
      const scoreMatch = analysisText.match(/(?:score|评分)[\s:：]*(\d+)(?:\/100|%)?/i);
      if (scoreMatch) {
        overallScore = parseInt(scoreMatch[1]);
      }
    }

    console.log(`📊 提取分析摘要 - 风险等级: ${riskLevel}, 总分: ${overallScore}`);
    return { riskLevel, overallScore };
  }

  /**
   * Extract key insights from analysis for AI Assistant reference
   * @param {Object} analysisData - Analysis data
   * @returns {Array} Array of key insights
   */
  extractKeyInsights(analysisData) {
    const insights = [];
    const analysisText = analysisData?.analysis || '';
    
    // Extract bullet points or key sentences
    const lines = analysisText.split('\n');
    lines.forEach(line => {
      if (line.includes('•') || line.includes('-') || line.includes('*')) {
        insights.push(line.trim());
      }
    });

    return insights.slice(0, 5); // Top 5 insights
  }

  /**
   * Extract recommendations from analysis
   * @param {Object} analysisData - Analysis data
   * @returns {Array} Array of recommendations
   */
  extractRecommendations(analysisData) {
    const recommendations = [];
    const analysisText = analysisData?.analysis || '';
    
    // Look for recommendation sections or action items
    const sections = analysisText.split(/(?:recommendations?|suggestions?|actions?)/i);
    if (sections.length > 1) {
      const recSection = sections[1];
      const lines = recSection.split('\n').slice(0, 10);
      lines.forEach(line => {
        if (line.trim() && (line.includes('•') || line.includes('-') || line.includes('*'))) {
          recommendations.push(line.trim());
        }
      });
    }

    return recommendations;
  }

  /**
   * Extract risk factors from analysis
   * @param {Object} analysisData - Analysis data
   * @returns {Array} Array of risk factors
   */
  extractRiskFactors(analysisData) {
    const riskFactors = [];
    const analysisText = analysisData?.analysis || '';
    
    // Look for risk-related content
    const riskKeywords = ['risk', 'volatility', 'exposure', 'concentration', 'uncertainty'];
    const lines = analysisText.split('\n');
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (riskKeywords.some(keyword => lowerLine.includes(keyword)) && 
          (line.includes('•') || line.includes('-') || line.includes('*'))) {
        riskFactors.push(line.trim());
      }
    });

    return riskFactors.slice(0, 5);
  }

  /**
   * Extract individual stock analysis from the report
   * @param {Object} analysisData - Analysis data
   * @returns {Object} Stock-specific analysis
   */
  extractStockAnalysis(analysisData) {
    const stockAnalysis = {};
    const analysisText = analysisData?.analysis || '';
    
    // Common stock symbols to look for
    const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'BTC', 'ETH'];
    
    stockSymbols.forEach(symbol => {
      const regex = new RegExp(`${symbol}[\\s\\S]*?(?=\\n\\n|$)`, 'i');
      const match = analysisText.match(regex);
      if (match) {
        stockAnalysis[symbol] = match[0].trim();
      }
    });

    return stockAnalysis;
  }

  /**
   * Generate system message about new analysis
   * @param {Object} analysisData - Analysis data
   * @returns {string} System message content
   */
  generateAnalysisUpdateMessage(analysisData) {
    const summary = this.extractAnalysisSummary(analysisData);
    const insights = this.extractKeyInsights(analysisData);
    
    let message = `[New AI Analysis Available] 📊\n\n`;
    message += `Risk Level: ${summary.riskLevel} | Overall Score: ${summary.overallScore}/100\n\n`;
    
    if (insights.length > 0) {
      message += `Key Insights:\n`;
      insights.slice(0, 3).forEach(insight => {
        message += `${insight}\n`;
      });
    }
    
    message += `\nI now have access to detailed portfolio analysis and can provide specific, data-driven recommendations based on this latest assessment.`;
    
    return message;
  }

  /**
   * Add system message to AI Assistant session
   * @param {number} portfolioId - Portfolio ID
   * @param {string} message - System message content
   */
  async addAnalysisSystemMessage(portfolioId, message) {
    try {
      const sessionId = `portfolio_${portfolioId}`;
      await aiChatService.addMessageToSession(sessionId, 'system', message, portfolioId);
      
      // Also save to database
      await chatDatabaseService.saveMessage(sessionId, 'system', message, true);
      
      console.log(`📨 Added analysis system message to session ${sessionId}`);
    } catch (error) {
      console.error('Failed to add analysis system message:', error);
    }
  }

  /**
   * Clean up old cached analysis results
   * @param {number} maxAgeHours - Maximum age in hours
   */
  cleanupOldAnalysis(maxAgeHours = 168) { // 7 days default
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [key, data] of this.analysisCache.entries()) {
      if (data.timestamp < cutoffTime) {
        this.analysisCache.delete(key);
        console.log(`🧹 Cleaned up old analysis cache for ${key}`);
      }
    }
  }

  /**
   * Get portfolio analysis history for AI Assistant context
   * @param {number} portfolioId - Portfolio ID
   * @returns {Object} Analysis history
   */
  async getAnalysisHistory(portfolioId) {
    try {
      const sessionId = `portfolio_${portfolioId}`;
      const dbResult = await chatDatabaseService.loadSession(sessionId);
      
      if (dbResult.success) {
        // Filter system messages related to analysis
        const analysisMessages = dbResult.session.messages.filter(msg => 
          msg.role === 'system' && 
          (msg.content.includes('Analysis') || msg.content.includes('📊'))
        );
        
        return {
          success: true,
          analysisHistory: analysisMessages,
          cachedAnalysis: this.getCachedAnalysis(portfolioId)
        };
      }
      
      return { success: false, error: 'No session found' };
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AIIntegrationService(); 