const axios = require('axios');
const crypto = require('crypto');

class AIAnalysisService {
  constructor() {
    this.apiKey = "";
    this.baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/";
    this.endpoint = `${this.baseUrl}chat/completions`;
  }

  // Generate portfolio analysis prompt in English
  generatePortfolioAnalysisPrompt(portfolioData) {
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

## Analysis Requirements
Please provide professional analysis and specific recommendations from the following dimensions:

1. **Asset Allocation Analysis**
   - Evaluate the reasonableness of current asset allocation
   - Analyze whether asset class proportions are balanced
   - Identify areas of over-concentration or under-allocation

2. **Risk Assessment**
   - Analyze overall portfolio risk level
   - Identify major risk factors (market risk, sector risk, individual asset risk, etc.)
   - Evaluate portfolio diversification

3. **Performance Analysis**
   - Evaluate historical performance of assets
   - Identify high-performing and underperforming investments
   - Analyze risk-return alignment

4. **Market Outlook**
   - Based on current market environment, analyze future prospects of asset classes
   - Identify potential investment opportunities and risk points
   - Consider macroeconomic factors impact on portfolio

5. **Optimization Recommendations**
   - Provide specific asset allocation adjustment recommendations
   - Recommend specific buy, sell, or rebalancing actions
   - Suggest risk management measures

6. **Investment Strategy**
   - Based on portfolio characteristics, recommend suitable investment strategies
   - Provide short-term and long-term investment planning advice
   - Suggest regular adjustment and rebalancing strategies

Please use professional yet understandable language, providing detailed analysis and actionable recommendations. The analysis should be objective and comprehensive, highlighting both strengths and weaknesses/risks.

IMPORTANT: Please respond entirely in English. All analysis content should be in English.
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

  // Call Aliyun AI API (OpenAI compatible mode)
  async callAliyunAI(prompt) {
    try {
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
        }
      });

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return {
          success: true,
          analysis: response.data.choices[0].message.content,
          usage: response.data.usage
        };
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('AI Analysis Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
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
        usage: aiResult.usage
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
      optimizationSuggestions: '',
      investmentStrategy: ''
    };

    // Simple content segmentation
    const lines = content.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('Asset Allocation') || trimmed.includes('Allocation Analysis')) {
        currentSection = 'assetAllocation';
      } else if (trimmed.includes('Risk Assessment') || trimmed.includes('Risk')) {
        currentSection = 'riskAssessment';
      } else if (trimmed.includes('Performance Analysis') || trimmed.includes('Performance')) {
        currentSection = 'performanceAnalysis';
      } else if (trimmed.includes('Market Outlook') || trimmed.includes('Outlook')) {
        currentSection = 'marketOutlook';
      } else if (trimmed.includes('Optimization') || trimmed.includes('Recommendations')) {
        currentSection = 'optimizationSuggestions';
      } else if (trimmed.includes('Investment Strategy') || trimmed.includes('Strategy')) {
        currentSection = 'investmentStrategy';
      } else if (currentSection && trimmed) {
        sections[currentSection] += trimmed + '\n';
      }
    });

    return sections;
  }

  // Generate analysis summary
  generateSummary(analysisReport) {
    const summary = {
      overallScore: this.calculateOverallScore(analysisReport.portfolioSnapshot),
      keyInsights: this.extractKeyInsights(analysisReport.analysis),
      riskLevel: this.assessRiskLevel(analysisReport.portfolioSnapshot),
      recommendations: this.extractRecommendations(analysisReport.analysis)
    };

    return summary;
  }

  calculateOverallScore(portfolioSnapshot) {
    // Simple scoring algorithm based on diversification
    const assetTypes = Object.keys(portfolioSnapshot.assetDistribution).length;
    const diversificationScore = Math.min(assetTypes * 15, 60); // Max 60 points
    
    // Based on allocation balance
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
    // Extract key insights (simplified version)
    const insights = [];
    
    if (analysis.assetAllocation.includes('diversif') || analysis.assetAllocation.includes('balance')) {
      insights.push('Portfolio demonstrates good diversification');
    }
    
    if (analysis.riskAssessment.includes('risk') || analysis.riskAssessment.includes('volatil')) {
      insights.push('Monitor risk levels and volatility');
    }
    
    if (analysis.optimizationSuggestions.includes('recommend') || analysis.optimizationSuggestions.includes('suggest')) {
      insights.push('Optimization opportunities identified');
    }
    
    return insights.length > 0 ? insights : ['Portfolio analysis completed, please review detailed report'];
  }

  extractRecommendations(analysis) {
    // Extract recommendations (simplified version)
    const recommendations = [];
    
    const suggestions = analysis.optimizationSuggestions.split('\n').filter(line => 
      line.trim() && (line.includes('-') || line.includes('•') || line.includes('recommend'))
    );
    
    return suggestions.slice(0, 5).map(s => s.trim().replace(/^[-•]\s*/, ''));
  }
}

module.exports = new AIAnalysisService(); 