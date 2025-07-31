const express = require('express');
const router = express.Router();
// Use improved AI service with retry mechanism and offline fallback
const aiAnalysisService = require('../services/aiAnalysisService-improved');
const aiChatService = require('../services/aiChatService');
const aiIntegrationService = require('../services/aiIntegrationService');
const portfolioService = require('../services/portfolioService');
const assetService = require('../services/assetService'); // 添加assetService
const aiAnalysisHistoryService = require('../services/aiAnalysisHistoryService');

// 🗣️ POST /api/ai-analysis/chat - AI Assistant Chat
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message, portfolioId, portfolioContext } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required'
      });
    }

    console.log(`💬 Chat request for session ${sessionId.substring(0, 8)}: "${message.substring(0, 50)}..."`);

    // Generate AI chat response
    const chatResult = await aiChatService.generateChatResponse(
      sessionId, 
      message, 
      portfolioContext,
      portfolioId
    );
    
    if (chatResult.success) {
      console.log('✅ Chat response generated successfully');
      res.json({
        success: true,
        data: {
          response: chatResult.response,
          sessionId: chatResult.sessionId,
          messageCount: chatResult.messageCount,
          isOffline: chatResult.isOffline || false,
          usage: chatResult.usage
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: chatResult.error || 'Failed to generate chat response'
      });
    }

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during chat processing'
    });
  }
});

// 📋 GET /api/ai-analysis/chat/session/:sessionId - Get session info
router.get('/chat/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const sessionInfo = aiChatService.getSessionInfo(sessionId);
    
    res.json({
      success: true,
      data: sessionInfo
    });

  } catch (error) {
    console.error('Session Info API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session information'
    });
  }
});

// 🤖 POST /api/ai-analysis/portfolio - Generate AI portfolio analysis report
router.post('/portfolio', async (req, res) => {
  try {
    const { portfolioId } = req.body;
    
    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio ID is required'
      });
    }

    console.log(`🔍 Starting AI analysis for portfolio ${portfolioId}...`);

    // Get portfolio data from assets service (same as Dashboard)
    console.log('📊 Fetching portfolio data from assets service...');
    const portfolioData = await assetService.getPortfolioAssets(portfolioId);
    
    if (!portfolioData) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or failed to fetch data from assets service'
      });
    }

    console.log('📊 Portfolio data retrieved successfully from assets service');

    // Call AI analysis service (with retry and offline fallback)
    console.log('🤖 Calling Aliyun AI service for portfolio analysis...');
    const analysisResult = await aiAnalysisService.analyzePortfolio(portfolioData);
    
    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: analysisResult.error
      });
    }

    // Generate analysis summary
    const summary = aiAnalysisService.generateSummary(analysisResult.data);
    const completeAnalysisData = { ...analysisResult.data, summary };
    
    console.log('✅ AI analysis completed');

    // Store analysis result and update AI Assistant memory
    try {
      await aiIntegrationService.storeAnalysisResult(
        portfolioId, 
        completeAnalysisData, 
        portfolioData
      );
      console.log(`🤖 AI Assistant memory updated with enhanced analysis for portfolio ${portfolioId}`);
    } catch (error) {
      console.warn('Failed to update AI Assistant memory:', error.message);
      // Don't fail the request if memory update fails
    }

    // Save analysis report to history database and get reportId
    let reportId = null;
    try {
      const historyResult = await aiAnalysisHistoryService.saveAnalysisReport(
        portfolioId,
        completeAnalysisData,
        portfolioData
      );
      
      if (historyResult.success) {
        reportId = historyResult.reportId;
        console.log(`📝 Analysis report saved to database - Report ID: ${reportId}`);
      } else {
        console.error('Failed to save analysis report to history:', historyResult.error);
        // Return error if we can't save to database
        return res.status(500).json({
          success: false,
          error: 'Failed to save analysis report to database'
        });
      }
    } catch (error) {
      console.error('Database save error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to save analysis report to database'
      });
    }

    // Return success response with report data and reportId
    res.json({
      success: true,
      data: {
        reportId: reportId,
        ...completeAnalysisData,
        portfolioSnapshot: {
          ...completeAnalysisData.portfolioSnapshot,
          portfolioId: portfolioId
        }
      },
      message: `AI analysis report generated successfully with ID: ${reportId}`
    });

  } catch (error) {
    console.error('AI Analysis API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during AI analysis'
    });
  }
});

// 📊 GET /api/ai-analysis/portfolio/:portfolioId - Get portfolio analysis report
router.get('/portfolio/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { reportId } = req.query;
    
    console.log(`🔍 Getting AI analysis for portfolio ${portfolioId}${reportId ? ` with reportId ${reportId}` : ''}...`);
    
    // If reportId is provided, try to get the existing report from database
    if (reportId) {
      console.log(`📋 Retrieving existing report ${reportId} from database...`);
      const existingReport = await aiAnalysisHistoryService.getAnalysisReport(reportId);
      
      if (existingReport.success) {
        console.log(`✅ Found existing report ${reportId}, returning cached data`);
        
        // Convert database format to response format
        const reportData = existingReport.data;
        const responseData = {
          id: reportData.id,
          timestamp: reportData.timestamp,
          portfolioSnapshot: {
            totalValue: reportData.portfolio_value,
            // Add other portfolio snapshot data if available in raw_analysis_data
            ...(reportData.raw_analysis_data?.portfolioSnapshot || {})
          },
          analysis: reportData.raw_analysis_data?.analysis || {},
          rawAnalysis: reportData.raw_analysis_data?.rawAnalysis || '',
          usage: reportData.raw_analysis_data?.usage || {},
          isOffline: reportData.raw_analysis_data?.isOffline || false,
          summary: {
            overallScore: reportData.overall_score,
            riskLevel: reportData.risk_level,
            totalReturn: reportData.total_return,
            sharpeRatio: reportData.sharpe_ratio,
            keyInsights: reportData.key_insights || [],
            recommendations: reportData.recommendations || [],
            riskFactors: reportData.risk_factors || []
          }
        };
        
        return res.json({
          success: true,
          data: responseData
        });
      } else {
        console.warn(`⚠️ Report ${reportId} not found in database, generating new analysis...`);
      }
    }
    
    // If no reportId provided or report not found, generate new analysis
    console.log(`🆕 Generating new AI analysis for portfolio ${portfolioId}...`);
    
    // Get portfolio data
    const portfolioResult = await portfolioService.getPortfolioSummary(portfolioId);
    
    if (!portfolioResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    // Call AI analysis service (with retry and offline fallback)
    const analysisResult = await aiAnalysisService.analyzePortfolio(portfolioResult.data);
    
    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: analysisResult.error
      });
    }

    // Generate analysis summary
    const summary = aiAnalysisService.generateSummary(analysisResult.data);
    
    const responseData = {
      ...analysisResult.data,
      summary
    };

    // If offline mode, add notice
    if (analysisResult.data.isOffline) {
      responseData.notice = 'Currently using offline analysis mode. Recommend obtaining detailed analysis when network is restored.';
    }

    // Store analysis result and update AI Assistant memory with enhanced context
    try {
      await aiIntegrationService.storeAnalysisResult(
        portfolioId, 
        responseData, 
        portfolioResult.data
      );
      console.log(`🤖 AI Assistant memory updated with enhanced analysis for portfolio ${portfolioId} (GET)`);
    } catch (error) {
      console.warn('Failed to update AI Assistant memory:', error.message);
      // Don't fail the request if memory update fails
    }

    console.log('✅ AI analysis completed');
    
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('AI Analysis GET API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during AI analysis'
    });
  }
});

// 🔍 GET /api/ai-analysis/test-connection - Test AI API connection
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🧪 Testing AI API connection...');
    
    const testPrompt = 'Hello, please respond with "Connection successful" to confirm the API is working.';
    
    const aiResult = await aiAnalysisService.callAliyunAI(testPrompt, 1); // Only try once
    
    if (aiResult.success) {
      console.log('✅ AI API connection test successful');
      res.json({
        success: true,
        message: 'AI API connection is working',
        response: aiResult.analysis,
        usage: aiResult.usage
      });
    } else {
      console.log('❌ AI API connection test failed');
      res.json({
        success: false,
        message: 'AI API connection failed',
        error: aiResult.error,
        offline: true
      });
    }

  } catch (error) {
    console.error('API Connection Test Error:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
});

// 🎯 GET /api/ai-analysis/quick-insights/:portfolioId - Quick analysis insights
router.get('/quick-insights/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    
    // Get portfolio data
    const portfolioResult = await portfolioService.getPortfolioSummary(portfolioId);
    
    if (!portfolioResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    const portfolioData = portfolioResult.data;
    
    // Quick analysis (rule-based, no AI call)
    const quickInsights = {
      diversificationScore: calculateDiversificationScore(portfolioData),
      riskLevel: assessQuickRiskLevel(portfolioData),
      topPerformer: findTopPerformer(portfolioData),
      recommendations: generateQuickRecommendations(portfolioData)
    };

    res.json({
      success: true,
      data: quickInsights
    });

  } catch (error) {
    console.error('Quick Insights API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during quick analysis'
    });
  }
});

// Helper functions
function calculateDiversificationScore(portfolioData) {
  const assetTypes = Object.keys(portfolioData.assetsByType).filter(type => 
    portfolioData.assetsByType[type].count > 0
  ).length;
  
  return Math.min(assetTypes * 20, 100); // 20 points per asset type, max 100
}

function assessQuickRiskLevel(portfolioData) {
  const assets = portfolioData.assetsByType;
  const total = portfolioData.totalValue;
  
  const cryptoRatio = (assets.crypto?.totalValue || 0) / total;
  const stockRatio = (assets.stock?.totalValue || 0) / total;
  
  const riskyRatio = cryptoRatio + stockRatio;
  
  if (riskyRatio > 0.8) return 'High';
  if (riskyRatio > 0.6) return 'Medium-High';
  if (riskyRatio > 0.4) return 'Medium';
  return 'Low';
}

function findTopPerformer(portfolioData) {
  let topAsset = null;
  let bestGain = -Infinity;
  
  Object.values(portfolioData.assetsByType).forEach(typeData => {
    if (typeData.assets) {
      typeData.assets.forEach(asset => {
        if (asset.gainLossPercent > bestGain) {
          bestGain = asset.gainLossPercent;
          topAsset = asset;
        }
      });
    }
  });
  
  return topAsset;
}

function generateQuickRecommendations(portfolioData) {
  const recommendations = [];
  const assets = portfolioData.assetsByType;
  const total = portfolioData.totalValue;
  
  // Check diversification
  const assetTypes = Object.keys(assets).filter(type => assets[type].count > 0);
  if (assetTypes.length < 3) {
    recommendations.push('Consider increasing asset type diversification, add ETFs or bonds');
  }
  
  // Check concentration
  const maxConcentration = Math.max(...Object.values(assets).map(a => a.totalValue / total));
  if (maxConcentration > 0.7) {
    recommendations.push('Portfolio is over-concentrated, suggest diversification to reduce risk');
  }
  
  // Check cryptocurrency ratio
  const cryptoRatio = (assets.crypto?.totalValue || 0) / total;
  if (cryptoRatio > 0.3) {
    recommendations.push('High cryptocurrency allocation, suggest moderate reduction to control risk');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Portfolio allocation is relatively balanced, recommend regular evaluation and adjustment');
  }
  
  return recommendations;
}

// 📊 GET /api/ai-analysis/history - Get AI analysis reports history
router.get('/history', async (req, res) => {
  try {
    const { portfolioId, limit = 20 } = req.query;
    
    console.log(`📋 Fetching analysis history for portfolio ${portfolioId || 'all'}, limit: ${limit}`);

    const historyResult = await aiAnalysisHistoryService.getAnalysisHistory(
      portfolioId ? parseInt(portfolioId) : null,
      parseInt(limit)
    );

    if (historyResult.success) {
      console.log(`✅ Found ${historyResult.data.length} analysis reports`);
      res.json({
        success: true,
        data: historyResult.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: historyResult.error,
        data: []
      });
    }

  } catch (error) {
    console.error('Get Analysis History API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching analysis history',
      data: []
    });
  }
});

// 📄 GET /api/ai-analysis/report/:reportId - Get specific analysis report
router.get('/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'Report ID is required'
      });
    }

    console.log(`📋 Fetching analysis report ${reportId}`);

    const reportResult = await aiAnalysisHistoryService.getAnalysisReport(parseInt(reportId));

    if (reportResult.success) {
      console.log(`✅ Found analysis report ${reportId}`);
      res.json({
        success: true,
        data: reportResult.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: reportResult.error
      });
    }

  } catch (error) {
    console.error('Get Analysis Report API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching analysis report'
    });
  }
});

// 🧹 Cleanup old chat sessions periodically
setInterval(() => {
  aiChatService.cleanupOldSessions(24); // Clean sessions older than 24 hours
}, 60 * 60 * 1000); // Run every hour

module.exports = router; 