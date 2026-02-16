import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Feed as FeedIcon,
  Insights as InsightsIcon,
  Psychology as PsychologyIcon,
  ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import StockSearchField from '../components/StockSearchField';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { formatCurrency, marketAPI } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DEFAULT_PORTFOLIO_PAYLOAD = {
  name: 'Main Portfolio',
  description: 'Auto-created default portfolio',
  cash: 0,
};

const VIEW_TABS = [
  { value: 'overview', label: 'Holdings Overview' },
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'technical', label: 'Technical (K-Line)' },
  { value: 'news', label: 'News' },
];

const TIME_RANGES = ['1M', '3M', '1Y'];

const PERIOD_MAP = {
  '1M': '1mo',
  '3M': '3mo',
  '1Y': '1y',
};

const classifyMarketCap = (marketCap) => {
  if (!marketCap || Number.isNaN(marketCap)) return 'N/A';
  if (marketCap >= 200_000_000_000) return 'Mega / Large Cap';
  if (marketCap >= 10_000_000_000) return 'Mid / Large Cap';
  if (marketCap >= 2_000_000_000) return 'Mid Cap';
  return 'Small Cap';
};

const getVolatilityLabel = (annualizedVolatility) => {
  if (!annualizedVolatility || Number.isNaN(annualizedVolatility)) return 'N/A';
  if (annualizedVolatility < 20) return 'Low';
  if (annualizedVolatility < 35) return 'Moderate';
  return 'High';
};

const StockInsights = () => {
  const [activeView, setActiveView] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('1M');
  const [currentPortfolioId, setCurrentPortfolioId] = useState(null);
  const [portfolioIdLoading, setPortfolioIdLoading] = useState(true);
  const [portfolioIdError, setPortfolioIdError] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [searchValue, setSearchValue] = useState(null);
  const [aiState, setAiState] = useState({
    loading: false,
    mode: '',
    response: '',
    error: '',
  });

  useEffect(() => {
    let cancelled = false;

    const resolvePortfolioId = async () => {
      setPortfolioIdLoading(true);
      setPortfolioIdError('');

      try {
        const currentRes = await fetch(buildApiUrl(API_ENDPOINTS.portfolio.getCurrent));
        const currentJson = await currentRes.json();

        if (currentRes.ok && currentJson?.success && currentJson?.data?.id) {
          if (!cancelled) setCurrentPortfolioId(currentJson.data.id);
          return;
        }

        if (currentRes.status === 404) {
          const createRes = await fetch(buildApiUrl(API_ENDPOINTS.portfolio.create), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(DEFAULT_PORTFOLIO_PAYLOAD),
          });
          const createJson = await createRes.json();

          if (createRes.ok && createJson?.success && createJson?.data?.id) {
            if (!cancelled) setCurrentPortfolioId(createJson.data.id);
            return;
          }
        }

        throw new Error(currentJson?.error || 'Unable to load current portfolio');
      } catch (error) {
        if (!cancelled) setPortfolioIdError(error.message || 'Unable to load current portfolio');
      } finally {
        if (!cancelled) setPortfolioIdLoading(false);
      }
    };

    resolvePortfolioId();

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    data: portfolioResult,
    isLoading: holdingsLoading,
    error: holdingsError,
  } = useQuery(
    ['insightsPortfolio', currentPortfolioId],
    async () => {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.assets.portfolio(currentPortfolioId)));
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to load portfolio assets');
      }
      return result;
    },
    { enabled: !!currentPortfolioId }
  );

  const stockHoldings = useMemo(() => {
    const stockAssets = portfolioResult?.data?.assetsByType?.stock?.assets;
    return Array.isArray(stockAssets) ? stockAssets : [];
  }, [portfolioResult]);

  useEffect(() => {
    if (!selectedSymbol && stockHoldings.length > 0) {
      const firstStock = stockHoldings[0];
      setSelectedSymbol(firstStock.symbol);
      setSelectedStock({
        symbol: firstStock.symbol,
        name: firstStock.name,
      });
    }
  }, [stockHoldings, selectedSymbol]);

  const {
    data: quoteResult,
  } = useQuery(
    ['insightsQuote', selectedSymbol],
    () => marketAPI.getQuote(selectedSymbol),
    { enabled: !!selectedSymbol }
  );

  const {
    data: historyResult,
    isLoading: historyLoading,
  } = useQuery(
    ['insightsHistory', selectedSymbol, selectedTimeRange],
    () => marketAPI.getHistory(selectedSymbol, PERIOD_MAP[selectedTimeRange]),
    { enabled: !!selectedSymbol, keepPreviousData: true }
  );

  const {
    data: newsResult,
    isLoading: newsLoading,
  } = useQuery(
    ['insightsNews', selectedSymbol],
    () => marketAPI.getNews(selectedSymbol),
    { enabled: !!selectedSymbol }
  );

  const quoteData = useMemo(() => quoteResult?.data || {}, [quoteResult]);
  const historyData = useMemo(
    () => (Array.isArray(historyResult?.data) ? historyResult.data : []),
    [historyResult]
  );
  const newsItems = useMemo(
    () => (Array.isArray(newsResult?.data) ? newsResult.data : []),
    [newsResult]
  );

  const technicalStats = useMemo(() => {
    if (historyData.length < 2) {
      return {
        returnPct: 0,
        annualizedVolatility: 0,
        low: 0,
        high: 0,
        rangePosition: 0,
      };
    }

    const closes = historyData.map((point) => Number(point.close || point.price || 0)).filter((value) => value > 0);
    if (closes.length < 2) {
      return {
        returnPct: 0,
        annualizedVolatility: 0,
        low: 0,
        high: 0,
        rangePosition: 0,
      };
    }

    const first = closes[0];
    const last = closes[closes.length - 1];
    const returnPct = ((last - first) / first) * 100;

    const dailyReturns = [];
    for (let i = 1; i < closes.length; i += 1) {
      dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const mean = dailyReturns.reduce((sum, value) => sum + value, 0) / (dailyReturns.length || 1);
    const variance = dailyReturns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (dailyReturns.length || 1);
    const annualizedVolatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    const low = Math.min(...closes);
    const high = Math.max(...closes);
    const rangePosition = high > low ? ((last - low) / (high - low)) * 100 : 0;

    return {
      returnPct,
      annualizedVolatility,
      low,
      high,
      rangePosition,
    };
  }, [historyData]);

  const kLineChartData = useMemo(() => {
    return {
      labels: historyData.map((point) => {
        const date = new Date(point.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: `${selectedSymbol || 'Symbol'} Close Price`,
          data: historyData.map((point) => Number(point.close || point.price || 0)),
          borderColor: '#E8A855',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.25,
          backgroundColor: 'rgba(232, 168, 85, 0.18)',
        },
      ],
    };
  }, [historyData, selectedSymbol]);

  const kLineChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.88)',
        borderColor: 'rgba(232, 168, 85, 0.35)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9ca3af', maxTicksLimit: 6 },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.08)' },
        ticks: {
          color: '#9ca3af',
          callback: (value) => `$${Number(value).toFixed(0)}`,
        },
      },
    },
  }), []);

  const fundamentals = useMemo(() => {
    const marketCap = Number(quoteData.marketCap || 0);
    const volume = Number(quoteData.volume || 0);
    const previousClose = Number(quoteData.previousClose || 0);
    const currentPrice = Number(quoteData.price || 0);
    const dayChangePct = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

    return {
      currentPrice,
      dayChangePct,
      marketCap,
      volume,
      marketCapClass: classifyMarketCap(marketCap),
    };
  }, [quoteData]);

  const selectHoldingStock = (holding) => {
    setSelectedSymbol(holding.symbol);
    setSelectedStock({
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
    });
    setSearchValue(null);
    setAiState((prev) => ({
      ...prev,
      response: '',
      error: '',
    }));
  };

  const handleSelectFromSearch = (stock) => {
    setSelectedStock(stock);
    setSelectedSymbol(stock.symbol);
    setAiState((prev) => ({
      ...prev,
      response: '',
      error: '',
    }));
  };

  const runAIBrief = async (mode) => {
    if (!selectedSymbol) return;

    const prompts = {
      fundamental: `Analyze ${selectedSymbol} from a fundamental perspective in concise bullets. Cover valuation approach, cash-flow quality, and future profitability drivers/risks.`,
      technical: `Analyze ${selectedSymbol} from a technical perspective. Focus on K-line trend, momentum, support/resistance, and a short-term risk scenario.`,
      news: `Summarize the latest important news and sentiment for ${selectedSymbol}. Highlight catalysts and key risks that investors should monitor.`,
    };

    setAiState({ loading: true, mode, response: '', error: '' });

    try {
      const response = await fetch(buildApiUrl('/ai-analysis/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `stock-insights-${selectedSymbol.toLowerCase()}`,
          portfolioId: currentPortfolioId,
          message: prompts[mode],
          portfolioContext: {
            portfolioData: {
              totalValue: Number(portfolioResult?.data?.totalValue || 0),
              totalAssets: Number(portfolioResult?.data?.totalAssets || 0),
              assetsByType: portfolioResult?.data?.assetsByType || {},
            },
            analysisData: {
              summary: { riskLevel: 'Medium', overallScore: 75 },
            },
          },
          requestFollowUpQuestions: false,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate AI brief');
      }

      setAiState({
        loading: false,
        mode,
        response: result.data.response || 'No response returned.',
        error: '',
      });
    } catch (error) {
      setAiState({
        loading: false,
        mode,
        response: '',
        error: error.message || 'Failed to generate AI brief.',
      });
    }
  };

  const renderInlineMarkdown = (text) => {
    const normalized = String(text || "")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
      .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1$2');

    const parts = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Box component="strong" key={`md-bold-${index}`} sx={{ fontWeight: 700 }}>
            {part.slice(2, -2)}
          </Box>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <Box
            component="code"
            key={`md-code-${index}`}
            sx={{
              px: 0.5,
              py: 0.1,
              borderRadius: 0.75,
              backgroundColor: 'rgba(255,255,255,0.08)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.85em',
            }}
          >
            {part.slice(1, -1)}
          </Box>
        );
      }
      return (
        <React.Fragment key={`md-text-${index}`}>
          {part.replace(/\*/g, '')}
        </React.Fragment>
      );
    });
  };

  const renderFormattedAIResponse = (content) => {
    const lines = String(content || '').split('\n');

    return (
      <Stack spacing={0.9}>
        {lines.map((rawLine, index) => {
          const line = rawLine.trim();

          if (!line) {
            return <Box key={`md-space-${index}`} sx={{ height: 4 }} />;
          }

          if (/^#{1,6}\s+/.test(line)) {
            const headingText = line.replace(/^#{1,6}\s+/, '');
            return (
              <Typography key={`md-heading-${index}`} variant="subtitle2" sx={{ fontWeight: 700, mt: 0.6 }}>
                {renderInlineMarkdown(headingText)}
              </Typography>
            );
          }

          if (/^[-*•]\s+/.test(line)) {
            const bulletText = line.replace(/^[-*•]\s+/, '');
            return (
              <Box key={`md-bullet-${index}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>•</Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  {renderInlineMarkdown(bulletText)}
                </Typography>
              </Box>
            );
          }

          if (/^\d+\.\s+/.test(line)) {
            const marker = line.match(/^(\d+\.)\s+/)?.[1] || '1.';
            const orderedText = line.replace(/^\d+\.\s+/, '');
            return (
              <Box key={`md-ordered-${index}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 28, lineHeight: 1.7 }}>{marker}</Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  {renderInlineMarkdown(orderedText)}
                </Typography>
              </Box>
            );
          }

          return (
            <Typography key={`md-line-${index}`} variant="body2" sx={{ lineHeight: 1.7 }}>
              {renderInlineMarkdown(line)}
            </Typography>
          );
        })}
      </Stack>
    );
  };

  const renderOverview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {selectedSymbol ? `${selectedSymbol} Quick Snapshot` : 'Select a stock'}
            </Typography>
            {!selectedSymbol ? (
              <Typography variant="body2" color="text.secondary">
                Pick a stock from your holdings or search to begin.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Price</Typography>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    {formatCurrency(fundamentals.currentPrice)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Daily Move</Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: fundamentals.dayChangePct >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {fundamentals.dayChangePct >= 0 ? '+' : ''}
                    {fundamentals.dayChangePct.toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Range Position</Typography>
                  <Typography variant="h6">{technicalStats.rangePosition.toFixed(1)}%</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Volatility</Typography>
                  <Typography variant="h6">{getVolatilityLabel(technicalStats.annualizedVolatility)}</Typography>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              AI Quick Actions
            </Typography>
            <Stack spacing={1.5}>
              <Button
                variant="outlined"
                onClick={() => runAIBrief('fundamental')}
                disabled={!selectedSymbol || aiState.loading}
              >
                Ask Fundamental Brief
              </Button>
              <Button
                variant="outlined"
                onClick={() => runAIBrief('technical')}
                disabled={!selectedSymbol || aiState.loading}
              >
                Ask Technical Brief
              </Button>
              <Button
                variant="outlined"
                onClick={() => runAIBrief('news')}
                disabled={!selectedSymbol || aiState.loading}
              >
                Ask News Brief
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFundamental = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Fundamental Lens
        </Typography>
        {!selectedSymbol ? (
          <Typography variant="body2" color="text.secondary">
            Select a stock first.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem disableGutters>
                  <ListItemText primary="Market Cap Class" secondary={fundamentals.marketCapClass} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="Market Capitalization" secondary={fundamentals.marketCap ? formatCurrency(fundamentals.marketCap) : 'N/A'} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="Liquidity (Volume)" secondary={fundamentals.volume ? fundamentals.volume.toLocaleString('en-US') : 'N/A'} />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem disableGutters>
                  <ListItemText primary="Current Price" secondary={formatCurrency(fundamentals.currentPrice)} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="30D Return" secondary={`${technicalStats.returnPct >= 0 ? '+' : ''}${technicalStats.returnPct.toFixed(2)}%`} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="Cash Flow & Profitability View" secondary="Use AI brief for qualitative analysis." />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  const renderTechnical = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            K-Line Trend
          </Typography>
          <Stack direction="row" spacing={1}>
            {TIME_RANGES.map((period) => (
              <Chip
                key={period}
                label={period}
                clickable
                color={selectedTimeRange === period ? 'primary' : 'default'}
                variant={selectedTimeRange === period ? 'filled' : 'outlined'}
                onClick={() => setSelectedTimeRange(period)}
              />
            ))}
          </Stack>
        </Box>

        <Box sx={{ height: 320 }}>
          {!selectedSymbol ? (
            <Typography variant="body2" color="text.secondary">
              Select a stock first.
            </Typography>
          ) : historyLoading ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
              <CircularProgress size={26} />
              <Typography variant="body2" color="text.secondary">Loading K-line history...</Typography>
            </Box>
          ) : historyData.length > 1 ? (
            <Line data={kLineChartData} options={kLineChartOptions} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No technical history available for this symbol right now.
            </Typography>
          )}
        </Box>

        {historyData.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
            <Chip
              label={`Return: ${technicalStats.returnPct >= 0 ? '+' : ''}${technicalStats.returnPct.toFixed(2)}%`}
              color={technicalStats.returnPct >= 0 ? 'success' : 'error'}
              variant="outlined"
            />
            <Chip
              label={`Volatility: ${technicalStats.annualizedVolatility.toFixed(1)}%`}
              variant="outlined"
            />
            <Chip
              label={`Low: ${formatCurrency(technicalStats.low)}`}
              variant="outlined"
            />
            <Chip
              label={`High: ${formatCurrency(technicalStats.high)}`}
              variant="outlined"
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  const renderNews = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          News Pulse
        </Typography>
        {!selectedSymbol ? (
          <Typography variant="body2" color="text.secondary">
            Select a stock first.
          </Typography>
        ) : newsLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">Loading latest headlines...</Typography>
          </Box>
        ) : newsItems.length > 0 ? (
          <List disablePadding>
            {newsItems.slice(0, 8).map((item, index) => (
              <React.Fragment key={`${item.title}-${index}`}>
                {index > 0 && <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.08)' }} />}
                <ListItem
                  component="a"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ px: 0, color: 'inherit', textDecoration: 'none' }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={`${item.source || 'Unknown source'} • ${item.publishTime ? new Date(item.publishTime).toLocaleDateString('en-US') : 'Date N/A'}`}
                    primaryTypographyProps={{ fontSize: '0.95rem', sx: { lineHeight: 1.4 } }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No recent news found for this symbol.
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderActiveSection = () => {
    if (activeView === 'fundamental') return renderFundamental();
    if (activeView === 'technical') return renderTechnical();
    if (activeView === 'news') return renderNews();
    return renderOverview();
  };

  const pageError = portfolioIdError || holdingsError?.message || '';

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Stock Intelligence
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analyze holdings with one workflow: fundamentals, technical K-line, and market news.
        </Typography>
      </Box>

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Select Stock
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <StockSearchField
                assetType="stock"
                value={searchValue}
                onChange={setSearchValue}
                onSelectStock={handleSelectFromSearch}
                label="Search symbol..."
                placeholder="Type symbol or company name"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  background: 'rgba(232, 168, 85, 0.06)',
                  border: '1px solid rgba(232, 168, 85, 0.2)',
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Selected
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'primary.main', mt: 0.3 }}>
                    {selectedSymbol || 'None'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedStock?.name || 'Pick from holdings or search result.'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2.5 }}>
            <Typography variant="body2" sx={{ mb: 1.2, color: 'text.secondary' }}>
              Portfolio Holdings
            </Typography>
            {portfolioIdLoading || holdingsLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Loading holdings...
                </Typography>
              </Box>
            ) : stockHoldings.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {stockHoldings.map((holding) => (
                  <Chip
                    key={holding.symbol}
                    label={`${holding.symbol} ${holding.quantity ? `(${holding.quantity})` : ''}`.trim()}
                    clickable
                    color={selectedSymbol === holding.symbol ? 'primary' : 'default'}
                    variant={selectedSymbol === holding.symbol ? 'filled' : 'outlined'}
                    onClick={() => selectHoldingStock(holding)}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No stock holdings yet. Add stock assets in Portfolio to unlock one-click analysis.
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Tabs
            value={activeView}
            onChange={(event, value) => setActiveView(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#E8A855',
              },
            }}
          >
            {VIEW_TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={
                  tab.value === 'overview' ? <InsightsIcon fontSize="small" /> :
                  tab.value === 'fundamental' ? <PsychologyIcon fontSize="small" /> :
                  tab.value === 'technical' ? <ShowChartIcon fontSize="small" /> :
                  <FeedIcon fontSize="small" />
                }
                iconPosition="start"
                sx={{ minHeight: 42 }}
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {renderActiveSection()}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Analyst Response
            </Typography>
          </Box>

          {aiState.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={22} />
              <Typography variant="body2" color="text.secondary">
                Generating {aiState.mode || 'analysis'} brief for {selectedSymbol}...
              </Typography>
            </Box>
          ) : aiState.error ? (
            <Alert severity="error">{aiState.error}</Alert>
          ) : aiState.response ? (
            renderFormattedAIResponse(aiState.response)
          ) : (
            <Typography variant="body2" color="text.secondary">
              Click one of the AI quick actions to generate a focused brief for the selected stock.
            </Typography>
          )}
        </CardContent>
      </Card>

      {selectedSymbol && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tip: You can still use the global AI Assistant for follow-up conversation after generating quick briefs here.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default StockInsights;
