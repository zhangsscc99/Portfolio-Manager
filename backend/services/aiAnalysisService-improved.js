const axios = require('axios');

class AIAnalysisService {
  constructor() {
    this.apiKey = "sk-18fcc076d5d746fea3c922d20aef7364";
    this.baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/";
    this.endpoint = `${this.baseUrl}chat/completions`;
  }

  // Generate portfolio analysis prompt in English
  generatePortfolioAnalysisPrompt(portfolioData) {
    // Extract individual stock companies for detailed analysis
    const stockAssets = [];
    if (portfolioData.assetsByType.stock && portfolioData.assetsByType.stock.assets) {
      stockAssets.push(...portfolioData.assetsByType.stock.assets);
    }

    const prompt = `
As a professional investment analyst, please conduct an in-depth analysis of the following portfolio:

## Portfolio Overview
- Total Value: ${portfolioData.totalValue}
- Number of Holdings: ${portfolioData.totalAssets} assets

## Asset Allocation Details
${Object.entries(portfolioData.assetsByType).map(([type, data]) => 
  data.count > 0 ? `
### ${this.getAssetTypeName(type)}
- Total Value: ${data.totalValue}
- Allocation: ${((data.totalValue / portfolioData.totalValue) * 100).toFixed(2)}%
- Asset List:
${data.assets.map(asset => `  - ${asset.symbol} (${asset.name}): Quantity ${asset.quantity}, Avg Cost ${asset.avg_cost}, Current Price ${asset.current_price}, Return ${asset.gainLossPercent}%`).join('\n')}
` : ''
).join('\n')}

${stockAssets.length > 0 ? `
## Individual Stock Company Analysis Required
For each of the following stock holdings, please provide detailed company-specific analysis:
${stockAssets.map(stock => `
### ${stock.symbol} - ${stock.name}
- Current Position: ${stock.quantity} shares at $${stock.current_price} each
- Portfolio Weight: ${((stock.quantity * stock.current_price / portfolioData.totalValue) * 100).toFixed(2)}%
- Current Performance: ${stock.gainLossPercent}% return

Please analyze:
- Recent company financial performance and earnings trends
- Business fundamentals and competitive position
- Recent news, developments, or major announcements
- Industry outlook and sector performance
- Management quality and strategic direction
- Valuation metrics (P/E, growth prospects)
- Technical analysis and price momentum
- Risk factors specific to this company
- Short-term and long-term investment outlook
`).join('\n')}
` : ''}

## Comprehensive Analysis Requirements
Please provide professional analysis and specific recommendations from the following dimensions:

1. **Asset Allocation Analysis**
   - Evaluate the reasonableness of current asset allocation
   - Analyze whether asset class proportions are balanced
   - Identify areas of over-concentration or under-allocation
   - Consider correlation between different asset classes

2. **Risk Assessment**
   - Analyze overall portfolio risk level
   - Identify major risk factors (market risk, sector risk, individual asset risk, etc.)
   - Evaluate portfolio diversification effectiveness
   - Assess concentration risk and single-asset exposure
   - Consider market volatility impact

3. **Performance Analysis**
   - Evaluate historical performance of assets
   - Identify high-performing and underperforming investments
   - Analyze risk-return alignment
   - Compare performance against relevant benchmarks
   - Assess portfolio efficiency and optimization potential

4. **Market Outlook & Individual Stock Analysis**
   - Based on current market environment, analyze future prospects of asset classes
   - Provide detailed analysis for each individual stock holding (see company analysis section above)
   - Identify potential investment opportunities and risk points
   - Consider macroeconomic factors impact on portfolio
   - Analyze sector rotation trends and their impact

5. **Optimization Recommendations**
   - Provide specific asset allocation adjustment recommendations
   - Recommend specific buy, sell, or rebalancing actions for individual stocks
   - Suggest position sizing adjustments
   - Recommend risk management measures
   - Consider tax implications of proposed changes

6. **Investment Strategy**
   - Based on portfolio characteristics, recommend suitable investment strategies
   - Provide short-term (3-6 months) and long-term (1-3 years) investment planning advice
   - Suggest regular adjustment and rebalancing strategies
   - Consider market timing and entry/exit strategies
   - Recommend monitoring frequency and key metrics to watch

7. **Overall Portfolio Score**
   - Based on your comprehensive analysis, provide an overall portfolio score from 0 to 100
   - Consider diversification, risk management, performance potential, and strategic alignment
   - Explain the key factors that influenced this score
   - Provide specific actions that could improve the score

## Analysis Standards
- Use current market data and recent company developments (as of your knowledge cutoff)
- Provide specific, actionable recommendations with reasoning
- Include both bullish and bearish scenarios for major holdings
- Consider multiple time horizons (short, medium, long-term)
- Address both growth and income investment objectives
- Factor in risk tolerance and diversification principles

**IMPORTANT SCORING REQUIREMENT:**
At the end of your analysis, you MUST provide a clear overall portfolio score in this exact format:
"OVERALL PORTFOLIO SCORE: [XX]/100"
Where XX is a number between 0 and 100 based on your comprehensive evaluation.

Please use professional yet understandable language, providing detailed analysis and actionable recommendations. The analysis should be objective and comprehensive, highlighting both strengths and weaknesses/risks for the overall portfolio and individual holdings.

IMPORTANT: Please respond entirely in English. All analysis content should be in English. Pay special attention to individual stock company analysis with recent business developments and financial performance.
`;
    return prompt;
  }

  getAssetTypeName(type) {
    const names = {
      stock: 'Stocks',
      crypto: 'Cryptocurrency', 
      etf: 'ETF Funds',
      bond: 'Bonds',
      cash: 'Cash',
      commodity: 'Commodities'
    };
    return names[type] || type;
  }

  // Call Aliyun AI API with retry mechanism
  async callAliyunAI(prompt, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🤖 AI analysis request (attempt ${attempt}/${retries})...`);
        console.log(`📡 Connecting to: ${this.endpoint}`);
        
        const response = await axios.post(this.endpoint, {
          model: "qwen-turbo-latest",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 3000
        }, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 100000 // Increase to 60 seconds timeout
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
          console.log('✅ AI analysis request successful');
          return {
            success: true,
            analysis: response.data.choices[0].message.content,
            usage: response.data.usage
          };
        } else {
          throw new Error('Invalid response format from AI service');
        }
      } catch (error) {
        console.error(`❌ AI analysis request failed (attempt ${attempt}/${retries}):`);
        console.error(`   Error Type: ${error.code || 'Unknown'}`);
        console.error(`   Error Message: ${error.message}`);
        if (error.response) {
          console.error(`   HTTP Status: ${error.response.status}`);
          console.error(`   Response Data:`, error.response.data);
        }
        
        // If network error and retries remaining, wait and retry
        if (attempt < retries && this.isNetworkError(error)) {
          const waitTime = attempt * 3000; // Increase wait time to 3s, 6s, 9s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
          continue;
        }
        
        // If last attempt, return offline analysis
        if (attempt === retries) {
          console.log('🔄 Using offline analysis mode...');
          return this.generateOfflineAnalysis(prompt);
        }
      }
    }
  }

  // Offline analysis (fallback when network fails)
  generateOfflineAnalysis(prompt) {
    console.log('📊 Generating offline portfolio analysis...');
    
    // Extract portfolio data from prompt for better offline analysis
    const portfolioMatch = prompt.match(/Total Value: \$?([\d,]+\.?\d*)/);
    const stockMatches = prompt.match(/### ([A-Z]+) - (.+?)\n- Current Position: ([\d.]+) shares at \$?([\d.]+) each\n- Portfolio Weight: ([\d.]+)%\n- Current Performance: ([-\d.]+)% return/g);
    
    let stockAnalysis = '';
    if (stockMatches) {
      stockAnalysis = `
## Individual Stock Analysis (Offline Mode)

${stockMatches.map(match => {
  const parts = match.match(/### ([A-Z]+) - (.+?)\n- Current Position: ([\d.]+) shares at \$?([\d.]+) each\n- Portfolio Weight: ([\d.]+)%\n- Current Performance: ([-\d.]+)% return/);
  if (parts) {
    const [, symbol, name, shares, price, weight, performance] = parts;
    return `### ${symbol} - ${name}
- Position: ${shares} shares at $${price}
- Portfolio Weight: ${weight}%
- Performance: ${performance}%

**Analysis:**
- This is a ${parseFloat(weight) > 10 ? 'significant' : 'moderate'} position in your portfolio
- Current performance of ${performance}% ${parseFloat(performance) > 0 ? 'shows positive returns' : 'indicates some challenges'}
- Consider ${parseFloat(performance) > 10 ? 'taking some profits or rebalancing' : 'monitoring for potential opportunities'}
- ${parseFloat(weight) > 15 ? 'Position size may warrant risk management attention' : 'Position sizing appears reasonable'}
`;
  }
  return '';
}).join('\n')}`;
    }
    
    const analysis = `
# Portfolio Analysis Report (Offline Mode)

${stockAnalysis}

## Asset Allocation Analysis
The current portfolio demonstrates good diversification characteristics. It is recommended to maintain a balanced allocation across stocks, cryptocurrency, and other asset classes. Based on the holdings analysis, consider:

- Regular rebalancing to maintain target allocations
- Monitoring individual stock positions for concentration risk
- Evaluating correlation between holdings during market stress

## Risk Assessment
- Overall risk level: Medium
- Recommend monitoring market volatility and individual stock performance
- Cryptocurrency allocation may contribute to higher volatility
- Individual stock positions should be evaluated for company-specific risks

## Performance Analysis
The portfolio's overall performance appears reasonable based on individual holdings. Key considerations:

- Monitor underperforming positions for potential action
- Consider profit-taking on strong performers
- Evaluate whether current allocation matches investment objectives

## Market Outlook
Under the current market environment, recommendations include:

- Maintain cautiously optimistic stance on equity markets
- Monitor macroeconomic indicators and their impact on holdings
- Consider sector rotation opportunities
- Stay informed about individual company developments

## Optimization Recommendations
1. **Position Sizing**: Review individual stock weightings for optimal balance
2. **Risk Management**: Consider adding defensive assets during volatile periods
3. **Rebalancing**: Implement regular portfolio rebalancing schedule
4. **Research**: Stay updated on individual company fundamentals and news
5. **Diversification**: Evaluate correlation between holdings

## Investment Strategy
- **Long-term Focus**: Maintain core positions in quality companies
- **Active Monitoring**: Track individual stock performance and company developments
- **Flexibility**: Be prepared to adjust positions based on changing fundamentals
- **Risk Control**: Implement stop-loss or position sizing rules as appropriate

*Note: This is an offline analysis report with limited company-specific data. For detailed individual stock analysis including recent earnings, news, and market developments, recommend obtaining online AI analysis when network connectivity is restored.*
`;

    return {
      success: true,
      analysis: analysis,
      usage: { offline: true }
    };
  }

  // Check if network error
  isNetworkError(error) {
    const networkErrors = [
      'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET',
      'timeout', 'Network Error', 'Request failed'
    ];
    return networkErrors.some(errType => error.message.includes(errType));
  }

  // Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Analyze portfolio
  async analyzePortfolio(portfolioData) {
    try {
      // Validate input data
      if (!portfolioData || !portfolioData.assetsByType) {
        throw new Error('Invalid portfolio data');
      }

      // Generate analysis prompt
      const prompt = this.generatePortfolioAnalysisPrompt(portfolioData);
      
      // Call AI service
      const aiResult = await this.callAliyunAI(prompt);
      
      if (!aiResult.success) {
        return {
          success: false,
          error: aiResult.error
        };
      }

      // Format analysis results
      const analysisReport = {
        id: `analysis_${Date.now()}`,
        timestamp: new Date().toISOString(),
        portfolioSnapshot: {
          totalValue: portfolioData.totalValue,
          totalAssets: portfolioData.totalAssets,
          assetDistribution: Object.entries(portfolioData.assetsByType).reduce((acc, [type, data]) => {
            if (data.count > 0) {
              acc[type] = {
                value: data.totalValue,
                percentage: ((data.totalValue / portfolioData.totalValue) * 100).toFixed(2),
                count: data.count
              };
            }
            return acc;
          }, {})
        },
        analysis: this.parseAnalysisContent(aiResult.analysis),
        rawAnalysis: aiResult.analysis,
        usage: aiResult.usage,
        isOffline: aiResult.usage?.offline || false
      };

      return {
        success: true,
        data: analysisReport
      };

    } catch (error) {
      console.error('Portfolio Analysis Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Parse AI analysis content into structured data
  parseAnalysisContent(content) {
    const sections = {
      assetAllocation: '',
      riskAssessment: '',
      performanceAnalysis: '',
      marketOutlook: '',
      stockAnalysis: '',
      optimizationRecommendations: '',
      investmentStrategy: '',
      overallScore: ''
    };

    // Split content into lines for better parsing
    const lines = content.split('\n');
    let currentSection = '';
    let isInSection = false;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        if (currentSection && isInSection) {
          sections[currentSection] += '\n';
        }
        return;
      }
      
      // Detect section headers
      if (this.isSectionHeader(trimmed)) {
        currentSection = this.getSectionType(trimmed);
        isInSection = true;
        return;
      }
      
      // Add content to current section
      if (currentSection && isInSection && trimmed) {
        // Skip markdown headers and numbering
        const cleanLine = trimmed.replace(/^#{1,6}\s*/, '').replace(/^\d+\.\s*\*?\*?/, '');
        if (cleanLine) {
          sections[currentSection] += cleanLine + '\n';
        }
      }
    });

    // Clean up sections - remove extra whitespace
    Object.keys(sections).forEach(key => {
      sections[key] = sections[key].trim();
    });

    return sections;
  }

  // Check if a line is a section header
  isSectionHeader(line) {
    const headerPatterns = [
      /^\d+\.\s*\*?\*?Asset Allocation/i,
      /^\d+\.\s*\*?\*?Risk Assessment/i,
      /^\d+\.\s*\*?\*?Performance Analysis/i,
      /^\d+\.\s*\*?\*?Market Outlook/i,
      /^\d+\.\s*\*?\*?Individual Stock/i,
      /^\d+\.\s*\*?\*?Stock Analysis/i,
      /^\d+\.\s*\*?\*?Optimization/i,
      /^\d+\.\s*\*?\*?Investment Strategy/i,
      /^\d+\.\s*\*?\*?Overall.*Score/i,
      /^#{1,6}\s*Asset Allocation/i,
      /^#{1,6}\s*Risk Assessment/i,
      /^#{1,6}\s*Performance Analysis/i,
      /^#{1,6}\s*Market Outlook/i,
      /^#{1,6}\s*Individual Stock/i,
      /^#{1,6}\s*Stock Analysis/i,
      /^#{1,6}\s*Optimization/i,
      /^#{1,6}\s*Investment Strategy/i,
      /^#{1,6}\s*Overall.*Score/i
    ];
    
    return headerPatterns.some(pattern => pattern.test(line));
  }

  // Get section type from header line
  getSectionType(line) {
    if (/Asset Allocation/i.test(line)) return 'assetAllocation';
    if (/Risk Assessment/i.test(line)) return 'riskAssessment';
    if (/Performance Analysis/i.test(line)) return 'performanceAnalysis';
    if (/Market Outlook/i.test(line)) return 'marketOutlook';
    if (/Individual Stock|Stock Analysis/i.test(line)) return 'stockAnalysis';
    if (/Optimization|Recommendations/i.test(line)) return 'optimizationRecommendations';
    if (/Investment Strategy/i.test(line)) return 'investmentStrategy';
    if (/Overall.*Score/i.test(line)) return 'overallScore';
    return '';
  }

  // Generate analysis summary
  generateSummary(analysisReport) {
    const summary = {
      overallScore: this.calculateOverallScore(analysisReport.portfolioSnapshot, analysisReport.rawAnalysis),
      keyInsights: this.extractKeyInsights(analysisReport.analysis),
      riskLevel: this.assessRiskLevel(analysisReport.portfolioSnapshot),
      recommendations: this.extractRecommendations(analysisReport.analysis)
    };

    return summary;
  }

  calculateOverallScore(portfolioSnapshot, rawAnalysis = '') {
    // 首先尝试从AI分析内容中提取分数
    if (rawAnalysis) {
      const scoreMatch = rawAnalysis.match(/OVERALL PORTFOLIO SCORE:\s*(\d+)\/100/i);
      if (scoreMatch) {
        const aiScore = parseInt(scoreMatch[1]);
        if (aiScore >= 0 && aiScore <= 100) {
          console.log(`✅ AI提供的Overall Score: ${aiScore}/100`);
          return aiScore;
        }
      }
    }
    
    // 如果AI没有提供分数，使用备用计算方法
    console.log('⚠️ AI未提供Overall Score，使用备用计算方法');
    const assetTypes = Object.keys(portfolioSnapshot.assetDistribution).length;
    const diversificationScore = Math.min(assetTypes * 15, 60);
    
    const percentages = Object.values(portfolioSnapshot.assetDistribution).map(a => parseFloat(a.percentage));
    const maxPercentage = Math.max(...percentages);
    const balanceScore = maxPercentage > 70 ? 20 : (maxPercentage > 50 ? 30 : 40);
    
    return Math.round(diversificationScore + balanceScore);
  }

  assessRiskLevel(portfolioSnapshot) {
    const cryptoPercentage = portfolioSnapshot.assetDistribution.crypto?.percentage || 0;
    const stockPercentage = portfolioSnapshot.assetDistribution.stock?.percentage || 0;
    
    const totalRiskyAssets = parseFloat(cryptoPercentage) + parseFloat(stockPercentage);
    
    if (totalRiskyAssets > 80) return 'High';
    if (totalRiskyAssets > 50) return 'Medium-High';
    if (totalRiskyAssets > 30) return 'Medium';
    return 'Low-Medium';
  }

  extractKeyInsights(analysis) {
    const insights = [];
    
    if (analysis.assetAllocation.includes('diversif') || analysis.assetAllocation.includes('balance')) {
      insights.push('Portfolio demonstrates good diversification');
    }
    
    if (analysis.riskAssessment.includes('risk') || analysis.riskAssessment.includes('volatil')) {
      insights.push('Monitor risk levels and volatility');
    }
    
    if (analysis.optimizationRecommendations.includes('recommend') || analysis.optimizationRecommendations.includes('suggest')) {
      insights.push('Optimization opportunities identified');
    }
    
    return insights.length > 0 ? insights : ['Portfolio analysis completed, please review detailed report'];
  }

  extractRecommendations(analysis) {
    const recommendations = [];
    
    const suggestions = analysis.optimizationRecommendations.split('\n').filter(line => 
      line.trim() && (line.includes('-') || line.includes('•') || line.includes('recommend'))
    );
    
    return suggestions.slice(0, 5).map(s => s.trim().replace(/^[-•]\s*/, '')) || [
      'Review portfolio regularly',
      'Maintain appropriate asset allocation',
      'Monitor market trends'
    ];
  }
}

module.exports = new AIAnalysisService(); 