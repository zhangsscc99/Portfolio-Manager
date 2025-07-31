import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
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
  Analytics,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

// 🎯 Asset type configuration - 金色主题
const ASSET_TYPES = {
  stock: { name: 'Stocks', icon: '📈', color: '#E8A855' }, // 主金色
  crypto: { name: 'Cryptocurrency', icon: '₿', color: '#F4BE7E' }, // 浅金色  
  etf: { name: 'ETF Funds', icon: '🏛️', color: '#D4961F' }, // 深金色
  bond: { name: 'Bonds', icon: '📜', color: '#B8821A' }, // 更深金色
  cash: { name: 'Cash', icon: '💰', color: '#10b981' }, // 保持绿色 - Cash通常用绿色
  commodity: { name: 'Commodities', icon: '🥇', color: '#9A6B15' } // 最深金色
};

const Portfolio = () => {
  const navigate = useNavigate();
  
  // 📊 状态管理
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [newAsset, setNewAsset] = useState({
    symbol: '',
    name: '',
    asset_type: 'stock',
    quantity: '',
    avg_cost: '',
    currency: 'USD'
  });
  const [selectedStock, setSelectedStock] = useState(null);
  const [assetToRemove, setAssetToRemove] = useState({
    symbol: '',
    name: '',
    asset_type: 'stock',
    quantity: '',
    maxQuantity: 0
  });
  const [removeMessage, setRemoveMessage] = useState({ type: '', text: '' });

  // 🎯 使用React Query获取portfolio数据，与Dashboard保持一致
  const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = useQuery(
    'portfolioAssets',
    () => fetch(buildApiUrl(API_ENDPOINTS.assets.portfolio(1))).then(res => res.json()),
    {
      staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
      cacheTime: 10 * 60 * 1000, // 10分钟后清除缓存
    }
  );

  // 📊 处理portfolio数据，与Dashboard保持一致的数据结构
  const portfolioData = portfolio?.data || null;

  // 📊 状态管理
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetChartData, setAssetChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState({});

  // 🔄 手动更新价格
  const handleUpdatePrices = async () => {
    try {
      console.log('🔄 手动更新资产价格...');
      const response = await fetch(buildApiUrl('/assets/refresh-market-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ 价格更新成功:', result);
        await refetchPortfolio(); // 刷新数据
        
        alert(`✅ Market data refreshed successfully!\n🕐 Updated at: ${new Date(result.timestamp).toLocaleTimeString()}`);
      } else {
        console.error('❌ 价格更新失败:', result.error);
        alert('❌ 价格更新失败: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ 价格更新异常:', error);
      alert('❌ 价格更新异常: ' + error.message);
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
        const response = await fetch(`/api/assets/${asset.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          setRemoveMessage({ type: 'success', text: `${asset.symbol} completely sold (${sellQuantity} shares)` });
          // 成功时延迟重置表单并刷新数据
          setTimeout(() => {
            setOpenRemoveDialog(false);
            setAssetToRemove({
              symbol: '',
              name: '',
              asset_type: 'stock',
              quantity: '',
              maxQuantity: 0
            });
            setRemoveMessage({ type: '', text: '' });
            refetchPortfolio();
          }, 1500);
        } else {
          const errorData = await response.json();
          setRemoveMessage({ type: 'error', text: errorData.error || 'Failed to sell asset' });
        }
      } else {
        // 部分卖出，使用PUT请求更新数量
        const response = await fetch(`/api/assets/${asset.id}/sell`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellQuantity: sellQuantity
          })
        });
        
        if (response.ok) {
          const newQuantity = asset.quantity - sellQuantity;
          setRemoveMessage({ type: 'success', text: `Sold ${sellQuantity} shares of ${asset.symbol}. Remaining: ${newQuantity}` });
          // 成功时延迟重置表单并刷新数据
          setTimeout(() => {
            setOpenRemoveDialog(false);
            setAssetToRemove({
              symbol: '',
              name: '',
              asset_type: 'stock',
              quantity: '',
              maxQuantity: 0
            });
            setRemoveMessage({ type: '', text: '' });
            refetchPortfolio();
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
    console.log('🎯 选择股票:', stockData);
    setSelectedStock({ ...stockData, loading: true });
    
    try {
      // 🔍 获取实时价格和历史数据
      const [realTimePrice, historyData] = await Promise.all([
        fetchRealTimePrice(stockData.symbol),
        fetchMarketHistory(stockData.symbol)
      ]);
      
      // 📊 计算历史平均价格
      let avgHistoricalPrice = null;
      if (historyData && historyData.length > 0) {
        const totalPrice = historyData.reduce((sum, point) => sum + point.price, 0);
        avgHistoricalPrice = totalPrice / historyData.length;
        console.log(`📈 ${stockData.symbol} 历史平均价格: $${avgHistoricalPrice.toFixed(2)} (基于${historyData.length}个数据点)`);
      }
      
      // 🎯 更新选中的股票信息
      const enhancedStockData = {
        ...stockData,
        realTimePrice: realTimePrice,
        avgHistoricalPrice: avgHistoricalPrice,
        loading: false
      };
      
      setSelectedStock(enhancedStockData);
      setNewAsset(prev => ({
        ...prev,
        symbol: stockData.symbol,
        name: stockData.name,
        asset_type: stockData.type || prev.asset_type,
        avg_cost: realTimePrice || stockData.price || '' // 🔥 自动填充实时价格
      }));
      
    } catch (error) {
      console.error('❌ 获取股票数据失败:', error);
      setSelectedStock({ ...stockData, loading: false, error: error.message });
      setNewAsset(prev => ({
        ...prev,
        symbol: stockData.symbol,
        name: stockData.name,
        asset_type: stockData.type || prev.asset_type,
        avg_cost: stockData.price || '' // 兜底使用搜索结果中的价格
      }));
    }
  };

  // 🔍 获取实时价格
  const fetchRealTimePrice = async (symbol) => {
    try {
      console.log(`🔍 获取 ${symbol} 实时价格...`);
      const response = await fetch(buildApiUrl(`/market/test/${symbol}`));
      const result = await response.json();
      
      if (response.ok && result.success && result.price && result.price > 0) {
        console.log(`✅ ${symbol} 实时价格: $${result.price} (${result.currency || 'USD'})`);
        return parseFloat(result.price);
      }
      
      console.warn(`⚠️ ${symbol} 价格获取失败:`, result.error || '无效的价格数据');
      return null;
    } catch (error) {
      console.warn(`⚠️ 获取 ${symbol} 实时价格失败:`, error);
      return null;
    }
  };

  // 📊 获取历史数据（用于计算平均价格）
  const fetchMarketHistory = async (symbol) => {
    try {
      console.log(`📊 获取 ${symbol} 历史数据...`);
      const response = await fetch(buildApiUrl(`/market/history/${symbol}`));
      const data = await response.json();
      
      if (response.ok && data.success && data.data && data.data.length > 0) {
        console.log(`✅ ${symbol} 历史数据: ${data.data.length} 个数据点`);
        return data.data;
      }
      return [];
    } catch (error) {
      console.warn(`⚠️ 获取 ${symbol} 历史数据失败:`, error);
      return [];
    }
  };

  // 🔄 重置添加资产表单
  const resetAddAssetForm = () => {
    setNewAsset({
      symbol: '',
      name: '',
      asset_type: 'stock',
      quantity: '',
      avg_cost: '',
      currency: 'USD'
    });
    setSelectedStock(null);
  };

  // ➕ Add asset
  const handleAddAsset = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.assets.create), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAsset,
          portfolio_id: 1,
          quantity: parseFloat(newAsset.quantity),
          avg_cost: parseFloat(newAsset.avg_cost),
          // 使用获取到的实时价格，而不是搜索结果中的价格
          current_price: selectedStock?.realTimePrice || selectedStock?.price || null,
          // 添加30天历史平均价格
          historical_avg_price: selectedStock?.avgHistoricalPrice || null
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // 显示成功消息
        console.log(`✅ Asset ${newAsset.symbol} added/updated successfully`);
        setOpenAddDialog(false);
        resetAddAssetForm(); // 使用新的重置函数
        await refetchPortfolio();
      } else {
        // 显示错误消息
        console.error('Failed to add asset:', result.error);
        alert(`Failed to add asset: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to add asset:', error);
      alert('Network error occurred while adding asset');
    }
  };

  // 📈 Format numbers
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
          label: function(context) {
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
          callback: function(value) {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
            {portfolioLoading ? 'Loading...' : formatCurrency(portfolioData?.totalValue || 0)}
          </Typography>
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
            onClick={() => setOpenAddDialog(true)}
          >
            Add Asset
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RemoveIcon />}
            // CHANGE THIS TO REMOVE 
            onClick={() => setOpenRemoveDialog(true)}
          >
            Remove Asset
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleUpdatePrices}
          >
            Update Prices
          </Button>
        </Box>
      </Box>

      {/* ⏳ Loading状态 */}
      {portfolioLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Typography variant="h6" color="text.secondary">
            Loading portfolio data...
          </Typography>
        </Box>
      ) : !portfolioData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Typography variant="h6" color="text.secondary">
            No portfolio data available
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* 📈 Main assets area */}
          <Grid item xs={12} lg={8}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Asset Categories
            </Typography>
            
            {Object.entries(ASSET_TYPES).map(([type, config]) => {
              const typeData = portfolioData?.assetsByType?.[type];
              const hasAssets = typeData?.count > 0;
              
              return (
                <Accordion 
                  key={type}
                  expanded={expandedTypes[type] || hasAssets}
                  onChange={(_, isExpanded) => setExpandedTypes(prev => ({...prev, [type]: isExpanded}))}
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
                        <TableBody>
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
                                {formatCurrency(asset.avg_cost, asset.currency)}
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
            {/* Selected asset trend chart */}
            {selectedAsset && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {selectedAsset.symbol} Trend
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        30 Days
                      </Typography>
                      <Typography
                        sx={{
                          color: selectedAsset.gainLoss >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}
                      >
                        {formatPercent(selectedAsset.gainLossPercent)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                    {formatCurrency(selectedAsset.current_price, selectedAsset.currency)}
                  </Typography>
                  
                  <Box sx={{ height: 200, position: 'relative' }}>
                    {assetChartData ? (
                      <Line 
                        data={assetChartData} 
                        options={chartOptions}
                        key={`chart-${selectedAsset.id}`}
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
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Holdings
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {parseFloat(selectedAsset.quantity).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Total Value
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(selectedAsset.currentValue, selectedAsset.currency)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            )}


          </Grid>
        </Grid>
      )}
      {/* 📝 Remove asset dialog */}
      <Dialog open={openRemoveDialog} onClose={() => setOpenRemoveDialog(false)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setOpenRemoveDialog(false)}>Cancel</Button>
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
      <Dialog open={openAddDialog} onClose={() => { setOpenAddDialog(false); resetAddAssetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Asset</DialogTitle>
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
                  setNewAsset(prev => ({...prev, asset_type: newType}));
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
            <Grid item xs={12}>
              <StockSearchField
                value={selectedStock}
                onChange={setSelectedStock}
                onSelectStock={handleStockSelect}
                assetType={newAsset.asset_type}
                label={`Search ${ASSET_TYPES[newAsset.asset_type]?.name || 'Assets'}...`}
                placeholder={
                  newAsset.asset_type === 'stock' ? "Type 'nvidia' or 'NVDA'" :
                  newAsset.asset_type === 'crypto' ? "Type 'bitcoin' or 'BTC'" :
                  newAsset.asset_type === 'etf' ? "Type 'SPY' or 'QQQ'" :
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
                  borderColor: selectedStock.loading ? 'warning.main' : selectedStock.error ? 'error.main' : 'primary.main'
                }}>
                  <Typography variant="body2" color={selectedStock.error ? 'error.main' : 'primary.main'} sx={{ fontWeight: 600 }}>
                    {selectedStock.loading ? '🔄 Loading...' : selectedStock.error ? '❌ Error:' : '✅ Selected:'} {selectedStock.symbol} - {selectedStock.name}
                  </Typography>
                  
                  {selectedStock.loading && (
                    <Typography variant="caption" color="warning.main">
                      🔍 Fetching real-time price and market history...
                    </Typography>
                  )}
                  
                  {selectedStock.error && (
                    <Typography variant="caption" color="error.main">
                      {selectedStock.error}
                    </Typography>
                  )}
                  
                  {!selectedStock.loading && !selectedStock.error && (
                    <Box sx={{ mt: 1 }}>
                      {/* 实时价格 */}
                      {selectedStock.realTimePrice && (
                        <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 600 }}>
                          📈 Real-time Price: ${selectedStock.realTimePrice.toFixed(2)}
                        </Typography>
                      )}
                      
                      {/* 历史平均价格 */}
                      {selectedStock.avgHistoricalPrice && (
                        <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                          📊 30-Day Avg: ${selectedStock.avgHistoricalPrice.toFixed(2)}
                        </Typography>
                      )}
                      
                      {/* 原始搜索价格（作为备用参考） */}
                      {selectedStock.price && !selectedStock.realTimePrice && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          📋 Search Price: ${parseFloat(selectedStock.price).toFixed(2)}
                        </Typography>
                      )}
                    </Box>
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
                    onChange={(e) => setNewAsset(prev => ({...prev, symbol: e.target.value}))}
                    helperText="Or use search above"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Asset Name (Manual)"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset(prev => ({...prev, name: e.target.value}))}
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
                onChange={(e) => setNewAsset(prev => ({...prev, quantity: e.target.value}))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Price"
                type="number"
                value={newAsset.avg_cost}
                onChange={(e) => setNewAsset(prev => ({...prev, avg_cost: e.target.value}))}
                helperText={(() => {
                  if (selectedStock?.loading) return "🔄 Loading real-time price...";
                  if (selectedStock?.error) return "⚠️ Price data unavailable - enter manually";
                  if (selectedStock?.realTimePrice && selectedStock?.avgHistoricalPrice) {
                    return `💡 Real-time: $${selectedStock.realTimePrice.toFixed(2)} | 30-day avg: $${selectedStock.avgHistoricalPrice.toFixed(2)}`;
                  }
                  if (selectedStock?.realTimePrice) {
                    return `📈 Real-time price: $${selectedStock.realTimePrice.toFixed(2)} (auto-filled)`;
                  }
                  if (selectedStock?.price) {
                    return `📋 Search price: $${parseFloat(selectedStock.price).toFixed(2)} (auto-filled)`;
                  }
                  return "Enter the price you paid for this asset";
                })()}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>
                }}
                disabled={selectedStock?.loading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenAddDialog(false); resetAddAssetForm(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAsset}>Add</Button>
        </DialogActions>
      </Dialog>


    </Box>
  );

  


};

export default Portfolio; 