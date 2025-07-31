import React, { useState, useMemo, useEffect } from 'react';
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
  CircularProgress,
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
  
  // 📊 简化状态声明
  const [selectedTimeRange, setSelectedTimeRange] = useState('1M');
  const [currentHistoryData, setCurrentHistoryData] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 🎯 使用assets API获取真实的portfolio数据
  const { data: portfolio, isLoading: portfolioLoading } = useQuery(
    'portfolioAssets', 
    () => fetch(buildApiUrl(API_ENDPOINTS.assets.portfolio(1))).then(res => res.json()),
    {
      staleTime: 5 * 60 * 1000, // 5分钟内认为数据是新鲜的
      cacheTime: 10 * 60 * 1000, // 10分钟后清除缓存
    }
  );



  const { data: gainers } = useQuery('marketGainers', () => marketAPI.getGainers(5));
  const { data: losers } = useQuery('marketLosers', () => marketAPI.getLosers(5));
  const { data: indices } = useQuery('marketIndices', marketAPI.getIndices);

  // 🎯 处理assets API返回的真实portfolio数据
  const portfolioData = useMemo(() => {
    if (!portfolio?.data) return null;
    
    const data = portfolio.data;
    const assetsByType = data.assetsByType || {};

    // 从assets API获取总投资组合价值
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
    
    // 🚫 不使用模拟的今日变化数据，需要基于真实当日价格变化计算
    const todayChange = 0; // 暂时设为0，等待真实当日价格变化数据
    const todayChangePercentValue = 0;
    
    // 🏦 获取现金数据
    const cashAmount = assetsByType.cash?.totalValue || 0;
    
    return {
      // 基础信息
      totalAssets: data.totalAssets || 0,
      
      // 财务数据
      totalValue: totalPortfolioValue, // 总投资组合价值（API已包含所有资产）
      cash: cashAmount,
      
      // 今日变化 (等待真实当日价格数据)
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

  

  // 📊 获取历史数据（无缓存，每次都重新获取）
  const fetchHistoryData = async (timeRange) => {
    if (!portfolioData?.assetsByType) {
      console.log(`❌ portfolioData?.assetsByType 不存在`);
      return null;
    }
    
    try {
      console.log(`📈 获取 ${timeRange} 历史数据...`);
      setIsLoadingHistory(true);
      
      // 获取所有资产
      const allAssets = [];
      Object.values(portfolioData.assetsByType).forEach(typeData => {
        if (typeData.assets) {
          allAssets.push(...typeData.assets);
        }
      });
      
      if (allAssets.length === 0) return null;
      
      // 获取主要资产的历史数据（按价值排序，取前3个）
      const majorAssets = allAssets
        .sort((a, b) => (b.quantity * b.current_price) - (a.quantity * a.current_price))
        .slice(0, 3);
      
      // 将前端时间范围转换为后端期望的格式
      const periodMap = {
        '1M': '1mo',
        '3M': '3mo', 
        '1Y': '1y'
      };
      const periodParam = periodMap[timeRange] || '1mo';
      
      console.log(`🔄 时间范围转换: ${timeRange} → ${periodParam}`);
      
      // 并行获取历史数据，传递正确的时间范围参数
      const historyPromises = majorAssets.map(async asset => {
        try {
          console.log(`🔍 获取 ${asset.symbol} 的 ${periodParam} 历史数据...`);
          
          // 获取历史数据
          const apiUrl = buildApiUrl(`/market/history/${asset.symbol}?period=${periodParam}`);
          
          const response = await fetch(apiUrl);
          const data = await response.json();
          if (data.success && data.data) {
            console.log(`✅ ${asset.symbol} 获取到 ${data.data.length} 个历史数据点 (${periodParam})`);
            

            
            return {
              symbol: asset.symbol,
              weight: (asset.quantity * asset.current_price) / portfolioData.totalValue,
              history: data.data
            };
          } else {
            console.warn(`❌ ${asset.symbol} 历史数据获取失败:`, data);
          }
        } catch (error) {
          console.warn(`获取 ${asset.symbol} 历史数据失败:`, error);
        }
        return null;
      });
      
      const results = await Promise.all(historyPromises);
      const validResults = results.filter(r => r && r.history && r.history.length > 0);
      
      if (validResults.length === 0) {
        console.warn(`Dashboard: 没有获取到 ${timeRange} 的有效历史数据`);
        return null;
      }
      
      // 根据时间范围确定数据点数量
      let targetDays = 30;
      if (timeRange === '3M') targetDays = 90;
      else if (timeRange === '1Y') targetDays = 365;
      
      console.log(`📊 ${timeRange} 时间范围设置: targetDays = ${targetDays}`);
      
      // 计算加权投资组合历史价值
      const allDates = validResults[0].history.map(h => h.date);
      
      // 使用最后N天的数据
      const recentDates = allDates.slice(-Math.min(targetDays, allDates.length));
      console.log(`📅 ${timeRange}时间范围: 总共${allDates.length}天, 请求${targetDays}天, 实际使用${recentDates.length}天`);
      
      console.log(`📅 数据时间范围: ${recentDates[0]} 到 ${recentDates[recentDates.length - 1]}`);
      
      const portfolioValues = [];
      const labels = [];
      
      recentDates.forEach((date, index) => {
        let portfolioValue = 0;
        
        validResults.forEach(asset => {
          const historicalPoint = asset.history.find(h => h.date === date);
          const currentPoint = asset.history[asset.history.length - 1];
          
          if (historicalPoint && currentPoint && currentPoint.price > 0) {
            const currentAssetValue = (asset.weight * portfolioData.totalValue);
            const historicalAssetValue = currentAssetValue * (historicalPoint.price / currentPoint.price);
            portfolioValue += historicalAssetValue;
          } else if (currentPoint) {
            portfolioValue += (asset.weight * portfolioData.totalValue);
          }
        });
        
        portfolioValues.push(Math.round(portfolioValue));
        
        // 格式化标签 - 确保起始点和终点都显示，中间适当间隔
        const dateObj = new Date(date);
        let label = '';
        
        // 判断是否为关键点：起始点、终点、或间隔点
        const isFirstPoint = index === 0;
        const isLastPoint = index === recentDates.length - 1;
        
        if (targetDays <= 30) {
          // 1M: 显示更多日期标签
          const interval = Math.ceil(recentDates.length / 6); // 显示约6个标签
          const isIntervalPoint = index % interval === 0;
          
          if (isFirstPoint || isLastPoint || isIntervalPoint) {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            label = '';
          }
        } else if (targetDays <= 90) {
          // 3M: 显示更多日期标签，保证起始和终点
          const interval = Math.ceil(recentDates.length / 8); // 显示约8个标签
          const isIntervalPoint = index % interval === 0;
          
          if (isFirstPoint || isLastPoint || isIntervalPoint) {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            label = '';
          }
        } else if (targetDays <= 365) {
          // 1Y: 显示月份标签，不显示具体日期
          const interval = Math.ceil(recentDates.length / 12); // 显示约12个标签
          const isIntervalPoint = index % interval === 0;
          
          if (isFirstPoint || isLastPoint || isIntervalPoint) {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          } else {
            label = '';
          }
        }
        labels.push(label);
      });
      
      const historyData = { labels, values: portfolioValues };
      
      // 统计标签显示情况
      const nonEmptyLabels = labels.filter(label => label !== '');
      const startDate = new Date(recentDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endDate = new Date(recentDates[recentDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      console.log(`✅ ${timeRange} (${periodParam}) 历史数据获取完成: ${portfolioValues.length}个数据点`);
      console.log(`📅 时间范围: ${startDate} → ${endDate}`);
      console.log(`📋 显示标签 (${nonEmptyLabels.length}个):`, nonEmptyLabels);
      setIsLoadingHistory(false);
      return historyData;
      
    } catch (error) {
      console.error(`❌ 获取 ${timeRange} 历史数据失败:`, error);
      setIsLoadingHistory(false);
      return null;
    }
  };
  
  // 🔄 时间范围变化时获取历史数据（支持所有时间范围）
  useEffect(() => {
    const loadHistoryData = async () => {
      if (portfolioData) {
        console.log(`🔄 获取 ${selectedTimeRange} 历史数据`);
        
        const historyData = await fetchHistoryData(selectedTimeRange);
        console.log(`📊 ${selectedTimeRange} 数据获取结果:`, historyData ? `${historyData.values.length}个数据点` : 'null');
        setCurrentHistoryData(historyData);
      }
    };

    loadHistoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeRange, portfolioData]);

  // 🚀 组件初始化时准备数据加载
  useEffect(() => {
    console.log('📊 Dashboard组件加载完成，支持1M、3M、1Y时间范围');
  }, []);

  // 📊 只使用真实数据，不生成任何模拟数据
  const historicalData = useMemo(() => {
    if (currentHistoryData) {
      console.log(`📈 Dashboard显示真实数据: ${currentHistoryData.values.length}个点 (${selectedTimeRange})`);
      return currentHistoryData;
    }
    
    console.log(`⏳ 等待 ${selectedTimeRange} 真实数据，不使用模拟数据`);
    return null; // 没有真实数据就返回null，不画图表
  }, [selectedTimeRange, currentHistoryData]);

  const netWorthChartData = {
    labels: historicalData?.labels || [],
    datasets: [
      {
        label: 'Portfolio Value',
        data: historicalData?.values || [],

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
          maxRotation: 45, // 允许适当旋转以防止重叠
          minRotation: 0,
          // 移除 maxTicksLimit，让我们的自定义标签逻辑控制显示
        },
      },
      y: {
        display: true, // ✅ 显示纵坐标
        grid: {
          display: true,
          color: 'rgba(200,200,200,0.1)', // 可选：网格线颜色
        },
        ticks: {
          color: '#6b7280', // ✅ 字体颜色
          callback: function(value) {
            // 格式化纵坐标标签为货币
            return '$' + (value / 1000).toFixed(0) + 'k';
          },
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: '#D4961F', // 深金色悬停
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 2
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Portfolio Performance
                  </Typography>
                  {/* 所有时间范围都支持，移除Coming Soon标签 */}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['1M', '3M', '1Y'].map((period) => (
                    <Chip 
                      key={period}
                      label={period} 
                      size="small" 
                      clickable={true}
                      color={selectedTimeRange === period ? 'primary' : 'default'}
                      variant={selectedTimeRange === period ? 'filled' : 'outlined'}
                      onClick={() => setSelectedTimeRange(period)}
                      sx={{
                        fontWeight: selectedTimeRange === period ? 600 : 500,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: selectedTimeRange === period 
                            ? 'primary.dark' 
                            : 'rgba(232, 168, 85, 0.1)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <Box sx={{ height: 300 }}>
                {historicalData ? (
                  <Line data={netWorthChartData} options={netWorthChartOptions} />
                ) : (
                  <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 2 
                  }}>
                    <CircularProgress size={40} sx={{ color: '#E8A855' }} />
                    <Typography variant="body2" color="text.secondary">
                      Fetching real market data for {selectedTimeRange}...
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Loading actual prices from Yahoo Finance
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Doughnut 图部分保持不变 */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
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
