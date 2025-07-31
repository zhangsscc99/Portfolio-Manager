const axios = require('axios');
const chatDatabaseService = require('./chatDatabaseService');

class AIChatService {
  constructor() {
    this.apiKey = "sk-18fcc076d5d746fea3c922d20aef7364";
    this.baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/";
    this.endpoint = `${this.baseUrl}chat/completions`;
    
    // In-memory session storage (in production, use Redis or database)
    this.sessions = new Map();
    // Portfolio-based session mapping for persistent memory
    this.portfolioSessions = new Map();
  }

  // Get or create chat session based on portfolio ID for persistent memory
  async getSession(sessionId, portfolioId = null) {
    // If portfolioId is provided, use it for persistent session
    if (portfolioId) {
      const persistentSessionId = `portfolio_${portfolioId}`;
      
      // First try to load from database
      const dbResult = await chatDatabaseService.loadSession(persistentSessionId);
      
      // Check if portfolio already has a session in memory
      if (this.portfolioSessions.has(portfolioId)) {
        const existingSessionId = this.portfolioSessions.get(portfolioId);
        if (this.sessions.has(existingSessionId)) {
          const session = this.sessions.get(existingSessionId);
          session.lastActivity = new Date();
          return session;
        }
      }
      
      let session;
      
      // If session exists in database, restore it
      if (dbResult.success) {
        console.log(`📚 Restored session from database: ${persistentSessionId}`);
        session = {
          id: dbResult.session.id,
          portfolioId: dbResult.session.portfolioId,
          messages: dbResult.session.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            isSystemUpdate: msg.isSystemUpdate
          })),
          portfolioContext: dbResult.session.portfolioContext,
          createdAt: new Date(dbResult.session.createdAt),
          lastActivity: new Date(),
          isPersistent: true
        };
      } else {
        // Create new portfolio-based session
        session = {
          id: persistentSessionId,
          portfolioId: portfolioId,
          messages: [],
          portfolioContext: null,
          createdAt: new Date(),
          lastActivity: new Date(),
          isPersistent: true
        };
        console.log(`📝 Created new persistent session for portfolio ${portfolioId}`);
      }
      
      this.sessions.set(persistentSessionId, session);
      this.portfolioSessions.set(portfolioId, persistentSessionId);
      
      return session;
    }
    
    // Fallback to old behavior for sessionId-based sessions
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        messages: [],
        portfolioContext: null,
        createdAt: new Date(),
        lastActivity: new Date(),
        isPersistent: false
      });
    }
    return this.sessions.get(sessionId);
  }

  // Update session context with portfolio data
  async updateSessionContext(sessionId, portfolioContext, portfolioId = null) {
    const session = await this.getSession(sessionId, portfolioId);
    session.portfolioContext = portfolioContext;
    session.lastActivity = new Date();
    
    // Save to database if persistent
    if (session.isPersistent && portfolioId) {
      await chatDatabaseService.saveSession(
        session.id, 
        portfolioId, 
        portfolioContext, 
        true
      );
    }
  }

  // Add message to session history
  async addMessageToSession(sessionId, role, content, portfolioId = null) {
    const session = await this.getSession(sessionId, portfolioId);
    const message = {
      role,
      content,
      timestamp: new Date(),
      isSystemUpdate: role === 'system'
    };
    
    session.messages.push(message);
    session.lastActivity = new Date();
    
    // Keep more messages for persistent sessions
    const maxMessages = session.isPersistent ? 50 : 20;
    if (session.messages.length > maxMessages) {
      session.messages = session.messages.slice(-maxMessages);
    }
    
    // Save to database if persistent
    if (session.isPersistent) {
      await chatDatabaseService.saveMessage(
        session.id, 
        role, 
        content, 
        role === 'system'
      );
    }
  }

  // Generate system prompt with portfolio context
  generateSystemPrompt(portfolioContext, requestFollowUpQuestions = false) {
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
- Last Analysis: ${analysisData?.analysisTimestamp ? new Date(analysisData.analysisTimestamp).toLocaleDateString() : 'N/A'}

## Key Holdings Analysis:
${this.formatPortfolioHoldings(portfolioData)}

${analysisData?.keyInsights?.length > 0 ? `
## Recent AI Analysis Insights:
${analysisData.keyInsights.map(insight => `- ${insight}`).join('\n')}
` : ''}

${analysisData?.recommendations?.length > 0 ? `
## AI-Generated Recommendations:
${analysisData.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

${analysisData?.riskFactors?.length > 0 ? `
## Identified Risk Factors:
${analysisData.riskFactors.map(risk => `- ${risk}`).join('\n')}
` : ''}

${Object.keys(analysisData?.stockAnalysis || {}).length > 0 ? `
## Individual Stock Analysis Available:
You have detailed analysis available for: ${Object.keys(analysisData.stockAnalysis).join(', ')}
Reference this analysis when discussing these specific stocks.
` : ''}

## Your Role:
- Provide specific, actionable investment advice based on their actual holdings
- Reference their specific assets when giving recommendations
- **Leverage recent AI analysis insights and recommendations when available**
- **Reference individual stock analysis for company-specific questions**
- Consider their current allocation and risk profile
- Suggest concrete actions (buy, sell, hold, rebalance)
- **Build upon previous analysis and maintain conversation continuity**
- Explain reasoning behind recommendations using both real-time market knowledge and stored analysis
- Keep responses concise but informative (200-400 words ideal)
- Always remind that this is for informational purposes and not professional financial advice

## Communication Style:
- Be conversational but professional
- Use bullet points for clarity when listing recommendations
- Reference specific holdings by ticker symbols when relevant
- Provide both short-term and long-term perspectives when appropriate

${requestFollowUpQuestions ? `
## Follow-up Questions Generation:
After providing your main response, generate 3 relevant follow-up questions based on:
- The user's specific portfolio holdings and question
- Natural conversation flow and investment topics
- Current market conditions and portfolio optimization opportunities

Format your complete response like this:
[Your main investment advice response here]

---FOLLOW_UP_QUESTIONS---
1. [First follow-up question]
2. [Second follow-up question]  
3. [Third follow-up question]

Example follow-up questions:
- "Should I consider taking profits on [specific stock name]?"
- "How should I rebalance my portfolio for the upcoming earnings season?"
- "What's your take on the recent [sector/market] developments affecting my holdings?"

Make questions specific to their holdings when possible, and ensure they encourage further productive investment discussion.
` : ''}`;
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
  async generateChatResponse(sessionId, userMessage, portfolioContext, portfolioId = null, requestFollowUpQuestions = false, conversationHistory = []) {
    try {
      console.log(`🗣️ Generating chat response for session ${sessionId.substring(0, 8)}...`);
      
      // Update session context
      if (portfolioContext) {
        await this.updateSessionContext(sessionId, portfolioContext, portfolioId);
      }
      
      // Add user message to session
      await this.addMessageToSession(sessionId, 'user', userMessage, portfolioId);
      
      const session = await this.getSession(sessionId, portfolioId);
      const systemPrompt = this.generateSystemPrompt(session.portfolioContext, requestFollowUpQuestions);
      
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
        
        // Parse response if follow-up questions were requested
        let mainResponse = aiResponse;
        let followUpQuestions = [];
        
        if (requestFollowUpQuestions) {
          const parsed = this.parseResponseWithQuestions(aiResponse);
          mainResponse = parsed.response;
          followUpQuestions = parsed.questions;
        }
        
        // Add AI response to session (store only the main response, not questions)
        await this.addMessageToSession(sessionId, 'assistant', mainResponse, portfolioId);
        
        console.log('✅ Chat response generated successfully');
        if (followUpQuestions.length > 0) {
          console.log(`📝 Extracted ${followUpQuestions.length} follow-up questions`);
        }
        
        return {
          success: true,
          response: mainResponse,
          sessionId: session.id, // Use actual session ID (might be portfolio-based)
          messageCount: session.messages.length,
          usage: response.data.usage,
          followUpQuestions: followUpQuestions
        };
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('Chat AI Error:', error.message);
      
      // Fallback response for errors
      const fallbackResponse = this.generateFallbackResponse(userMessage, portfolioContext);
      await this.addMessageToSession(sessionId, 'assistant', fallbackResponse, portfolioId);
      
      const session = await this.getSession(sessionId, portfolioId);
      
      return {
        success: true,
        response: fallbackResponse,
        sessionId: session.id,
        isOffline: true,
        error: error.message
      };
    }
  }

  // Update all sessions for a portfolio when new analysis is generated
  updatePortfolioMemory(portfolioId, newPortfolioContext) {
    console.log(`🔄 Updating memory for portfolio ${portfolioId} with new analysis...`);
    
    // Get the persistent session for this portfolio
    if (this.portfolioSessions.has(portfolioId)) {
      const sessionId = this.portfolioSessions.get(portfolioId);
      if (this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId);
        
        // Update context with new analysis data
        session.portfolioContext = newPortfolioContext;
        session.lastActivity = new Date();
        
        // Add system message about new analysis
        session.messages.push({
          role: 'system',
          content: `[System Update] New portfolio analysis has been generated. Updated context with latest data and insights.`,
          timestamp: new Date(),
          isSystemUpdate: true
        });
        
        console.log(`✅ Updated memory for portfolio ${portfolioId}, session has ${session.messages.length} messages`);
        return true;
      }
    }
    
    console.log(`⚠️ No existing session found for portfolio ${portfolioId}`);
    return false;
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
    // Check if this is a portfolio-based session ID
    const portfolioIdMatch = sessionId.match(/^portfolio_(\d+)$/);
    let session;
    
    if (portfolioIdMatch) {
      const portfolioId = portfolioIdMatch[1];
      if (this.portfolioSessions.has(portfolioId)) {
        const realSessionId = this.portfolioSessions.get(portfolioId);
        session = this.sessions.get(realSessionId);
      }
    } else {
      session = this.sessions.get(sessionId);
    }
    
    if (!session) {
      return {
        sessionId: sessionId,
        messageCount: 0,
        createdAt: null,
        lastActivity: null,
        hasPortfolioContext: false,
        found: false
      };
    }
    
    return {
      sessionId: session.id,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      hasPortfolioContext: !!session.portfolioContext,
      isPersistent: session.isPersistent || false,
      portfolioId: session.portfolioId || null,
      found: true
    };
  }

  // Parse AI response to extract main response and follow-up questions
  parseResponseWithQuestions(aiResponse) {
    const separator = '---FOLLOW_UP_QUESTIONS---';
    
    if (!aiResponse.includes(separator)) {
      return {
        response: aiResponse,
        questions: []
      };
    }
    
    const parts = aiResponse.split(separator);
    const mainResponse = parts[0].trim();
    const questionsSection = parts[1] ? parts[1].trim() : '';
    
    // Extract questions from the questions section
    const questions = [];
    if (questionsSection) {
      const lines = questionsSection.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Match patterns like "1. Question text" or "- Question text"
        const questionMatch = trimmedLine.match(/^(?:\d+\.\s*|\-\s*|•\s*)(.+)$/);
        if (questionMatch && questionMatch[1]) {
          const question = questionMatch[1].trim();
          if (question.length > 10) { // Filter out very short lines
            questions.push(question);
          }
        }
      }
    }
    
    return {
      response: mainResponse,
      questions: questions.slice(0, 3) // Limit to 3 questions
    };
  }
}

module.exports = new AIChatService(); 