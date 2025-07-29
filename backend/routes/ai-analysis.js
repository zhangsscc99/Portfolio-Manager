const express = require('express');
const router = express.Router();
// Use improved AI service with retry mechanism and offline fallback
const aiAnalysisService = require('../services/aiAnalysisService-improved');
const aiChatService = require('../services/aiChatService');
const portfolioService = require('../services/portfolioService');

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
      portfolioContext
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

    console.log(`🔍 Starting analysis for portfolio ${portfolioId}...`);

    // Get portfolio data
    const portfolioResult = await portfolioService.getPortfolioSummary(portfolioId);
    
    if (!portfolioResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or failed to fetch data'
      });
    }

    console.log('📊 Portfolio data retrieved successfully');

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
    
    console.log('✅ AI analysis completed');

    res.json({
      success: true,
      data: {
        ...analysisResult.data,
        summary
      }
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
    
    console.log(`🔍 Getting AI analysis for portfolio ${portfolioId}...`);
    
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

    console.log('✅ AI analysis retrieval completed');
    
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

// 🧹 Cleanup old chat sessions periodically
setInterval(() => {
  aiChatService.cleanupOldSessions(24); // Clean sessions older than 24 hours
}, 60 * 60 * 1000); // Run every hour

module.exports = router; 