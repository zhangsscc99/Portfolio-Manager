import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketAPI } from '../services/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert
} from '@mui/material';
import StockSearchField from '../components/StockSearchField';

import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics
} from '@mui/icons-material';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { Line, Doughnut } from 'react-chartjs-2';

// 🎯 Asset type configuration - 金色主题
const ASSET_TYPES = {
  EQUITY: { name: 'Stocks', icon: '📈', color: '#E8A855' }, // 主金色
  CRYPTOCURRENCY: { name: 'Cryptocurrency', icon: '₿', color: '#F4BE7E' }, // 浅金色  
  ETF: { name: 'ETF Funds', icon: '🏛️', color: '#D4961F' }, // 深金色
  INDEX: { name: 'Bonds', icon: '📜', color: '#B8821A' }, // 更深金色
  cash: { name: 'Cash', icon: '💰', color: '#28A745' }, // 现金绿色
};

const Portfolio = () => {
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState(null);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetChartData, setAssetChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [removeAssetOpen, setRemoveAssetOpen] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [newAsset, setNewAsset] = useState({
    symbol: '',
    name: '',
    asset_type: 'EQUITY',
    quantity: '',
    price: '',
    buy_date: '',
    currency: 'USD'
  });
  const [selectedStock, setSelectedStock] = useState(null);
  const [assetToRemove, setAssetToRemove] = useState({
    symbol: '',
    name: '',
    asset_type: 'EQUITY',
    quantity: '',
    maxQuantity: 0
  });
  const [removeMessage, setRemoveMessage] = useState({ type: '', text: '' });
  const [assetPrices, setAssetPrices] = useState({});
  const [portfolioTrendData, setPortfolioTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  // 价格查询函数
  const fetchAssetPrice = async (symbol) => {
    if (assetPrices[symbol]) return;

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.assets.bySymbol(symbol)));
      const result = await response.json();
      console.log("result", result);
      if (result.success && result.data) {
        const assetData = result.data; // 移除 [0]
        setAssetPrices(prev => ({
          ...prev,
          [symbol]: {
            price: assetData.current_price
          }
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
    }
  };

  // 计算总市值函数
  const calculateTotalValue = () => {
    if (!portfolioData?.assetsByType) return 0;
    
    let totalValue = 0;
    Object.values(portfolioData.assetsByType).forEach(typeData => {
      typeData.assets?.forEach(asset => {
        const currentPrice = assetPrices[asset.symbol]?.price;
        if (currentPrice) {
          totalValue += currentPrice * asset.quantity;
        }
      });
    });
    
    return totalValue;
  };

  // 在 useEffect 中查询所有价格
  useEffect(() => {
    if (portfolioData?.assetsByType) {
      const allSymbols = [];
      Object.values(portfolioData.assetsByType).forEach(typeData => {
        typeData.assets?.forEach(asset => {
          allSymbols.push(asset.symbol);
        });
      });

      allSymbols.forEach(symbol => fetchAssetPrice(symbol));
    }
  }, [portfolioData]);

  // 📊 Fetch portfolio data
  const fetchPortfolioData = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.portfolio.getById(1)));
      const data = await response.json();
      if (data.success) {
        setPortfolioData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    }
  };

  // 📈 Fetch portfolio trend data
  const fetchPortfolioTrendData = async () => {
    setTrendLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/portfolio-trend/1`));
      const data = await response.json();
      if (data.success) {
        setPortfolioTrendData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio trend data:', error);
    } finally {
      setTrendLoading(false);
    }
  };



  // 📈 Fetch asset chart data
  const fetchAssetChartData = async (asset) => {
    if (!asset) return;

    setChartLoading(true);
    try {
      // Fetch real historical data from API
      const response = await fetch(buildApiUrl(`/market/history/${asset.symbol}?period=1mo`));
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Use real historical data
        const historyData = result.data;

        const labels = historyData.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const chartData = historyData.map(item => parseFloat(item.price || item.close || 0));

        const data = {
          labels,
          datasets: [
            {
              label: `${asset.symbol} Price`,
              data: chartData,
              borderColor: ASSET_TYPES[asset.asset_type]?.color || '#1976d2',
              backgroundColor: `${ASSET_TYPES[asset.asset_type]?.color || '#1976d2'}20`,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        };

        setAssetChartData(data);
      } else {
        // Fallback: If no historical data available, show current price as flat line
        console.warn(`No historical data available for ${asset.symbol}, using current price`);
        const currentPrice = parseFloat(asset.current_price);
        const days = 30;
        const labels = [];
        const chartData = [];

        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          chartData.push(currentPrice);
        }

        const data = {
          labels,
          datasets: [
            {
              label: `${asset.symbol} Price`,
              data: chartData,
              borderColor: ASSET_TYPES[asset.asset_type]?.color || '#1976d2',
              backgroundColor: `${ASSET_TYPES[asset.asset_type]?.color || '#1976d2'}20`,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        };

        setAssetChartData(data);
      }
    } catch (error) {
      console.error('Failed to fetch real chart data:', error);
      // Fallback: Show current price as flat line
      const currentPrice = parseFloat(asset.current_price || 0);
      const days = 30;
      const labels = [];
      const chartData = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        chartData.push(currentPrice);
      }

      const data = {
        labels,
        datasets: [
          {
            label: `${asset.symbol} Price`,
            data: chartData,
            borderColor: ASSET_TYPES[asset.asset_type]?.color || '#1976d2',
            backgroundColor: `${ASSET_TYPES[asset.asset_type]?.color || '#1976d2'}20`,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      };

      setAssetChartData(data);
    } finally {
      setChartLoading(false);
    }
  };

  // Handle asset selection
  const handleAssetSelection = (asset) => {
    setSelectedAsset(asset);
    fetchAssetChartData(asset);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPortfolioData(),
        fetchPortfolioTrendData()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // AI Portfolio Analysis - Navigate to Analytics page and scroll to AI Analysis section
  const handleAIAnalysis = async () => {
    try {
      // Navigate to analytics page
      navigate('/analytics');

      // Wait for navigation and then scroll to AI Analysis section
      setTimeout(() => {
        const element = document.getElementById('ai-analysis-reports-section');
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 300);
    } catch (error) {
      console.error('Failed to navigate to AI analysis:', error);
    }
  };


  // - Remove asset (支持部分卖出)
  const handleRemoveAsset = async () => {
    try {
      // Find the asset ID from the portfolio data
      const assetType = assetToRemove.asset_type;
      const assetSymbol = assetToRemove.symbol;
      const sellQuantity = parseFloat(assetToRemove.quantity);

      const asset = portfolioData?.assetsByType?.[assetType]?.assets?.find(
        a => a.symbol === assetSymbol
      );

      if (!asset) {
        setRemoveMessage({ type: 'error', text: 'Asset not found in portfolio' });
        return;
      }

      // 验证卖出数量
      if (!sellQuantity || sellQuantity <= 0) {
        setRemoveMessage({ type: 'error', text: 'Please enter a valid quantity to sell' });
        return;
      }

      if (sellQuantity > asset.quantity) {
        setRemoveMessage({ type: 'error', text: `Cannot sell more than ${asset.quantity} shares` });
        return;
      }

      // 如果卖出全部，使用DELETE请求
      if (sellQuantity >= asset.quantity) {
        const response = await fetch(buildApiUrl(`/holdings/${asset.holding_id}`), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const result = await response.json();
          const cashAmount = result.cashAdded || 0;
          setRemoveMessage({ type: 'success', text: `${asset.symbol} completely sold (${sellQuantity} shares). Received $${cashAmount.toFixed(2)} cash.` });
          // 成功时延迟重置表单并刷新数据
          setTimeout(() => {
            setRemoveAssetOpen(false);
            setAssetToRemove({
              symbol: '',
              name: '',
              asset_type: 'EQUITY',
              quantity: '',
              maxQuantity: 0
            });
            setRemoveMessage({ type: '', text: '' });
            fetchPortfolioData();
          }, 1500);
        } else {
          const errorData = await response.json();
          setRemoveMessage({ type: 'error', text: errorData.error || 'Failed to sell asset' });
        }
      } else {
        // 部分卖出，使用POST请求
        const response = await fetch(buildApiUrl(`/holdings/${asset.holding_id}/sell`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: sellQuantity,
            price: assetPrices[asset.symbol]?.price || asset.current_price
          })
        });

        if (response.ok) {
          const result = await response.json();
          const newQuantity = asset.quantity - sellQuantity;
          const cashAmount = result.cashAdded || 0;
          setRemoveMessage({ type: 'success', text: `Sold ${sellQuantity} shares of ${asset.symbol}. Remaining: ${newQuantity}. Received $${cashAmount.toFixed(2)} cash.` });
          // 成功时延迟重置表单并刷新数据
          setTimeout(() => {
            setRemoveAssetOpen(false);
            setAssetToRemove({
              symbol: '',
              name: '',
              asset_type: 'EQUITY',
              quantity: '',
              maxQuantity: 0
            });
            setRemoveMessage({ type: '', text: '' });
            fetchPortfolioData();
          }, 1500);
        } else {
          const errorData = await response.json();
          setRemoveMessage({ type: 'error', text: errorData.error || 'Failed to sell asset' });
        }
      }
    } catch (error) {
      setRemoveMessage({ type: 'error', text: 'Network error occurred' });
      console.error('Failed to remove asset:', error);
    }
  };

  // 🎯 处理股票选择 - 自动补全功能
  const handleStockSelect = async (stockData) => {
    console.log('Selected stock:', stockData);
    setSelectedStock(stockData);
    
    // 先设置基本信息
    setNewAsset(prev => ({
      ...prev,
      symbol: stockData.symbol,
      name: stockData.name,
      asset_type: stockData.type || prev.asset_type,
      price: stockData.price || prev.price
    }));
    
    // 如果已经选择了购买日期，优先获取该日期的历史价格
    if (newAsset.buy_date) {
      console.log(`🔄 获取 ${stockData.symbol} 在 ${newAsset.buy_date} 的历史价格...`);
      const historicalPrice = await getPriceOnDate(stockData.symbol, newAsset.buy_date);
      
      if (historicalPrice) {
        setNewAsset(prev => ({
          ...prev,
          price: historicalPrice
        }));
        console.log(`✅ 已使用 ${newAsset.buy_date} 的历史价格: $${historicalPrice}`);
        return; // 如果获取到历史价格，就不需要获取实时价格了
      }
    }
    
    // 如果没有选择日期或无法获取历史价格，则获取实时价格
    try {
      const res = await marketAPI.getAssetQuote(stockData.symbol);
      if (res.success && res.data.current_price) {
        setNewAsset(prev => ({
          ...prev,
          price: res.data.current_price
        }));
        console.log(`✅ 已使用实时价格: $${res.data.current_price}`);
      }
    } catch (error) {
      console.error('Failed to fetch current price:', error);
    }
  };

  // 📅 根据日期获取历史价格
  const getPriceOnDate = async (symbol, date) => {
    if (!symbol || !date) return null;
    
    try {
      const response = await fetch(buildApiUrl(`/assets/price-on-date?symbol=${symbol}&date=${date}`));
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`📅 ${symbol} 在 ${date} 的价格: $${result.data.price}`);
        return result.data.price;
      } else {
        console.warn(`⚠️ 无法获取 ${symbol} 在 ${date} 的价格:`, result.error);
        return null;
      }
    } catch (error) {
      console.error(`❌ 获取 ${symbol} 历史价格失败:`, error);
      return null;
    }
  };

  // 🔄 重置添加资产表单
  const resetAddAssetForm = () => {
    setNewAsset({
      symbol: '',
      name: '',
      asset_type: 'EQUITY',
      quantity: '',
      price: '',
      buy_date: '',
      currency: 'USD'
    });
    setSelectedStock(null);
  };


  const handleAddAsset = async () => {
    try {
      // 1. 创建资产
      const assetResponse = await fetch(buildApiUrl(API_ENDPOINTS.assets.create), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: newAsset.symbol,
        })
      });
      const assetResult = await assetResponse.json();

      // 2. 创建持仓
      const response = await fetch(buildApiUrl(API_ENDPOINTS.holdings.create), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: 1,
          asset_id: assetResult.data.asset_id,
          quantity: newAsset.quantity,
          price: newAsset.price,
          buy_date: newAsset.buy_date
        })
      });

      const result = await response.json();

      // 3. 获取实时价格并创建交易记录
      if (response.ok) {
        const quoteResponse = await fetch(buildApiUrl(`/assets/quote?symbol=${newAsset.symbol}`));
        const quoteResult = await quoteResponse.json();
        const currentPrice = quoteResult.success ? quoteResult.data.current_price : newAsset.price;
        const transactionResponse = await fetch(buildApiUrl(API_ENDPOINTS.transactions.create), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            holding_id: result.data.holding_id,
            trade_type: 'buy',
            quantity: newAsset.quantity,
            price: currentPrice, // 使用实时价格
            trade_time: newAsset.buy_date ? new Date(newAsset.buy_date).toISOString() : new Date().toISOString()
          })
        });

        const transactionResult = await transactionResponse.json();
        console.log('Transaction created:', transactionResult);
      }

      if (response.ok) {
        console.log(`✅ Asset ${newAsset.symbol} added/updated successfully`);
        setAddAssetOpen(false);
        resetAddAssetForm();
        await fetchPortfolioData();
      } else {
        console.error('Failed to add asset:', result.error);
        alert(`Failed to add asset: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to add asset:', error);
      alert('Network error occurred while adding asset');
    }
  };
  const formatCurrency = (value, currency = 'USD') => {
    if (value === undefined || value === null || isNaN(value)) {
      return currency === 'USD' ? '$0.00' : `0.00 ${currency}`;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return currency === 'USD' ? '$0.00' : `0.00 ${currency}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(numValue);
  };

  const formatPercent = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return '0.00%';
    }
    const sign = numValue >= 0 ? '+' : '';
    return `${sign}${numValue.toFixed(2)}%`;
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 6,
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function (value) {
            return formatCurrency(value);
          }
        }
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  // Removed loading animation

  return (
    <Box sx={{ py: 2 }}>
      {/* 📊 Header statistics */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography
              variant="h4"
              className="gradient-text"
              sx={{
                fontWeight: 600
              }}
            >
              Portfolio Overview
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mt: 1 }}>
              {formatCurrency(calculateTotalValue())}
            </Typography>
            {portfolioTrendData?.performanceData && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: portfolioTrendData.performanceData.totalReturn >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 600
                  }}
                >
                  {formatPercent(portfolioTrendData.performanceData.totalReturnPercent)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({formatCurrency(portfolioTrendData.performanceData.totalReturn)})
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Analytics />}
              onClick={handleAIAnalysis}
              sx={{
                background: 'linear-gradient(135deg, rgba(232, 168, 85, 0.1) 0%, rgba(244, 190, 126, 0.1) 100%)',
                borderColor: '#E8A855',
                color: '#E8A855',
                '&:hover': {
                  borderColor: '#F4BE7E',
                  backgroundColor: 'rgba(232, 168, 85, 0.2)',
                },
              }}
            >
              AI Analysis
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddAssetOpen(true)}
            >
              Buy Asset
            </Button>
            <Button
              variant="contained"
              startIcon={<RemoveIcon />}
              onClick={() => setRemoveAssetOpen(true)}
            >
              Sell Asset
            </Button>
          </Box>
        </Box>

        {/* 📊 Portfolio Statistics Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(232, 168, 85, 0.1) 0%, rgba(244, 190, 126, 0.1) 100%)',
              border: '1px solid rgba(232, 168, 85, 0.2)'
            }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Assets
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#E8A855' }}>
                  {Object.values(portfolioData?.assetsByType || {}).reduce((sum, type) => sum + (type.count || 0), 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.1) 100%)',
              border: '1px solid rgba(76, 175, 80, 0.2)'
            }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Return
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {portfolioTrendData?.performanceData ? formatCurrency(portfolioTrendData.performanceData.totalReturn) : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(100, 181, 246, 0.1) 100%)',
              border: '1px solid rgba(33, 150, 243, 0.2)'
            }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Best Performer
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {(() => {
                    let bestAsset = null;
                    let bestReturn = -Infinity;
                    
                    Object.values(portfolioData?.assetsByType || {}).forEach(typeData => {
                      typeData.assets?.forEach(asset => {
                        const currentPrice = assetPrices[asset.symbol]?.price;
                        const avgCost = asset.avg_cost || (asset.cost_price / asset.quantity);
                        if (currentPrice && avgCost) {
                          const returnPercent = ((currentPrice - avgCost) / avgCost) * 100;
                          if (returnPercent > bestReturn) {
                            bestReturn = returnPercent;
                            bestAsset = asset.symbol;
                          }
                        }
                      });
                    });
                    
                    return bestAsset || 'N/A';
                  })()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(186, 104, 200, 0.1) 100%)',
              border: '1px solid rgba(156, 39, 176, 0.2)'
            }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Portfolio Age
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  {portfolioTrendData?.summary?.startDate ? 
                    `${Math.ceil((new Date() - new Date(portfolioTrendData.summary.startDate)) / (1000 * 60 * 60 * 24))} days` : 
                    'N/A'
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* 📈 Main assets area */}
        <Grid item xs={12} lg={8}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Asset Categories
          </Typography>

          {Object.entries(ASSET_TYPES).map(([type, config]) => {
            const typeData = portfolioData?.assetsByType?.[type];
            console.log("portfolioData", portfolioData);
            const hasAssets = typeData?.count > 0;

            return (
              <Accordion
                key={type}
                expanded={expandedTypes[type] || hasAssets}
                onChange={(_, isExpanded) => setExpandedTypes(prev => ({ ...prev, [type]: isExpanded }))}
                sx={{ mb: 1, display: hasAssets ? 'block' : 'none' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ fontSize: '1.2em', mr: 1 }}>
                      {config.icon}
                    </Typography>
                    <Typography sx={{ flexGrow: 1, fontWeight: 600 }}>
                      {config.name} ({typeData?.count || 0})
                    </Typography>
                    <Typography sx={{ fontWeight: 600, color: config.color }}>
                      {formatCurrency(typeData?.totalValue || 0)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined" className="portfolio-table-container table-container">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Symbol</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Avg Cost</TableCell>
                          <TableCell align="right">Current Price</TableCell>
                          <TableCell align="right">Total Value</TableCell>
                          <TableCell align="right">Gain/Loss</TableCell>
                        </TableRow>
                      </TableHead>
                      {/* <TableBody>
                        {typeData?.assets?.map((asset) => (
                          <TableRow
                            key={asset.id}
                            hover
                            sx={{
                              cursor: 'pointer',
                              backgroundColor: selectedAsset?.id === asset.id ? 'action.selected' : 'inherit'
                            }}
                            onClick={() => handleAssetSelection(asset)}
                          >
                            <TableCell sx={{ fontWeight: 600 }}>
                              {asset.symbol}
                            </TableCell>
                            <TableCell>{asset.name}</TableCell>
                            <TableCell align="right">
                              {parseFloat(asset.quantity).toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(asset.price, asset.currency)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(asset.current_price, asset.currency)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(asset.currentValue, asset.currency)}
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                {asset.gainLoss >= 0 ? (
                                  <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                                ) : (
                                  <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                                )}
                                <Typography
                                  sx={{
                                    color: asset.gainLoss >= 0 ? 'success.main' : 'error.main',
                                    fontWeight: 600
                                  }}
                                >
                                  {formatPercent(asset.gainLossPercent)}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody> */}
                      <TableBody>
                        {typeData?.assets?.map((asset) => {
                          const currentPrice = assetPrices[asset.symbol]?.price;
                          const avgCost = asset.avg_cost || (asset.cost_price / asset.quantity);
                          const currentValue = currentPrice ? currentPrice * asset.quantity : null;
                          const gainLoss = currentPrice ? currentPrice - avgCost : null;
                          const gainLossPercent = (gainLoss !== null && avgCost > 0) ? (gainLoss / avgCost) * 100 : null;
                          return (
                            <TableRow
                              key={asset.symbol}
                              hover
                              sx={{
                                cursor: 'pointer',
                                backgroundColor: selectedAsset?.symbol === asset.symbol ? 'action.selected' : 'inherit'
                              }}
                              onClick={() => handleAssetSelection(asset)}
                            >
                              <TableCell sx={{ fontWeight: 600 }}>
                                {asset.symbol}
                              </TableCell>
                              <TableCell>{asset.name}</TableCell>
                              <TableCell align="right">
                                {parseFloat(asset.quantity).toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(avgCost, 'USD')}
                              </TableCell>
                              <TableCell align="right">
                                {currentPrice ? (
                                  formatCurrency(currentPrice, 'USD')
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {currentValue ? (
                                  formatCurrency(currentValue, 'USD')
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {gainLossPercent !== null ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    {gainLoss >= 0 ? (
                                      <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                                    ) : (
                                      <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                                    )}
                                    <Typography
                                      sx={{
                                        color: gainLoss >= 0 ? 'success.main' : 'error.main',
                                        fontWeight: 600
                                      }}
                                    >
                                      {formatPercent(gainLossPercent)}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Grid>

        {/* 📋 Sidebar: Asset charts */}
        <Grid item xs={12} lg={4}>
          {/* Portfolio trend chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Portfolio Trend
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {portfolioTrendData?.summary?.startDate ? 
                      `${portfolioTrendData.summary.startDate} - ${portfolioTrendData.summary.endDate}` : 
                      'Loading...'
                    }
                  </Typography>
                  {portfolioTrendData?.performanceData && (
                    <Typography
                      sx={{
                        color: portfolioTrendData.performanceData.totalReturn >= 0 ? 'success.main' : 'error.main',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      {formatPercent(portfolioTrendData.performanceData.totalReturnPercent)}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ height: 200, position: 'relative' }}>
                {trendLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">
                      Loading portfolio trend...
                    </Typography>
                  </Box>
                ) : portfolioTrendData?.timePoints && portfolioTrendData.timePoints.length > 0 ? (
                  <Line
                    data={{
                      labels: portfolioTrendData.timePoints.map(date => {
                        const d = new Date(date);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }),
                      datasets: [
                        {
                          label: 'Portfolio Value',
                          data: portfolioTrendData.portfolioValues,
                          borderColor: '#E8A855',
                          backgroundColor: '#E8A85520',
                          borderWidth: 2,
                          fill: true,
                          tension: 0.4,
                          pointRadius: 0,
                          pointHoverRadius: 4,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">
                      No portfolio trend data available
                    </Typography>
                  </Box>
                )}
              </Box>

              {portfolioTrendData?.summary && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Total Return
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(portfolioTrendData.summary.totalReturn)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Max Value
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(portfolioTrendData.summary.maxValue)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Selected asset trend chart */}
          {selectedAsset && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedAsset.symbol} - {selectedAsset.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ASSET_TYPES[selectedAsset.asset_type]?.name || selectedAsset.asset_type}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      30 Days
                    </Typography>
                    {(() => {
                      const currentPrice = assetPrices[selectedAsset.symbol]?.price;
                      const avgCost = selectedAsset.avg_cost || (selectedAsset.cost_price / selectedAsset.quantity);
                      const gainLoss = currentPrice ? currentPrice - avgCost : null;
                      const gainLossPercent = (gainLoss !== null && avgCost > 0) ? (gainLoss / avgCost) * 100 : null;
                      
                      return gainLossPercent !== null ? (
                        <Typography
                          sx={{
                            color: gainLoss >= 0 ? 'success.main' : 'error.main',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                          }}
                        >
                          {formatPercent(gainLossPercent)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      );
                    })()}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {(() => {
                      const currentPrice = assetPrices[selectedAsset.symbol]?.price;
                      return currentPrice ? formatCurrency(currentPrice, selectedAsset.currency) : 'N/A';
                    })()}
                  </Typography>
                  {(() => {
                    const currentPrice = assetPrices[selectedAsset.symbol]?.price;
                    const avgCost = selectedAsset.avg_cost || (selectedAsset.cost_price / selectedAsset.quantity);
                    const gainLoss = currentPrice ? currentPrice - avgCost : null;
                    
                    return gainLoss !== null ? (
                      <Typography
                        variant="body2"
                        sx={{
                          color: gainLoss >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 600
                        }}
                      >
                        {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, selectedAsset.currency)}
                      </Typography>
                    ) : null;
                  })()}
                </Box>

                <Box sx={{ height: 200, position: 'relative' }}>
                  {chartLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography color="text.secondary">
                        Loading chart...
                      </Typography>
                    </Box>
                  ) : assetChartData ? (
                    <Line
                      data={assetChartData}
                      options={chartOptions}
                      key={`chart-${selectedAsset.symbol}`}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography color="text.secondary">
                        No chart data available
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Holdings
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {parseFloat(selectedAsset.quantity).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Avg Cost
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const avgCost = selectedAsset.avg_cost || (selectedAsset.cost_price / selectedAsset.quantity);
                          return formatCurrency(avgCost, selectedAsset.currency);
                        })()}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Total Value
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const currentPrice = assetPrices[selectedAsset.symbol]?.price;
                          const quantity = parseFloat(selectedAsset.quantity);
                          return currentPrice ? formatCurrency(currentPrice * quantity, selectedAsset.currency) : 'N/A';
                        })()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}


        </Grid>
      </Grid>
      {/* 📝 Remove asset dialog */}
      <Dialog open={removeAssetOpen} onClose={() => setRemoveAssetOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Asset</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {removeMessage.text && (
              <Grid item xs={12}>
                <Alert severity={removeMessage.type === 'success' ? 'success' : 'error'}>
                  {removeMessage.text}
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Select Asset to Remove"
                value={`${assetToRemove.asset_type}:${assetToRemove.symbol}`}
                onChange={(e) => {
                  const [type, symbol] = e.target.value.split(':');
                  const asset = portfolioData?.assetsByType?.[type]?.assets?.find(a => a.symbol === symbol);
                  setAssetToRemove({
                    symbol: symbol,
                    name: asset?.name || '',
                    asset_type: type,
                    quantity: '',
                    maxQuantity: asset?.quantity || 0
                  });
                  setRemoveMessage({ type: '', text: '' });
                }}
              >
                {Object.entries(ASSET_TYPES).map(([type, config]) => {
                  const typeData = portfolioData?.assetsByType?.[type];
                  if (!typeData?.assets?.length) return null;

                  return typeData.assets.map((asset) => (
                    <MenuItem key={`${type}:${asset.symbol}`} value={`${type}:${asset.symbol}`}>
                      {config.icon} {asset.symbol} - {asset.name}
                    </MenuItem>
                  ));
                })}
              </TextField>
            </Grid>
            {assetToRemove.symbol && (
              <>
                <Grid item xs={12}>
                  <Box sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, rgba(244, 190, 126, 0.1) 0%, rgba(232, 168, 85, 0.15) 100%)',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'primary.main'
                  }}>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      📊 Current Holdings: {assetToRemove.maxQuantity} shares of {assetToRemove.symbol}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quantity to Sell"
                    type="number"
                    value={assetToRemove.quantity}
                    onChange={(e) => setAssetToRemove(prev => ({ ...prev, quantity: e.target.value }))}
                    inputProps={{
                      min: 0.01,
                      max: assetToRemove.maxQuantity,
                      step: 0.01
                    }}
                    helperText={`Enter quantity to sell (max: ${assetToRemove.maxQuantity})`}
                    error={assetToRemove.quantity && (parseFloat(assetToRemove.quantity) > assetToRemove.maxQuantity || parseFloat(assetToRemove.quantity) <= 0)}
                  />
                </Grid>

                {assetToRemove.quantity && !removeMessage.text && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      {parseFloat(assetToRemove.quantity) >= assetToRemove.maxQuantity
                        ? `You are selling ALL ${assetToRemove.maxQuantity} shares of ${assetToRemove.symbol}. This will completely remove the asset from your portfolio.`
                        : `You are selling ${assetToRemove.quantity} shares of ${assetToRemove.symbol}. You will have ${(assetToRemove.maxQuantity - parseFloat(assetToRemove.quantity)).toFixed(2)} shares remaining.`
                      }
                    </Alert>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveAssetOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveAsset}
            disabled={
              !assetToRemove.symbol ||
              !assetToRemove.quantity ||
              parseFloat(assetToRemove.quantity) <= 0 ||
              parseFloat(assetToRemove.quantity) > assetToRemove.maxQuantity ||
              removeMessage.type === 'success'
            }
          >
            Sell Asset
          </Button>
        </DialogActions>
      </Dialog>



      {/* 📝 Add asset dialog */}
      <Dialog open={addAssetOpen} onClose={() => { setAddAssetOpen(false); resetAddAssetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Buy New Asset</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Asset Type"
                value={newAsset.asset_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setNewAsset(prev => ({ ...prev, asset_type: newType }));
                  // 清除之前的选择，因为资产类型改变了
                  setSelectedStock(null);
                }}
              >
                {Object.entries(ASSET_TYPES).map(([type, config]) => (
                  <MenuItem key={type} value={type}>
                    {config.icon} {config.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Buy Date"
                type="date"
                value={newAsset.buy_date ? newAsset.buy_date.slice(0, 10) : ''}
                onChange={async (e) => {
                  const selectedDate = e.target.value;
                  setNewAsset(prev => ({ ...prev, buy_date: selectedDate }));
                  
                  // 如果已经选择了股票，自动获取该日期的价格
                  if (selectedDate && newAsset.symbol) {
                    console.log(`🔄 获取 ${newAsset.symbol} 在 ${selectedDate} 的历史价格...`);
                    const historicalPrice = await getPriceOnDate(newAsset.symbol, selectedDate);
                    
                    if (historicalPrice) {
                      setNewAsset(prev => ({
                        ...prev,
                        price: historicalPrice
                      }));
                      console.log(`✅ 已自动填充 ${newAsset.symbol} 在 ${selectedDate} 的价格: $${historicalPrice}`);
                    } else {
                      console.log(`⚠️ 无法获取 ${newAsset.symbol} 在 ${selectedDate} 的价格，保持当前价格`);
                    }
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <StockSearchField
                value={selectedStock}
                onChange={setSelectedStock}
                onSelectStock={handleStockSelect}
                assetType={newAsset.asset_type}
                label={`Search ${ASSET_TYPES[newAsset.asset_type]?.name || 'Assets'}...`}
                placeholder={
                  newAsset.asset_type === 'stock' ? "Type 'NVDA'" :
                    newAsset.asset_type === 'crypto' ? "Type 'BTC'" :
                      newAsset.asset_type === 'etf' ? "Type 'SPY' or 'QQQ'" :
                        newAsset.asset_type === 'bond' ? "Type '^IRX'" :
                          "Type symbol or name"
                }
              />
            </Grid>

            {/* 显示选中的股票信息 */}
            {selectedStock && (
              <Grid item xs={12}>
                <Box sx={{
                  p: 2,
                  background: 'linear-gradient(135deg, rgba(244, 190, 126, 0.1) 0%, rgba(232, 168, 85, 0.15) 100%)',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'primary.main'
                }}>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                    ✅ Selected: {selectedStock.symbol} - {selectedStock.name}
                  </Typography>
                  {selectedStock.price && (
                    <Typography variant="caption" color="text.secondary">
                      Current Price: ${parseFloat(selectedStock.price).toFixed(2)}
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}

            {/* 手动输入选项（如果需要） */}
            {!selectedStock && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Symbol (Manual)"
                    placeholder="e.g., AAPL, BTC"
                    value={newAsset.symbol}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, symbol: e.target.value }))}
                    helperText="Or use search above"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Asset Name (Manual)"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                    helperText="Or use search above"
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={newAsset.quantity}
                onChange={(e) => setNewAsset(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={newAsset.price}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, price: e.target.value }))}
                />
                {newAsset.symbol && newAsset.buy_date && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      console.log(`🔄 手动获取 ${newAsset.symbol} 在 ${newAsset.buy_date} 的历史价格...`);
                      const historicalPrice = await getPriceOnDate(newAsset.symbol, newAsset.buy_date);
                      if (historicalPrice) {
                        setNewAsset(prev => ({
                          ...prev,
                          price: historicalPrice
                        }));
                        console.log(`✅ 已更新为历史价格: $${historicalPrice}`);
                      }
                    }}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    📅
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddAssetOpen(false); resetAddAssetForm(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAsset}>Add</Button>
        </DialogActions>
      </Dialog>


    </Box>
  );




};

export default Portfolio; 