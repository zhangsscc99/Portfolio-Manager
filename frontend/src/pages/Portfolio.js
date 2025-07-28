import React, { useState, useEffect } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Visibility as WatchIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

// 🎯 Asset type configuration
const ASSET_TYPES = {
  stock: { name: 'Stocks', icon: '📈', color: '#1976d2' },
  crypto: { name: 'Cryptocurrency', icon: '₿', color: '#ff9800' },
  etf: { name: 'ETF Funds', icon: '🏛️', color: '#2e7d32' },
  bond: { name: 'Bonds', icon: '📜', color: '#5d4037' },
  cash: { name: 'Cash', icon: '💰', color: '#424242' },
  commodity: { name: 'Commodities', icon: '🥇', color: '#f57c00' }
};

const Portfolio = () => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [watchlist, setWatchlist] = useState({});
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
    asset_type: 'stock',
    quantity: '',
    avg_cost: '',
    currency: 'USD'
  });
  const [assetToRemove, setAssetToRemove] = useState({
    symbol: '',
    name: '',
    asset_type: 'stock'
  });
  const [removeMessage, setRemoveMessage] = useState({ type: '', text: '' });

  // 📊 Fetch portfolio data
  const fetchPortfolioData = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.assets.portfolio(1)));
      const data = await response.json();
      if (data.success) {
        setPortfolioData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    }
  };

  // 📋 Fetch watchlist
  const fetchWatchlist = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.assets.watchlist));
      const data = await response.json();
      if (data.success) {
        setWatchlist(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    }
  };

  // 📈 Fetch asset chart data
  const fetchAssetChartData = async (asset) => {
    if (!asset) return;
    
    setChartLoading(true);
    try {
      // Generate mock historical data for demo
      const days = 30;
      const currentPrice = parseFloat(asset.current_price);
      const volatility = 0.02; // 2% daily volatility
      
      const chartData = [];
      const labels = [];
      let price = currentPrice * 0.95; // Start 5% lower than current
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random walk with slight upward trend
        const change = (Math.random() - 0.48) * volatility; // Slight positive bias
        price = price * (1 + change);
        
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        chartData.push(parseFloat(price.toFixed(2)));
      }
      
      // Ensure the last price matches current price
      chartData[chartData.length - 1] = currentPrice;
      
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
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
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
      await Promise.all([fetchPortfolioData(), fetchWatchlist()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 🔄 Refresh prices
  const handleRefreshPrices = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.assets.updatePrices), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId: 1 })
      });
      const data = await response.json();
      if (data.success) {
        await fetchPortfolioData();
        // Refresh chart data if asset is selected
        if (selectedAsset) {
          fetchAssetChartData(selectedAsset);
        }
      }
    } catch (error) {
      console.error('Failed to update prices:', error);
    }
  };
  // - Remove asset
  const handleRemoveAsset = async () => {
    try {
      // Find the asset ID from the portfolio data
      const assetType = assetToRemove.asset_type;
      const assetSymbol = assetToRemove.symbol;
      
      const asset = portfolioData?.assetsByType?.[assetType]?.assets?.find(
        a => a.symbol === assetSymbol
      );
      
      if (!asset) {
        setRemoveMessage({ type: 'error', text: 'Asset not found in portfolio' });
        return;
      }
      
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setRemoveMessage({ type: 'success', text: `${asset.symbol} removed successfully` });
        setTimeout(() => {
          setRemoveAssetOpen(false);
          setAssetToRemove({
            symbol: '',
            name: '',
            asset_type: 'stock'
          });
          setRemoveMessage({ type: '', text: '' });
          fetchPortfolioData();
        }, 1500);
      } else {
        const errorData = await response.json();
        setRemoveMessage({ type: 'error', text: errorData.error || 'Failed to remove asset' });
        console.error('Failed to remove asset:', errorData);
      }
    } catch (error) {
      setRemoveMessage({ type: 'error', text: 'Network error occurred' });
      console.error('Failed to remove asset:', error);
    }
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
          avg_cost: parseFloat(newAsset.avg_cost)
        })
      });
      
      if (response.ok) {
        setAddAssetOpen(false);
        setNewAsset({
          symbol: '',
          name: '',
          asset_type: 'stock',
          quantity: '',
          avg_cost: '',
          currency: 'USD'
        });
        await fetchPortfolioData();
      }
    } catch (error) {
      console.error('Failed to add asset:', error);
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
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Portfolio Overview
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mt: 1 }}>
            {formatCurrency(portfolioData?.totalValue || 0)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshPrices}
          >
            Refresh Prices
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddAssetOpen(true)}
          >
            Add Asset
          </Button>
          <Button
            variant="contained"
            startIcon={<RemoveIcon />}
            // CHANGE THIS TO REMOVE 
            onClick={() => setRemoveAssetOpen(true)}
          >
            Remove Asset
          </Button>
        </Box>
      </Box>

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
                  <TableContainer component={Paper} variant="outlined">
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

        {/* 📋 Sidebar: Watchlist and charts */}
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

          {/* Watchlist */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Watchlist
                </Typography>
                <IconButton size="small">
                  <WatchIcon />
                </IconButton>
              </Box>
              
              {Object.entries(watchlist).map(([type, data]) => {
                if (!data.items?.length) return null;
                
                return (
                  <Box key={type} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                      {ASSET_TYPES[type]?.icon} {ASSET_TYPES[type]?.name}
                    </Typography>
                    {data.items.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.name}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2">
                            {formatCurrency(item.current_price)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: item.price_change_percent >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {formatPercent(item.price_change_percent)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                );
              })}
              
              {Object.values(watchlist).every(data => !data.items?.length) && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No assets in watchlist
                </Typography>
              )}
            </CardContent>
          </Card>
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
                    asset_type: type
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
            {assetToRemove.symbol && !removeMessage.text && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Are you sure you want to remove {assetToRemove.symbol} ({assetToRemove.name}) from your portfolio?
                  This action cannot be undone.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveAssetOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleRemoveAsset}
            disabled={!assetToRemove.symbol || removeMessage.type === 'success'}
          >
            Remove Asset
          </Button>
        </DialogActions>
      </Dialog>
          


      {/* 📝 Add asset dialog */}
      <Dialog open={addAssetOpen} onClose={() => setAddAssetOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Asset</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Asset Type"
                value={newAsset.asset_type}
                onChange={(e) => setNewAsset(prev => ({...prev, asset_type: e.target.value}))}
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
                label="Symbol"
                placeholder="e.g., AAPL, BTC"
                value={newAsset.symbol}
                onChange={(e) => setNewAsset(prev => ({...prev, symbol: e.target.value}))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Asset Name"
                value={newAsset.name}
                onChange={(e) => setNewAsset(prev => ({...prev, name: e.target.value}))}
              />
            </Grid>
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
                label="Average Cost"
                type="number"
                value={newAsset.avg_cost}
                onChange={(e) => setNewAsset(prev => ({...prev, avg_cost: e.target.value}))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddAssetOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAsset}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  


};

export default Portfolio; 