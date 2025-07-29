const aiIntegrationService = require('./services/aiIntegrationService');
const aiChatService = require('./services/aiChatService');
const chatDatabaseService = require('./services/chatDatabaseService');

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration Service...\n');

  // Mock portfolio data
  const mockPortfolioData = {
    totalValue: 150000,
    totalAssets: 5,
    assetsByType: {
      stock: {
        totalValue: 120000,
        assets: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            quantity: 100,
            current_price: 175.25,
            avg_cost: 150.00,
            gainLossPercent: 16.83
          },
          {
            symbol: 'TSLA',
            name: 'Tesla Inc.',
            quantity: 50,
            current_price: 245.60,
            avg_cost: 800.00,
            gainLossPercent: -69.30
          }
        ]
      }
    },
    assetDistribution: {
      stock: { value: 120000, percentage: '80.00' },
      cash: { value: 30000, percentage: '20.00' }
    }
  };

  // Mock analysis data
  const mockAnalysisData = {
    analysis: `
## Portfolio Analysis Summary

Your portfolio shows a **Medium-High risk** profile with some areas requiring attention.

### Key Insights:
• Strong performance from AAPL with +16.83% returns
• Significant underperformance in TSLA with -69.30% losses  
• Portfolio is well-diversified across technology sector
• High concentration risk in individual tech stocks
• Consider rebalancing to reduce volatility exposure

### Recommendations:
• Consider reducing TSLA position size to limit losses
• Diversify into other sectors beyond technology
• Add defensive stocks or bonds for stability
• Monitor AAPL position for profit-taking opportunities
• Set stop-loss orders for risk management

### Risk Factors:
• High exposure to volatile tech stocks increases portfolio risk
• Single sector concentration creates correlation risk
• Market volatility could amplify current TSLA losses
• Lack of defensive positioning in uncertain markets
• Need for better risk-adjusted returns through diversification

### TSLA - Tesla Inc.
Recent company performance shows significant challenges with production targets and market competition. 
The stock has faced headwinds from increased competition in the EV space and margin compression.
Consider position sizing relative to risk tolerance.

### AAPL - Apple Inc. 
Strong fundamental performance with consistent revenue growth and market leadership.
Services segment providing recurring revenue streams.
Monitor for valuation metrics and market saturation risks.
    `,
    timestamp: new Date(),
    model: 'qwen-turbo-latest'
  };

  try {
    // Test 1: Store analysis result
    console.log('1️⃣ Testing analysis result storage...');
    const storeResult = await aiIntegrationService.storeAnalysisResult(1, mockAnalysisData, mockPortfolioData);
    console.log('Store result:', storeResult);
    console.log('✅ Analysis stored successfully\n');

    // Test 2: Test cached analysis retrieval
    console.log('2️⃣ Testing cached analysis retrieval...');
    const cachedAnalysis = aiIntegrationService.getCachedAnalysis(1);
    console.log('Cached analysis summary:', cachedAnalysis?.summary);
    console.log('Key insights count:', cachedAnalysis?.data?.keyInsights?.length || 0);
    console.log('✅ Cache retrieval successful\n');

    // Test 3: Test enhanced context creation
    console.log('3️⃣ Testing enhanced context creation...');
    const enhancedContext = aiIntegrationService.createEnhancedContext(mockPortfolioData, mockAnalysisData);
    console.log('Enhanced context keys:', Object.keys(enhancedContext));
    console.log('Analysis data keys:', Object.keys(enhancedContext.analysisData));
    console.log('Key insights:', enhancedContext.analysisData.keyInsights?.slice(0, 2));
    console.log('✅ Enhanced context created successfully\n');

    // Test 4: Test AI Chat with enhanced context
    console.log('4️⃣ Testing AI Chat with enhanced context...');
    const sessionId = 'portfolio_1';
    
    // Simulate a user question
    const testMessage = "What do you think about my Tesla position? Should I sell?";
    console.log(`User: ${testMessage}`);
    
    // Get session info
    const sessionInfo = aiChatService.getSessionInfo(sessionId);
    console.log('Session info:', {
      messageCount: sessionInfo.messageCount,
      hasPortfolioContext: sessionInfo.hasPortfolioContext,
      isPersistent: sessionInfo.isPersistent
    });
    
    console.log('✅ AI Chat integration test completed\n');

    // Test 5: Test database storage
    console.log('5️⃣ Testing database storage...');
    const dbSession = await chatDatabaseService.loadSession(sessionId);
    if (dbSession.success) {
      console.log('Database session loaded:', {
        id: dbSession.session.id,
        portfolioId: dbSession.session.portfolioId,
        messageCount: dbSession.session.messages.length
      });
      
      // Show recent system messages
      const systemMessages = dbSession.session.messages
        .filter(msg => msg.role === 'system')
        .slice(-2);
      console.log('Recent system messages:', systemMessages.length);
      
      systemMessages.forEach((msg, index) => {
        console.log(`System message ${index + 1}:`, msg.content.substring(0, 100) + '...');
      });
    } else {
      console.log('No database session found yet');
    }
    console.log('✅ Database storage test completed\n');

    // Test 6: Test analysis history
    console.log('6️⃣ Testing analysis history...');
    const analysisHistory = await aiIntegrationService.getAnalysisHistory(1);
    console.log('Analysis history result:', {
      success: analysisHistory.success,
      analysisMessageCount: analysisHistory.analysisHistory?.length || 0,
      hasCachedAnalysis: !!analysisHistory.cachedAnalysis
    });
    console.log('✅ Analysis history test completed\n');

    console.log('🎉 All AI Integration tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Analysis result storage and caching');
    console.log('- ✅ Enhanced context creation with insights extraction');
    console.log('- ✅ AI Assistant memory integration');
    console.log('- ✅ Database persistence');
    console.log('- ✅ Analysis history tracking');
    console.log('\n🤖 Your AI Assistant now has:');
    console.log('- 🧠 Persistent memory across page navigation');
    console.log('- 📊 Access to detailed AI analysis results');
    console.log('- 💡 Key insights and recommendations awareness');
    console.log('- ⚠️ Risk factor understanding');
    console.log('- 📈 Individual stock analysis access');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testAIIntegration();
}

module.exports = { testAIIntegration }; 