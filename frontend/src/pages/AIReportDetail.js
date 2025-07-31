import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Psychology as AIIcon,
  TrendingUp,
  Warning,
  CheckCircle,
  ExpandMore,
  Assessment,
  Security,
  Timeline,
  AccountBalance,
  ArrowBack,
  Download,
  Refresh,
  AccessTime,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { formatCurrency, formatPercentage } from '../services/api';

const AIReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // 🎯 获取最新Portfolio价值，与Dashboard保持一致
  const { data: currentPortfolio } = useQuery(
    'currentPortfolioValue',
    () => fetch(buildApiUrl(API_ENDPOINTS.assets.portfolio(1))).then(res => res.json()),
    {
      staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
      enabled: !!reportData, // 只有在报告数据加载完成后才获取最新价值
    }
  );

  // 🧮 计算使用的Portfolio价值（优先使用最新价值）
  const portfolioValue = currentPortfolio?.data?.totalValue || reportData?.portfolio_value || 0;

  // 🧪 测试AI解析功能
  const testAIParsing = async () => {
    try {
      const response = await fetch(buildApiUrl('/ai-analysis/test-parsing'));
      const result = await response.json();
      console.log('🧪 AI解析测试结果:', result);
      alert(`AI解析测试完成!\n填充的sections: ${result.data.statistics.populatedSections}/${result.data.statistics.totalSections}\n请查看控制台了解详细信息`);
    } catch (error) {
      console.error('❌ 测试AI解析失败:', error);
      alert('测试失败: ' + error.message);
    }
  };

  useEffect(() => {
    if (reportId) {
      fetchReportDetail();
    } else {
      setError('Report ID is required');
      setLoading(false);
    }
  }, [reportId]);

  const fetchReportDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(buildApiUrl(`/ai-analysis/report/${reportId}`));
      const result = await response.json();
      
      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error || 'Failed to fetch report details');
      }
    } catch (err) {
      setError('Network error occurred while fetching report details');
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchReportDetail();
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        gap: 2
      }}>
        <CircularProgress size={60} sx={{ color: '#E8A855' }} />
        <Typography variant="h6" color="text.secondary">
          Loading AI analysis report...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait a moment
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleRetry}
            startIcon={<Refresh />}
            sx={{
              background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
              color: '#1a1a1a',
            }}
          >
            Retry
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/app/analytics')}
            startIcon={<ArrowBack />}
          >
            Back to Analytics
          </Button>
        </Box>
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No report data available
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate('/app/analytics')}
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Analytics
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Back Button and Report Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/app/analytics')}
            sx={{ 
              color: '#E8A855',
              '&:hover': { backgroundColor: 'rgba(232, 168, 85, 0.1)' }
            }}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            AI Analysis Report #{reportId}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            sx={{ 
              borderColor: showDebugInfo ? 'success.main' : 'warning.main',
              color: showDebugInfo ? 'success.main' : 'warning.main'
            }}
          >
            {showDebugInfo ? '隐藏调试信息' : '显示调试信息'}
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={testAIParsing}
            sx={{ borderColor: 'info.main', color: 'info.main' }}
          >
            测试AI解析
          </Button>
        </Box>
      </Box>

      {/* Report Metadata */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccessTime sx={{ color: 'text.secondary' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Report Time
                </Typography>
              </Box>
              <Typography variant="body1">
                {new Date(reportData.timestamp).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccountBalance sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Portfolio Value
                </Typography>
                {currentPortfolio?.data?.totalValue && currentPortfolio.data.totalValue !== reportData?.portfolio_value && (
                  <Chip 
                    label="Latest" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formatCurrency(portfolioValue)}
              </Typography>
              {currentPortfolio?.data?.totalValue && currentPortfolio.data.totalValue !== reportData?.portfolio_value && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Report time: {formatCurrency(reportData.portfolio_value)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analysis Details */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Analysis Details
      </Typography>

      {/* Key Insights */}
      {reportData.key_insights && reportData.key_insights.length > 0 && (
        <Accordion defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#E8A855' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Key Insights
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {reportData.key_insights.map((insight, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={insight} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Recommendations */}
      {reportData.recommendations && reportData.recommendations.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment sx={{ color: '#E8A855' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recommendations
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {reportData.recommendations.map((recommendation, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <TrendingUp sx={{ color: 'primary.main', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={recommendation} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Risk Factors */}
      {reportData.risk_factors && reportData.risk_factors.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning sx={{ color: 'error.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Risk Factors
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {reportData.risk_factors.map((risk, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={risk} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Detailed AI Analysis Sections */}
      {reportData.raw_analysis_data && reportData.raw_analysis_data.analysis && (
        <>
          {/* Asset Allocation Analysis */}
          {(reportData.raw_analysis_data?.analysis?.assetAllocation || reportData.raw_analysis_data?.rawAnalysis) && (
            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalance sx={{ color: '#E8A855' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Asset Allocation Analysis
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {reportData.raw_analysis_data.analysis?.assetAllocation || 
                   (reportData.raw_analysis_data?.rawAnalysis && 
                    `⚠️ 原始AI分析（解析失败，显示完整内容）:\n\n${reportData.raw_analysis_data.rawAnalysis}`)}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Risk Assessment */}
          {reportData.raw_analysis_data.analysis.riskAssessment && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security sx={{ color: 'error.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Risk Assessment
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {reportData.raw_analysis_data.analysis.riskAssessment}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Performance Analysis */}
          {reportData.raw_analysis_data.analysis.performanceAnalysis && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment sx={{ color: 'success.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Performance Analysis
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {reportData.raw_analysis_data.analysis.performanceAnalysis}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Individual Stock Analysis */}
          {reportData.raw_analysis_data.analysis.stockAnalysis && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Timeline sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Individual Stock Analysis
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {reportData.raw_analysis_data.analysis.stockAnalysis}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Market Outlook */}
          {reportData.raw_analysis_data.analysis.marketOutlook && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp sx={{ color: 'info.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Market Outlook
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {reportData.raw_analysis_data.analysis.marketOutlook}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Optimization Recommendations */}
          {reportData.raw_analysis_data.analysis.optimizationRecommendations && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment sx={{ color: 'warning.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Optimization Recommendations
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {reportData.raw_analysis_data.analysis.optimizationRecommendations}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Investment Strategy */}
          {reportData.raw_analysis_data.analysis.investmentStrategy && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Investment Strategy
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {reportData.raw_analysis_data.analysis.investmentStrategy}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}

      {/* 🧪 调试信息区域 */}
      {showDebugInfo && reportData && (
        <Card sx={{ mt: 4, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'warning.main' }}>
              🧪 调试信息
            </Typography>
            
            {/* 原始分析数据状态 */}
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  📊 数据结构状态
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    🔍 raw_analysis_data: {reportData.raw_analysis_data ? '✅ 存在' : '❌ 缺失'}
                  </Typography>
                  {reportData.raw_analysis_data && (
                    <>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        📝 rawAnalysis: {reportData.raw_analysis_data.rawAnalysis ? '✅ 存在' : '❌ 缺失'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        🏗️ analysis: {reportData.raw_analysis_data.analysis ? '✅ 存在' : '❌ 缺失'}
                      </Typography>
                      {reportData.raw_analysis_data.analysis && (
                        <Box sx={{ ml: 2 }}>
                          {Object.keys(reportData.raw_analysis_data.analysis).map(key => (
                            <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
                              📋 {key}: {reportData.raw_analysis_data.analysis[key] ? '✅ 有内容' : '❌ 空'}
                              {reportData.raw_analysis_data.analysis[key] && 
                                ` (${reportData.raw_analysis_data.analysis[key].length} 字符)`
                              }
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* 原始AI分析内容 */}
            {reportData.raw_analysis_data?.rawAnalysis && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    📄 原始AI分析内容 ({reportData.raw_analysis_data.rawAnalysis.length} 字符)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box 
                    sx={{ 
                      maxHeight: '400px', 
                      overflow: 'auto',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      p: 2,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.4
                    }}
                  >
                    {reportData.raw_analysis_data.rawAnalysis}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/app/analytics')}
          startIcon={<AnalyticsIcon />}
        >
          View All Reports
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/app/portfolio')}
          sx={{
            background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
            color: '#1a1a1a',
          }}
        >
          Manage Portfolio
        </Button>
      </Box>
    </Box>
  );
};

export default AIReportDetail; 