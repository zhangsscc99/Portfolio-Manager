const axios = require('axios');

class AIChatService {
  constructor() {
    this.apiKey = "sk-18fcc076d5d746fea3c922d20aef7364";
    this.baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/";
    this.endpoint = `${this.baseUrl}chat/completions`;
    
    // In-memory session storage (in production, use Redis or database)
    this.sessions = new Map();
  }

  // Get or create chat session
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        messages: [],
        portfolioContext: null,
        createdAt: new Date(),
        lastActivity: new Date()
      });
    }
    return this.sessions.get(sessionId);
  }

  // Update session context with portfolio data
  updateSessionContext(sessionId, portfolioContext) {
    const session = this.getSession(sessionId);
    session.portfolioContext = portfolioContext;
    session.lastActivity = new Date();
  }

  // Add message to session history
  addMessageToSession(sessionId, role, content) {
    const session = this.getSession(sessionId);
    session.messages.push({
      role,
      content,
      timestamp: new Date()
    });
    session.lastActivity = new Date();
    
    // Keep only last 20 messages to manage context length
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }
  }

  // Generate system prompt with portfolio context
  generateSystemPrompt(portfolioContext) {
    if (!portfolioContext?.portfolioData) {
      return `You are an expert AI investment advisor. Provide helpful, accurate investment advice based on modern portfolio theory and current market knowledge. Always be professional and remind users that this is for informational purposes only.`;
    }

    const { portfolioData, analysisData } = portfolioContext;
    
    return `You are an expert AI investment advisor with access to the user's portfolio data. You should provide personalized investment advice based on their specific holdings and situation.

## Current Portfolio Context:
- Total Portfolio Value: $${portfolioData.totalValue?.toLocaleString() || 'N/A'}
- Number of Assets: ${portfolioData.totalAssets || 'N/A'}
- Asset Distribution: ${Object.entries(portfolioData.assetDistribution || {}).map(([type, data]) => 
  `${type.toUpperCase()}: ${data.percentage}% ($${data.value?.toLocaleString()})`
).join(', ')}

## Risk Assessment:
- Overall Risk Level: ${analysisData?.summary?.riskLevel || 'Unknown'}
- Overall Score: ${analysisData?.summary?.overallScore || 'N/A'}/100

## Key Holdings Analysis:
${this.formatPortfolioHoldings(portfolioData)}

## Your Role:
- Provide specific, actionable investment advice based on their actual holdings
- Reference their specific assets when giving recommendations
- Consider their current allocation and risk profile
- Suggest concrete actions (buy, sell, hold, rebalance)
- Explain reasoning behind recommendations
- Keep responses concise but informative (200-400 words ideal)
- Always remind that this is for informational purposes and not professional financial advice

## Communication Style:
- Be conversational but professional
- Use bullet points for clarity when listing recommendations
- Reference specific holdings by ticker symbols when relevant
- Provide both short-term and long-term perspectives when appropriate`;
  }

  // Format portfolio holdings for context
  formatPortfolioHoldings(portfolioData) {
    if (!portfolioData?.assetsByType) return 'No holdings data available';
    
    let holdingsText = '';
    
    Object.entries(portfolioData.assetsByType).forEach(([type, data]) => {
      if (data.assets && data.assets.length > 0) {
        holdingsText += `\n${type.toUpperCase()} Holdings:\n`;
        data.assets.forEach(asset => {
          holdingsText += `- ${asset.symbol} (${asset.name}): ${asset.quantity} shares, Current: $${asset.current_price}, Return: ${asset.gainLossPercent}%\n`;
        });
      }
    });
    
    return holdingsText || 'No specific holdings data available';
  }

  // Call AI with chat context
  async generateChatResponse(sessionId, userMessage, portfolioContext) {
    try {
      console.log(`🗣️ Generating chat response for session ${sessionId.substring(0, 8)}...`);
      
      // Update session context
      if (portfolioContext) {
        this.updateSessionContext(sessionId, portfolioContext);
      }
      
      // Add user message to session
      this.addMessageToSession(sessionId, 'user', userMessage);
      
      const session = this.getSession(sessionId);
      const systemPrompt = this.generateSystemPrompt(session.portfolioContext);
      
      // Prepare messages for AI
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...session.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      const response = await axios.post(this.endpoint, {
        model: "qwen-turbo-latest",
        messages: messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const aiResponse = response.data.choices[0].message.content;
        
        // Add AI response to session
        this.addMessageToSession(sessionId, 'assistant', aiResponse);
        
        console.log('✅ Chat response generated successfully');
        
        return {
          success: true,
          response: aiResponse,
          sessionId: sessionId,
          messageCount: session.messages.length,
          usage: response.data.usage
        };
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('Chat AI Error:', error.message);
      
      // Fallback response for errors
      const fallbackResponse = this.generateFallbackResponse(userMessage, portfolioContext);
      this.addMessageToSession(sessionId, 'assistant', fallbackResponse);
      
      return {
        success: true,
        response: fallbackResponse,
        sessionId: sessionId,
        isOffline: true,
        error: error.message
      };
    }
  }

  // Generate fallback response when AI fails
  generateFallbackResponse(userMessage, portfolioContext) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('tesla') || lowerMessage.includes('tsla')) {
      return `I see you're asking about Tesla (TSLA). Based on your portfolio data, TSLA appears to be underperforming significantly. Consider reviewing this position as part of your overall risk management strategy. 

Key considerations:
• Monitor company fundamentals and news
• Consider position sizing relative to your total portfolio
• Evaluate if the investment thesis still holds

*Note: I'm currently in offline mode. For detailed analysis, please try again later when the connection is restored.*`;
    }
    
    if (lowerMessage.includes('crypto') || lowerMessage.includes('bitcoin') || lowerMessage.includes('btc')) {
      return `Regarding cryptocurrency in your portfolio: Your crypto allocation appears significant. Here are general considerations:

• Crypto can be highly volatile - consider your risk tolerance
• Diversification across asset classes typically reduces overall portfolio risk
• Regular rebalancing helps maintain target allocations

*Note: I'm currently in offline mode. For personalized crypto analysis, please try again later.*`;
    }
    
    if (lowerMessage.includes('diversif') || lowerMessage.includes('risk')) {
      return `Portfolio diversification is crucial for risk management. General principles:

• Spread investments across different asset classes
• Avoid over-concentration in any single asset
• Consider your investment timeline and risk tolerance
• Regular portfolio reviews and rebalancing are important

*Note: I'm currently in offline mode. For detailed portfolio analysis, please try again when the connection is restored.*`;
    }
    
    // Generic fallback
    return `I understand you're asking about investment strategy. While I'm currently in offline mode, here are some general principles:

• Maintain a diversified portfolio across asset classes
• Regular monitoring and rebalancing is important
• Consider your risk tolerance and investment timeline
• Stay informed about market conditions and company fundamentals

For personalized advice based on your specific portfolio, please try again when the AI service connection is restored.

*This is general information only and not personalized financial advice.*`;
  }

  // Clean up old sessions (call periodically)
  cleanupOldSessions(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.sessions.delete(sessionId);
        console.log(`🧹 Cleaned up old session ${sessionId.substring(0, 8)}`);
      }
    }
  }

  // Get session info
  getSessionInfo(sessionId) {
    const session = this.getSession(sessionId);
    return {
      sessionId: session.id,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      hasPortfolioContext: !!session.portfolioContext
    };
  }
}

module.exports = new AIChatService(); 