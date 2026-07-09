const express = require('express');
const router = express.Router();
// Use improved AI service with retry mechanism and offline fallback
const aiAnalysisService = require('../services/aiAnalysisService-improved');
const aiChatService = require('../services/aiChatService');
const aiIntegrationService = require('../services/aiIntegrationService');
const portfolioService = require('../services/portfolioService');
const assetService = require('../services/assetService'); // 添加assetService
const aiAnalysisHistoryService = require('../services/aiAnalysisHistoryService');

// RocketMQ 消息管理器
const messageManager = require('../services/rocketmq/messageManager');

async function buildRealtimePortfolioContext(requestedPortfolioId, clientContext = null) {
  const tryLoadAssets = async (portfolioId) => {
    if (!portfolioId) return null;
    try {
      const data = await assetService.getPortfolioAssets(portfolioId);
      if (!data || !data.assetsByType || (data.totalAssets || 0) <= 0) {
        return null;
      }
      return { portfolioId, data };
    } catch (error) {
      console.warn(`⚠️ Unable to load portfolio ${portfolioId} for AI chat: ${error.message}`);
      return null;
    }
  };

  let loaded = await tryLoadAssets(requestedPortfolioId);

  if (!loaded) {
    const currentPortfolio = await portfolioService.getPortfolioDetails();
    loaded = await tryLoadAssets(currentPortfolio.id);
  }

  if (!loaded) {
    return clientContext;
  }

  const portfolioData = loaded.data;
  const assetDistribution = Object.entries(portfolioData.assetsByType || {}).reduce((acc, [type, data]) => {
    const value = Number(data.totalValue || 0);
    acc[type] = {
      value,
      percentage: portfolioData.totalValue > 0 ? ((value / portfolioData.totalValue) * 100).toFixed(2) : '0.00',
      count: data.count || data.assets?.length || 0
    };
    return acc;
  }, {});

  console.log(`🧾 Loaded realtime portfolio ${loaded.portfolioId} for AI chat: ${portfolioData.totalAssets} assets, $${Number(portfolioData.totalValue || 0).toFixed(2)}`);

  return {
    ...(clientContext || {}),
    portfolioData: {
      ...(clientContext?.portfolioData || {}),
      ...portfolioData,
      assetDistribution
    },
    analysisData: clientContext?.analysisData || null,
    realtimeDataLoaded: true,
    resolvedPortfolioId: loaded.portfolioId,
    timestamp: new Date().toISOString()
  };
}

// 🗣️ POST /api/ai-analysis/chat - AI Assistant Chat
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message, portfolioId, portfolioContext, requestFollowUpQuestions, conversationHistory } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required'
      });
    }

    console.log(`💬 Chat request for session ${sessionId.substring(0, 8)}: "${message.substring(0, 50)}..."`);
    if (requestFollowUpQuestions) {
      console.log(`📝 Also requesting follow-up questions generation`);
    }

    const realtimePortfolioContext = await buildRealtimePortfolioContext(
      portfolioId,
      portfolioContext
    );
    const resolvedPortfolioId = realtimePortfolioContext?.resolvedPortfolioId || portfolioId;

    // Generate AI chat response
    const chatResult = await aiChatService.generateChatResponse(
      sessionId, 
      message, 
      realtimePortfolioContext,
      resolvedPortfolioId,
      requestFollowUpQuestions,
      conversationHistory
    );
    
    if (chatResult.success) {
      console.log('✅ Chat response generated successfully');
      if (chatResult.followUpQuestions && chatResult.followUpQuestions.length > 0) {
        console.log(`📝 Generated ${chatResult.followUpQuestions.length} follow-up questions`);
      }
      res.json({
        success: true,
        data: {
          response: chatResult.response,
          sessionId: chatResult.sessionId,
          messageCount: chatResult.messageCount,
          isOffline: chatResult.isOffline || false,
          usage: chatResult.usage,
          followUpQuestions: chatResult.followUpQuestions || []
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

    const errorMessage = error?.message || '';
    if (
      errorMessage.includes('投资组合不存在') ||
      errorMessage.toLowerCase().includes('portfolio not found')
    ) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

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

// 🚀 POST /api/ai-analysis/async - Asynchronous AI Portfolio Analysis
router.post('/async', async (req, res) => {
  try {
    const { portfolioId, analysisType = 'full', userId } = req.body;
    
    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio ID is required'
      });
    }

    console.log(`🚀 Requesting async AI analysis for portfolio ${portfolioId}`);

    // 检查RocketMQ连接状态
    if (!messageManager.isHealthy()) {
      console.warn('⚠️ RocketMQ not available, falling back to synchronous analysis');
      
      // 回退到同步分析
      const portfolioData = await assetService.getPortfolioAssets(portfolioId);
      if (!portfolioData || !portfolioData.assetsByType) {
        return res.status(404).json({
          success: false,
          error: 'Portfolio not found or has no assets'
        });
      }

      const aiAnalysisService = require('../services/aiAnalysisService-improved');
      const analysisResult = await aiAnalysisService.analyzePortfolio(portfolioData);
      
      if (analysisResult.success) {
        // 保存分析结果
        const saveResult = await aiAnalysisHistoryService.saveAnalysisReport(
          portfolioId,
          analysisResult.data,
          portfolioData
        );
        
        return res.json({
          success: true,
          mode: 'synchronous',
          data: analysisResult.data,
          reportId: saveResult.reportId
        });
      } else {
        return res.status(500).json({
          success: false,
          error: analysisResult.error
        });
      }
    }

    // 获取投资组合数据
    const portfolioData = await assetService.getPortfolioAssets(portfolioId);
    if (!portfolioData || !portfolioData.assetsByType) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found or has no assets'
      });
    }

    // 异步发送AI分析请求到消息队列
    const asyncResult = await messageManager.requestAIAnalysisAsync({
      portfolioId,
      portfolioData,
      analysisType,
      userId
    });

    if (asyncResult.success) {
      console.log(`✅ Async AI analysis request submitted: ${asyncResult.requestId}`);
      res.json({
        success: true,
        mode: 'asynchronous',
        requestId: asyncResult.requestId,
        messageId: asyncResult.messageId,
        message: asyncResult.message,
        estimatedTime: '1-3 minutes'
      });
    } else {
      res.status(500).json({
        success: false,
        error: asyncResult.error
      });
    }

  } catch (error) {
    console.error('Async AI Analysis API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while requesting async analysis'
    });
  }
});

// 📊 GET /api/ai-analysis/status/:requestId - Check async analysis status
router.get('/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Request ID is required'
      });
    }

    console.log(`🔍 Checking status for analysis request: ${requestId}`);

    // 查询分析结果 - 这里可以通过数据库查询或缓存查询
    // 由于我们的系统会自动保存结果到数据库，我们可以查询最近的报告
    const historyResult = await aiAnalysisHistoryService.getAnalysisHistory(null, 50);
    
    if (historyResult.success) {
      // 查找匹配的请求ID（这里需要在保存时包含请求ID）
      const matchingReport = historyResult.data.find(report => 
        report.raw_analysis_data && 
        JSON.stringify(report.raw_analysis_data).includes(requestId)
      );
      
      if (matchingReport) {
        res.json({
          success: true,
          status: 'completed',
          data: {
            requestId,
            reportId: matchingReport.id,
            completedAt: matchingReport.created_at,
            analysisData: matchingReport
          }
        });
      } else {
        res.json({
          success: true,
          status: 'processing',
          data: {
            requestId,
            message: 'Analysis is still in progress'
          }
        });
      }
    } else {
      res.json({
        success: true,
        status: 'processing',
        data: {
          requestId,
          message: 'Analysis is still in progress'
        }
      });
    }

  } catch (error) {
    console.error('Check Analysis Status API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while checking analysis status'
    });
  }
});

// 🧪 测试AI分析内容解析 - 调试端点
router.get('/test-parsing', async (req, res) => {
  try {
    console.log('🧪 测试AI分析内容解析...');
    
    const aiAnalysisService = require('../services/aiAnalysisService-improved');
    const testResult = aiAnalysisService.testParseAnalysisContent();
    
    res.json({
      success: true,
      message: 'AI parsing test completed',
      data: {
        sections: testResult,
        statistics: {
          totalSections: Object.keys(testResult).length,
          populatedSections: Object.keys(testResult).filter(key => testResult[key]).length,
          emptySections: Object.keys(testResult).filter(key => !testResult[key]).length
        }
      }
    });
  } catch (error) {
    console.error('❌ 测试AI解析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🧹 Cleanup old chat sessions periodically
setInterval(() => {
  aiChatService.cleanupOldSessions(24); // Clean sessions older than 24 hours
}, 60 * 60 * 1000); // Run every hour

module.exports = router; 
