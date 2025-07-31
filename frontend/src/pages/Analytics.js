import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
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
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Analytics as AnalyticsIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon,
  AutoFixHigh as GenerateIcon,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import {
  formatCurrency,
  formatPercentage,
  getChangeColor,
} from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // 📊 AI分析相关状态
  const [analysisReports, setAnalysisReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

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
      
      console.log('🤖 Generating new AI analysis report...');
      
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
        console.log('✅ New AI analysis report generated successfully');
        console.log('📊 Report ID:', data.data.reportId);
        
        // Successfully generated report, refresh the list
        await fetchAnalysisReports();
        
        // Navigate to the new report detail page
        if (data.data.reportId) {
          console.log(`🔄 Navigating to report ${data.data.reportId}...`);
          navigate(`/app/ai-report/${data.data.reportId}`);
        } else {
          console.warn('⚠️ Report generated but no reportId returned');
        }
      } else {
        console.error('❌ Failed to generate AI analysis:', data.error);
        // Still refresh the list in case report was created but response was incomplete
        await fetchAnalysisReports();
      }
    } catch (error) {
      console.error('❌ Error generating AI analysis:', error);
      // Refresh the list to show any reports that might have been created
      await fetchAnalysisReports();
    } finally {
      setGeneratingReport(false);
    }
  };

  // View AI Analysis Report - Navigate to report detail page
  const viewReport = (reportId) => {
    navigate(`/app/ai-report/${reportId}`);
  };

  useEffect(() => {
    fetchAnalysisReports();
  }, []);

  // 渲染AI分析报告列表
  const renderAnalysisReports = () => {
    if (loadingReports) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (analysisReports.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No analysis reports available. Generate your first report!
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {analysisReports.map((report, index) => (
          <React.Fragment key={report.id}>
            <ListItem sx={{ py: 2 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AnalyticsIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Analysis Report #{report.id}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {new Date(report.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Portfolio Value: {report.portfolioValue ? `$${Number(report.portfolioValue).toLocaleString()}` : 'N/A'}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="view"
                  onClick={() => viewReport(report.id)}
                  sx={{ mr: 1 }}
                >
                  <ViewIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            {index < analysisReports.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* 页面标题 */}
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Portfolio Analytics
      </Typography>

      {/* AI分析部分 */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Analysis Reports
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchAnalysisReports}
                    disabled={loadingReports}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<GenerateIcon />}
                    onClick={generateNewReport}
                    disabled={generatingReport}
                    sx={{ ml: 1 }}
                  >
                    {generatingReport ? 'Generating...' : 'Generate Report'}
                  </Button>
                </Box>
              </Box>
              
              {renderAnalysisReports()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics; 