import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
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

import {
  portfolioAPI,
  marketAPI,
  formatCurrency,
  formatPercentage,
  getChangeColor,
} from '../services/api';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

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

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedTimeRange, setSelectedTimeRange] = useState('1M');


  // 🎯 使用和Portfolio页面相同的API端点获取资产数据
  const { data: portfolio, isLoading: portfolioLoading } = useQuery(
    'portfolioAssets', 
    () => fetch(buildApiUrl(API_ENDPOINTS.assets.portfolio(1))).then(res => res.json()),
    {
      refetchInterval: 30000,
    }
  );



  const { data: gainers } = useQuery('marketGainers', () => marketAPI.getGainers(5));
  const { data: losers } = useQuery('marketLosers', () => marketAPI.getLosers(5));
  const { data: indices } = useQuery('marketIndices', marketAPI.getIndices);

  // 🎯 正确提取portfolio数据并计算统计信息（使用assets API数据结构）
  const portfolioData = useMemo(() => {
    if (!portfolio?.data) return null;
    
    const data = portfolio.data;
    const assetsByType = data.assetsByType || {};
    
    // 计算总投资组合价值（包括所有资产）
    const totalPortfolioValue = data.totalValue || 0;
    
    // 计算总盈亏
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
    
    // 估算今日变化 (简化版，实际应该基于当日价格变化)
    const todayChange = totalGainLoss * 0.1; // 假设今日变化是总盈亏的10%
    const todayChangePercentValue = totalPortfolioValue > 0 ? (todayChange / totalPortfolioValue) * 100 : 0;
    
    // 🏦 从assets数据中获取现金数据
    const cashAmount = assetsByType.cash?.totalValue || 0;
    
    return {
      // 基础信息
      totalAssets: data.totalAssets || 0,
      
      // 财务数据
      totalValue: totalPortfolioValue, // 总投资组合价值（API已包含所有资产）
      cash: cashAmount,
      
      // 今日变化 (简化计算)
      todayChange: todayChange,
      todayChangePercent: todayChangePercentValue,
      
      // 持仓统计
      holdingsCount: data.totalAssets || 0,
      activeHoldings: Object.values(assetsByType).reduce((sum, typeData) => sum + (typeData.count || 0), 0),
      
      // 性能指标
      totalReturn: totalGainLoss,
      totalReturnPercent: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
      
      // 资产配置数据（用于饼图）
      allocation: {
        stocks: assetsByType.stock || { totalValue: 0 },
        crypto: assetsByType.crypto || { totalValue: 0 },
        etfs: assetsByType.etf || { totalValue: 0 },
        bonds: assetsByType.bond || { totalValue: 0 },
        cash: { totalValue: cashAmount }
      },
      
      // 原始数据
      assetsByType,
      summary: data.summary
    };
  }, [portfolio]);

  // ⭐️ 动态生成历史数据（关键修改）
  const historicalData = useMemo(() => {
    const labels = [];
    const data = [];
    const currentValue = portfolioData?.totalValue || 0;

    let days = 30; // 默认1M
    if (selectedTimeRange === '3M') days = 90;
    else if (selectedTimeRange === '1Y') days = 365;
    else if (selectedTimeRange === 'ALL') days = 730;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      let label = '';
      if (days <= 30) {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (days <= 365) {
        label = date.toLocaleDateString('en-US', { month: 'short' });
      } else {
        label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }

      labels.push(label);

      const randomChange = (Math.random() - 0.5) * 0.02;
      const value = currentValue * (0.85 + (days - 1 - i) * 0.005 + randomChange);
      data.push(Math.round(value));
    }

    return { labels, data };
  }, [selectedTimeRange, portfolioData?.totalValue]);

  const netWorthChartData = {
    labels: historicalData.labels,
    datasets: [
      {
        label: 'Portfolio Value',
        data: historicalData.data,

        borderColor: '#E8A855',
        backgroundColor: (context) => {
          if (!context.chart.chartArea) return 'rgba(232, 168, 85, 0.1)';
          const { ctx, chartArea } = context.chart;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(244, 190, 126, 0.3)');
          gradient.addColorStop(0.5, 'rgba(232, 168, 85, 0.2)');
          gradient.addColorStop(1, 'rgba(212, 150, 31, 0.1)');

          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#F4BE7E',
        pointHoverBorderColor: '#D4961F',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const netWorthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#6b7280',
          maxTicksLimit: 6,
          maxRotation: 0,
          minRotation: 0,
        },
      },
      y: {
        display: false,

        grid: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: '#D4961F', // 深金色悬停
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 2,

      },
    },
  };

  // 资产分布保持不变
  // 🎯 动态生成资产配置数据
  const allocationData = useMemo(() => {
    if (!portfolioData?.allocation) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#374151'],
          borderWidth: 0,
        }]
      };
    }

    const allocation = portfolioData.allocation;
    const labels = [];
    const data = [];
    const colors = [];
    const hoverColors = [];

    // 股票
    if (allocation.stocks && allocation.stocks.totalValue > 0) {
      labels.push('Stocks');
      data.push(allocation.stocks.totalValue);
      colors.push('#E8A855');
      hoverColors.push('#F4BE7E');
    }

    // 加密货币
    if (allocation.crypto && allocation.crypto.totalValue > 0) {
      labels.push('Crypto');
      data.push(allocation.crypto.totalValue);
      colors.push('#f59e0b');
      hoverColors.push('#fbbf24');
    }

    // ETFs
    if (allocation.etfs && allocation.etfs.totalValue > 0) {
      labels.push('ETFs');
      data.push(allocation.etfs.totalValue);
      colors.push('#6366f1');
      hoverColors.push('#8b5cf6');
    }

    // 债券
    if (allocation.bonds && allocation.bonds.totalValue > 0) {
      labels.push('Bonds');
      data.push(allocation.bonds.totalValue);
      colors.push('#F4BE7E');
      hoverColors.push('#E8A855');
    }

    // 现金
    if (portfolioData.cash > 0) {
      labels.push('Cash');
      data.push(portfolioData.cash);
      colors.push('#10b981');
      hoverColors.push('#34d399');
    }

    // 如果没有任何数据，显示空状态
    if (data.length === 0) {
      labels.push('No Investments');
      data.push(1);
      colors.push('#374151');
      hoverColors.push('#4b5563');
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        hoverBackgroundColor: hoverColors,
        borderWidth: 0,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff',
      }]
    };
  }, [portfolioData]);

  const allocationOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#ffffff',
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '60%',
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* 统计卡片区域 */}
      <Grid container spacing={3} sx={{ mb: 3 }} className="dashboard-stats-grid">
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography 
                variant="h6" 
                className="gradient-text"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Net Worth
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                {portfolioLoading ? 'Loading...' : formatCurrency(portfolioData?.totalValue || 0)}
              </Typography>
              {portfolioData?.todayChange !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {portfolioData.todayChange >= 0 ? (
                    <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                  ) : (
                    <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
                  )}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: portfolioData.todayChange >= 0 ? 'success.main' : 'error.main' 
                    }}
                  >
                    {portfolioData.todayChange >= 0 ? '+' : ''}{formatCurrency(portfolioData.todayChange)} ({formatPercentage(portfolioData.todayChangePercent)})
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography 
                variant="h6" 
                className="gradient-text"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Cash
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                {portfolioLoading ? 'Loading...' : formatCurrency(portfolioData?.cash || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available for investing
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography 
                variant="h6" 
                className="gradient-text"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Today's Change
              </Typography>
              {portfolioLoading ? (
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  Loading...
                </Typography>
              ) : portfolioData?.todayChange !== undefined ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    {portfolioData.todayChange >= 0 ? (
                      <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                    ) : (
                      <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />
                    )}
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        color: portfolioData.todayChange >= 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {portfolioData.todayChange >= 0 ? '+' : ''}{formatCurrency(portfolioData.todayChange)}
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: portfolioData.todayChange >= 0 ? 'success.main' : 'error.main'
                    }}
                  >
                    {portfolioData.todayChangePercent >= 0 ? '+' : ''}{formatPercentage(portfolioData.todayChangePercent)}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography 
                variant="h6" 
                className="gradient-text"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Holdings
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                {portfolioLoading ? 'Loading...' : (portfolioData?.holdingsCount || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {portfolioData?.activeHoldings ? `${portfolioData.activeHoldings} active positions` : 'Active positions'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 折线图部分 */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography 
                  variant="h6" 
                  className="gradient-text"
                  sx={{ fontWeight: 600 }}
                >
                  Portfolio Performance
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['1M', '3M', '1Y', 'ALL'].map((period) => (
// <<<<<<< feature_backend1
//                     <Chip
//                       key={period}
//                       label={period}
//                       size="small"
// =======
                    <Chip 
                      key={period}
                      label={period} 
                      size="small" 
// >>>>>>> main
                      clickable
                      color={selectedTimeRange === period ? 'primary' : 'default'}
                      variant={selectedTimeRange === period ? 'filled' : 'outlined'}
                      onClick={() => setSelectedTimeRange(period)}
                      sx={{
                        fontWeight: selectedTimeRange === period ? 600 : 500,
                        '&:hover': {
// <<<<<<< feature_backend1
//                           backgroundColor:
//                             selectedTimeRange === period ? 'primary.dark' : 'rgba(232, 168, 85, 0.1)',
// =======
                          backgroundColor: selectedTimeRange === period 
                            ? 'primary.dark' 
                            : 'rgba(232, 168, 85, 0.1)',
// >>>>>>> main
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <Box sx={{ height: 300 }}>
                <Line data={netWorthChartData} options={netWorthChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Doughnut 图部分保持不变 */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography 
                variant="h6" 
                className="gradient-text"
                sx={{ fontWeight: 600, mb: 3 }}
              >
                Asset Allocation
              </Typography>
              <Box sx={{ height: 300 }}>
                <Doughnut data={allocationData} options={allocationOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
