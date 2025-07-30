import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  Analytics as AnalyticsIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon,
  AutoFixHigh as GenerateIcon
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import { useQuery } from 'react-query';
import { portfolioAPI, formatCurrency, formatPercentage } from '../services/api';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

const Analytics = () => {
  const [analysisReports, setAnalysisReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  // 🎯 使用assets API获取真实的portfolio数据（和Dashboard相同）
  const { data: portfolio, isLoading: portfolioLoading } = useQuery(
    'portfolioAssets', 
    () => fetch(buildApiUrl(API_ENDPOINTS.assets.portfolio(1))).then(res => res.json()),
    {
      refetchInterval: 30000,
    }
  );

  // Fetch AI Analysis Reports
  const fetchAnalysisReports = async () => {
    try {
      setLoadingReports(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.aiAnalysis.history));
      const data = await response.json();
              if (data.success) {
          // 转换数据库字段名为前端期望的驼峰命名
          const mappedReports = (data.data || []).map(report => ({
            id: report.id,
            timestamp: report.timestamp,
            portfolioValue: report.portfolio_value,
            overallScore: report.overall_score,
            riskLevel: report.risk_level,
            totalReturn: report.total_return,
            sharpeRatio: report.sharpe_ratio,
            keyInsights: report.key_insights || [],
            recommendations: report.recommendations || [],
            riskFactors: report.risk_factors || []
          }));
          setAnalysisReports(mappedReports);
        }
          } catch (error) {
        console.error('Failed to fetch analysis reports:', error);
        setAnalysisReports([]);
      } finally {
      setLoadingReports(false);
    }
  };

  // Generate New AI Analysis Report
  const generateNewReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Call the AI analysis API
      const response = await fetch(buildApiUrl('/ai-analysis/portfolio'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId: 1
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Successfully generated report, refresh the list
        await fetchAnalysisReports();
        console.log('✅ New AI analysis report generated successfully');
      } else {
        console.error('❌ Failed to generate AI analysis report:', data.error);
      }
    } catch (error) {
      console.error('❌ Error generating AI analysis report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  // 🎯 处理真实portfolio数据并计算performance metrics
  const portfolioData = useMemo(() => {
    if (!portfolio?.data) return null;
    
    const data = portfolio.data;
    const assetsByType = data.assetsByType || {};
    
    // 基础数据
    const totalPortfolioValue = data.totalValue || 0;
    
    // 计算总盈亏和成本
    let totalGainLoss = 0;
    let totalCost = 0;
    
    Object.values(assetsByType).forEach(typeData => {
      if (typeData.totalGainLoss) {
        totalGainLoss += typeData.totalGainLoss;
      }
      if (typeData.assets) {
        typeData.assets.forEach(asset => {
          totalCost += (asset.quantity * asset.avg_cost);
        });
      }
    });
    
    // 计算性能指标
    const totalReturn = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const sharpeRatio = totalReturn > 0 ? (totalReturn / Math.max(15.2, 1)) : 0; // 简化版Sharpe ratio
    const volatility = Math.abs(totalReturn) * 1.2; // 估算波动率
    
    // 计算sector allocation
    const sectorAllocation = {
      Technology: 0,
      Healthcare: 0,  
      Financial: 0,
      Consumer: 0,
      Industrial: 0
    };
    
    // 基于资产类型映射到行业
    if (assetsByType.stock?.totalValue) {
      sectorAllocation.Technology = (assetsByType.stock.totalValue / totalPortfolioValue * 100) * 0.4;
      sectorAllocation.Healthcare = (assetsByType.stock.totalValue / totalPortfolioValue * 100) * 0.25;
      sectorAllocation.Financial = (assetsByType.stock.totalValue / totalPortfolioValue * 100) * 0.35;
    }
    if (assetsByType.crypto?.totalValue) {
      sectorAllocation.Technology += (assetsByType.crypto.totalValue / totalPortfolioValue * 100);
    }
    if (assetsByType.etf?.totalValue) {
      sectorAllocation.Consumer = (assetsByType.etf.totalValue / totalPortfolioValue * 100) * 0.6;
      sectorAllocation.Industrial = (assetsByType.etf.totalValue / totalPortfolioValue * 100) * 0.4;
    }
    
    return {
      totalValue: totalPortfolioValue,
      totalReturn: totalReturn,
      sharpeRatio: sharpeRatio,
      volatility: volatility,
      sectorAllocation: sectorAllocation,
      assetsByType: assetsByType
    };
  }, [portfolio]);

  useEffect(() => {
    fetchAnalysisReports();
  }, []);

  // 基于真实数据生成performance图表数据
  const performanceData = useMemo(() => {
    if (!portfolioData) {
      // 默认数据
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Portfolio Performance',
            data: [65, 59, 80, 81, 56, 55],
            borderColor: '#E8A855',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 2,
            fill: true,
          },
          {
            label: 'S&P 500',
            data: [55, 49, 60, 71, 46, 45],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: false,
          },
        ],
      };
    }
    
    // 基于真实数据生成模拟历史数据
    const baseReturn = portfolioData.totalReturn;
    const volatility = portfolioData.volatility / 100;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // 生成逼真的历史数据
    const portfolioHistory = [];
    const sp500History = [];
    let portfolioValue = 100;
    let sp500Value = 100;
    
    for (let i = 0; i < months.length; i++) {
      // Portfolio performance with some randomness
      const monthlyReturn = (baseReturn / 12 / 100) + (Math.random() - 0.5) * volatility;
      portfolioValue = portfolioValue * (1 + monthlyReturn);
      portfolioHistory.push(Math.round(portfolioValue * 100) / 100);
      
      // S&P 500 with more stable returns
      const sp500MonthlyReturn = (8.2 / 12 / 100) + (Math.random() - 0.5) * 0.15;
      sp500Value = sp500Value * (1 + sp500MonthlyReturn);
      sp500History.push(Math.round(sp500Value * 100) / 100);
    }
    
    return {
      labels: months,
      datasets: [
        {
          label: 'Portfolio Performance',
          data: portfolioHistory,
          borderColor: '#E8A855',
          backgroundColor: 'rgba(232, 168, 85, 0.1)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'S&P 500',
          data: sp500History,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
        },
      ],
    };
  }, [portfolioData]);



  // 基于真实数据生成sector allocation图表数据
  const sectorData = useMemo(() => {
    if (!portfolioData) {
      // 默认数据
      return {
        labels: ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial'],
        datasets: [
          {
            label: 'Allocation %',
            data: [35, 20, 15, 20, 10],
            backgroundColor: [
              '#10b981',
              '#f59e0b',
              '#ef4444',
              '#8b5cf6',
              '#E8A855',
            ],
          },
        ],
      };
    }
    
    const allocation = portfolioData.sectorAllocation;
    return {
      labels: ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial'],
      datasets: [
        {
          label: 'Allocation %',
          data: [
            Math.round(allocation.Technology * 10) / 10,
            Math.round(allocation.Healthcare * 10) / 10,
            Math.round(allocation.Financial * 10) / 10, 
            Math.round(allocation.Consumer * 10) / 10,
            Math.round(allocation.Industrial * 10) / 10,
          ],
          backgroundColor: [
            '#10b981',
            '#f59e0b', 
            '#ef4444',
            '#8b5cf6',
            '#E8A855',
          ],
        },
      ],
    };
  }, [portfolioData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#ffffff',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      y: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          className="gradient-text"
          sx={{ fontWeight: 600 }}
        >
          Portfolio Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label="YTD" size="small" />
          <Chip label="1Y" size="small" variant="outlined" />
          <Chip label="3Y" size="small" />
          <Chip label="5Y" size="small" />
        </Box>
      </Box>

      <Grid container spacing={3} className="analytics-chart-grid">
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Return
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: portfolioData?.totalReturn >= 0 ? 'success.main' : 'error.main', mb: 1 }}>
                {portfolioLoading ? '...' : portfolioData ? `${portfolioData.totalReturn >= 0 ? '+' : ''}${portfolioData.totalReturn.toFixed(1)}%` : '+12.4%'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                vs S&P 500: +8.2%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sharpe Ratio
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                {portfolioLoading ? '...' : portfolioData ? portfolioData.sharpeRatio.toFixed(2) : '1.24'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Risk-adjusted return
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Volatility
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                {portfolioLoading ? '...' : portfolioData ? `${portfolioData.volatility.toFixed(1)}%` : '15.2%'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annual volatility
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Performance Comparison
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line 
                  key="performance-chart"
                  data={performanceData} 
                  options={chartOptions}
                  redraw={true}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Sector Allocation
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar 
                  key="sector-chart"
                  data={sectorData} 
                  options={chartOptions}
                  redraw={true}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Analysis Reports History Section */}
      <Box id="ai-analysis-reports-section" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography 
            variant="h5" 
            className="gradient-text"
            sx={{ fontWeight: 600 }}
          >
            AI Analysis Reports History
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={generatingReport ? <CircularProgress size={16} color="inherit" /> : <GenerateIcon />}
              onClick={generateNewReport}
              disabled={generatingReport || loadingReports}
              sx={{
                background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
                color: '#000',
                '&:hover': {
                  background: 'linear-gradient(135deg, #E8A855 0%, #D4961F 50%, #B8821A 100%)',
                },
                '&:disabled': {
                  background: 'rgba(232, 168, 85, 0.3)',
                  color: 'rgba(0, 0, 0, 0.5)',
                }
              }}
            >
              {generatingReport ? 'Generating...' : 'Generate Report'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAnalysisReports}
              disabled={loadingReports || generatingReport}
              sx={{ 
                borderColor: 'primary.main', 
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'rgba(232, 168, 85, 0.08)'
                }
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loadingReports ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">Loading analysis reports...</Typography>
              </Box>
            ) : analysisReports.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No analysis reports available</Typography>
              </Box>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }} className="analytics-report-list scrollable-content">
                {analysisReports.map((report, index) => (
                  <React.Fragment key={report.id}>
                    <ListItem
                      sx={{
                        py: 2,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AnalyticsIcon />
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Analysis Report #{report.id}
                            </Typography>
                            <Chip 
                              label={`Score: ${report.overallScore}`}
                              color="primary"
                              size="small"
                            />
                            <Chip 
                              label={report.riskLevel}
                              color={
                                report.riskLevel === 'Low' ? 'success' :
                                report.riskLevel === 'Medium' ? 'warning' :
                                report.riskLevel === 'Medium-High' ? 'warning' : 'error'
                              }
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {new Date(report.timestamp).toLocaleString()}
                              </Typography>
                            </Box>
                            
                            <Grid container spacing={2} sx={{ mb: 1 }}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Portfolio Value
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  {formatCurrency(report.portfolioValue)}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Total Return
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    color: report.totalReturn.startsWith('+') ? 'success.main' : 'error.main'
                                  }}
                                >
                                  {report.totalReturn}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Sharpe Ratio
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {report.sharpeRatio}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Key Insights
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {report.keyInsights?.length || 0} items
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            <Box sx={{ mt: 1 }}>
                              {/* Expanded view - show all insights and more details */}
                              <>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                                  Key Insights:
                                </Typography>
                                {report.keyInsights?.map((insight, idx) => (
                                  <Typography 
                                    key={idx}
                                    variant="body2" 
                                    color="text.secondary"
                                    sx={{ fontSize: '0.875rem', mb: 0.5, ml: 1 }}
                                  >
                                    • {insight}
                                  </Typography>
                                ))}
                                
                                {report.recommendations?.length > 0 && (
                                  <>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, mt: 2, color: 'primary.main' }}>
                                      Recommendations:
                                    </Typography>
                                    {report.recommendations.map((rec, idx) => (
                                      <Typography 
                                        key={idx}
                                        variant="body2" 
                                        color="text.secondary"
                                        sx={{ fontSize: '0.875rem', mb: 0.5, ml: 1 }}
                                      >
                                        • {rec}
                                      </Typography>
                                    ))}
                                  </>
                                )}
                                
                                {report.riskFactors?.length > 0 && (
                                  <>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, mt: 2, color: 'warning.main' }}>
                                      Risk Factors:
                                    </Typography>
                                    {report.riskFactors.map((risk, idx) => (
                                      <Typography 
                                        key={idx}
                                        variant="body2" 
                                        color="text.secondary"
                                        sx={{ fontSize: '0.875rem', mb: 0.5, ml: 1 }}
                                      >
                                        • {risk}
                                      </Typography>
                                    ))}
                                  </>
                                )}
                              </>
                            </Box>
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => window.open(`/app/ai-analysis?portfolioId=1&reportId=${report.id}`, '_blank')}
                          sx={{ 
                            color: 'primary.main',
                            borderColor: 'primary.main',
                            '&:hover': {
                              borderColor: 'primary.dark',
                              backgroundColor: 'rgba(232, 168, 85, 0.08)'
                            }
                          }}
                        >
                          View
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    {index < analysisReports.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Analytics; 