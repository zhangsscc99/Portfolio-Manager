import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Share,
  Refresh,
  WifiOff,
  CloudOff,
  Chat as ChatIcon
} from '@mui/icons-material';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import AIAssistantDialog from '../components/AIAssistantDialog';

const AIAnalysis = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const portfolioId = searchParams.get('portfolioId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    if (portfolioId) {
      fetchAnalysis();
    } else {
      setError('Portfolio ID is required');
      setLoading(false);
    }
  }, [portfolioId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(buildApiUrl(API_ENDPOINTS.aiAnalysis.portfolio(portfolioId)));
      const result = await response.json();
      
      if (result.success) {
        setAnalysisData(result.data);
        setIsOfflineMode(result.data.isOffline || false);
      } else {
        setError(result.error || 'Failed to generate analysis');
      }
    } catch (err) {
      setError('Network error occurred while fetching analysis');
      console.error('Analysis fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchAnalysis();
  };

  const handleOpenAssistant = () => {
    setAssistantOpen(true);
  };

  const handleCloseAssistant = () => {
    setAssistantOpen(false);
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High': return '#f44336';
      case 'Medium-High': return '#ff9800';
      case 'Medium': return '#ffc107';
      case 'Low-Medium': return '#8bc34a';
      case 'Low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#8bc34a';
    if (score >= 40) return '#ffc107';
    if (score >= 20) return '#ff9800';
    return '#f44336';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
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
          AI is analyzing your portfolio...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This may take a few seconds
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
            Retry Analysis
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/app/portfolio')}
            startIcon={<ArrowBack />}
          >
            Back to Portfolio
          </Button>
        </Box>
      </Box>
    );
  }

  if (!analysisData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No analysis data available
        </Alert>
      </Box>
    );
  }

  const { summary, portfolioSnapshot, analysis, timestamp, notice } = analysisData;

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Offline Mode Alert */}
      {isOfflineMode && (
        <Alert 
          severity="warning" 
          icon={<WifiOff />}
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              startIcon={<Refresh />}
            >
              Get Online Analysis
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Offline Analysis Mode</strong> - {notice || 'Network connection issues detected, using basic analysis algorithms'}
          </Typography>
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            bgcolor: isOfflineMode ? '#ff9800' : 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
            width: 56, 
            height: 56 
          }}>
            {isOfflineMode ? <CloudOff sx={{ fontSize: 32 }} /> : <AIIcon sx={{ fontSize: 32 }} />}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                AI Portfolio Analysis Report
              </Typography>
              {isOfflineMode && (
                <Chip 
                  label="Offline Mode" 
                  size="small" 
                  color="warning" 
                  icon={<WifiOff />}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Generated: {new Date(timestamp).toLocaleString('en-US')}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<ChatIcon />}
            onClick={handleOpenAssistant}
            sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #45a049 50%, #3e8e41 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #45a049 0%, #3e8e41 50%, #2e7d32 100%)',
              },
            }}
          >
            AI Assistant
          </Button>
          {isOfflineMode && (
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRetry}
              sx={{ borderColor: '#ff9800', color: '#ff9800' }}
            >
              Online Analysis
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Share />}
            sx={{ borderColor: '#E8A855', color: '#E8A855' }}
          >
            Share
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            sx={{ borderColor: '#E8A855', color: '#E8A855' }}
          >
            Download
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/app/portfolio')}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Typography variant="h3" sx={{ 
                fontWeight: 700, 
                color: getScoreColor(summary?.overallScore || 0),
                mb: 1
              }}>
                {summary?.overallScore || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall Score
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={summary?.overallScore || 0} 
                sx={{ 
                  mt: 1, 
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getScoreColor(summary?.overallScore || 0)
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Chip 
                label={summary?.riskLevel || 'Unknown'} 
                sx={{ 
                  bgcolor: getRiskColor(summary?.riskLevel),
                  color: 'white',
                  fontWeight: 600,
                  mb: 1
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Risk Level
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(portfolioSnapshot?.totalValue || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {Object.keys(portfolioSnapshot?.assetDistribution || {}).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Asset Types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Key Insights */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CheckCircle sx={{ color: '#4caf50' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Key Insights
            </Typography>
          </Box>
          <List>
            {(summary?.keyInsights || []).map((insight, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <TrendingUp sx={{ color: '#E8A855' }} />
                </ListItemIcon>
                <ListItemText primary={insight} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Asset Distribution */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Asset Allocation Distribution
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(portfolioSnapshot?.assetDistribution || {}).map(([type, data]) => (
              <Grid item xs={12} sm={6} md={4} key={type}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {data.percentage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {type.toUpperCase()}
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(data.value)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Detailed Analysis Sections */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Detailed Analysis Report
        </Typography>

        {/* Asset Allocation Analysis */}
        <Accordion defaultExpanded>
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
              {analysis?.assetAllocation || 'Analysis data not available'}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Risk Assessment */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security sx={{ color: '#E8A855' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Risk Assessment
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {analysis?.riskAssessment || 'Analysis data not available'}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Performance Analysis */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline sx={{ color: '#E8A855' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Performance Analysis
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {analysis?.performanceAnalysis || 'Analysis data not available'}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Market Outlook */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment sx={{ color: '#E8A855' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Market Outlook
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {analysis?.marketOutlook || 'Analysis data not available'}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Optimization Suggestions */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp sx={{ color: '#E8A855' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Optimization Recommendations
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {analysis?.optimizationSuggestions || 'Analysis data not available'}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Investment Strategy */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon sx={{ color: '#E8A855' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Investment Strategy
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {analysis?.investmentStrategy || 'Analysis data not available'}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Recommendations */}
      {summary?.recommendations && summary.recommendations.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Warning sx={{ color: '#ff9800' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recommended Actions
              </Typography>
            </Box>
            <List>
              {summary.recommendations.map((rec, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50' }} />
                  </ListItemIcon>
                  <ListItemText primary={rec} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          This analysis report is generated by AI for reference only and does not constitute investment advice. 
          Investment involves risks, please make decisions carefully.
          {isOfflineMode && ' (Currently in offline analysis mode)'}
        </Typography>
      </Box>

      {/* AI Assistant Dialog */}
      <AIAssistantDialog
        open={assistantOpen}
        onClose={handleCloseAssistant}
        portfolioId={portfolioId}
        portfolioData={portfolioSnapshot}
        analysisData={analysisData}
      />
    </Box>
  );
};

export default AIAnalysis; 