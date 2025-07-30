import React, { useRef, useEffect, useState } from 'react';
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
  IconButton
} from '@mui/material';
import { 
  Analytics as AnalyticsIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import { useQuery } from 'react-query';
import { portfolioAPI, formatCurrency, formatPercentage } from '../services/api';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

const Analytics = () => {
  const [analysisReports, setAnalysisReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const { data: portfolio, isLoading } = useQuery(
    'currentPortfolio',
    portfolioAPI.getCurrentPortfolio
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
            keyInsights: report.key_insights || []
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

  useEffect(() => {
    fetchAnalysisReports();
  }, []);

  // Removed loading animation

  // Mock performance data
  const performanceData = {
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

  const sectorData = {
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
          '#E8A855', // 金色 - Stocks 
          '#F4BE7E', // 浅金色 - ETFs
          '#D4961F',
        ],
      },
    ],
  };

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
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                +12.4%
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
                1.24
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
                15.2%
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
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography 
            variant="h5" 
            className="gradient-text"
            sx={{ fontWeight: 600 }}
          >
            AI Analysis Reports History
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAnalysisReports}
            disabled={loadingReports}
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
                              {report.keyInsights?.slice(0, 2).map((insight, idx) => (
                                <Typography 
                                  key={idx}
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ fontSize: '0.875rem', mb: 0.5 }}
                                >
                                  • {insight}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => window.open(`/app/ai-analysis?portfolioId=1&reportId=${report.id}`, '_blank')}
                          sx={{ color: 'primary.main' }}
                        >
                          <ViewIcon />
                        </IconButton>
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