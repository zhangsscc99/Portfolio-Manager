import React, { useState, useMemo, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown
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
import '../styles/localGlow.css'; // 导入渐变和动画样式

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
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioTrendData, setPortfolioTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assetPrices, setAssetPrices] = useState({});

  // 📊 获取Portfolio数据 - 与Portfolio.js保持一致
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

  // 📈 获取Portfolio趋势数据 - 与Portfolio.js保持一致
  const fetchPortfolioTrendData = async () => {
    try {
      const response = await fetch(buildApiUrl(`/portfolio-trend/1`));
      const data = await response.json();
      if (data.success) {
        setPortfolioTrendData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio trend data:', error);
    }
  };

  // 💰 获取资产价格 - 与Portfolio.js保持一致
  const fetchAssetPrice = async (symbol) => {
    if (assetPrices[symbol]) {
      console.log(`💰 Price already cached for ${symbol}:`, assetPrices[symbol]);
      return;
    }

    try {
      console.log(`🔄 Fetching price for ${symbol}...`);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.assets.bySymbol(symbol)));
      const result = await response.json();
      if (result.success && result.data) {
        const assetData = result.data;
        const price = assetData.current_price;
        console.log(`✅ Fetched price for ${symbol}: $${price}`);
        setAssetPrices(prev => ({
          ...prev,
          [symbol]: {
            price: price
          }
        }));
      } else {
        console.log(`⚠️ No price data for ${symbol}:`, result);
      }
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
    }
  };

  // 🎯 处理dashboard数据 - 基于Portfolio数据计算
  const dashboardData = useMemo(() => {
    if (!portfolioData) return null;
    
    // 计算总市值
    let totalValue = 0;
    let cash = 0;
    const allocation = {
      stocks: { totalValue: 0 },
      crypto: { totalValue: 0 },
      etfs: { totalValue: 0 },
      bonds: { totalValue: 0 },
      cash: { totalValue: 0 }
    };
    
    // 处理各类型资产
    console.log('📊 Processing portfolio assets:', portfolioData.assetsByType);
    console.log('💰 Current asset prices:', assetPrices);
    console.log('📋 All asset types found:', Object.keys(portfolioData.assetsByType || {}));
    
    Object.entries(portfolioData.assetsByType || {}).forEach(([type, typeData]) => {
      let typeTotalValue = 0;
      console.log(`🔄 Processing ${type}:`, typeData);
      console.log(`📋 Asset type: "${type}"`);
      console.log(`📊 Assets in ${type}:`, typeData.assets?.length || 0);
      console.log(`📈 Asset symbols in ${type}:`, typeData.assets?.map(a => a.symbol) || []);
      
      typeData.assets?.forEach(asset => {
        const currentPrice = assetPrices[asset.symbol]?.price;
        console.log(`  🔍 Checking ${asset.symbol}: price=${currentPrice}, quantity=${asset.quantity}`);
        if (currentPrice) {
          const quantity = parseFloat(asset.quantity);
          const price = parseFloat(currentPrice);
          const assetValue = price * quantity;
          typeTotalValue += assetValue;
          totalValue += assetValue;
          console.log(`  📈 ${asset.symbol}: ${quantity} × $${price} = $${assetValue}`);
        } else {
          console.log(`  ⚠️ No price for ${asset.symbol}`);
        }
      });
      
      console.log(`💰 ${type} total value: $${typeTotalValue}`);
      
      // 按类型分类
      console.log(`🏷️ Classifying ${type} with value $${typeTotalValue}`);
      if (type === 'EQUITY' || type === 'STOCK' || type === 'STOCKS') {
        allocation.stocks.totalValue = typeTotalValue;
        console.log(`✅ Classified as STOCKS`);
      } else if (type === 'CRYPTOCURRENCY' || type === 'CRYPTO' || type === 'CRYPTOCURRENCIES') {
        allocation.crypto.totalValue = typeTotalValue;
        console.log(`✅ Classified as CRYPTO`);
      } else if (type === 'ETF' || type === 'ETFS' || type === 'EXCHANGE_TRADED_FUND') {
        allocation.etfs.totalValue = typeTotalValue;
        console.log(`✅ Classified as ETFS`);
      } else if (type === 'INDEX' || type === 'BOND' || type === 'BONDS' || type === 'FIXED_INCOME') {
        allocation.bonds.totalValue = typeTotalValue;
        console.log(`✅ Classified as BONDS`);
      } else {
        console.log(`⚠️ Unknown asset type: "${type}" - adding to stocks as fallback`);
        allocation.stocks.totalValue += typeTotalValue;
      }
    });
    
    // 计算现金（如果有的话）
    if (portfolioData.cash) {
      cash = portfolioData.cash;
      allocation.cash.totalValue = cash;
      totalValue += cash;
    }
    
    // 计算今日变化（基于趋势数据）
    let todayChange = 0;
    let todayChangePercent = 0;
    let totalReturn = 0;
    let totalReturnPercent = 0;
    
    if (portfolioTrendData?.performanceData) {
      totalReturn = portfolioTrendData.performanceData.totalReturn;
      totalReturnPercent = portfolioTrendData.performanceData.totalReturnPercent;
      // 简化计算今日变化（实际应该从实时数据计算）
      todayChange = totalReturn * 0.01; // 简化示例
      todayChangePercent = totalReturnPercent * 0.01;
    }
    
    const result = {
      // 基础信息
      totalAssets: Object.values(portfolioData.assetsByType || {}).reduce((sum, type) => sum + (type.count || 0), 0),
      
      // 财务数据
      totalValue,
      cash,
      
      // 今日变化
      todayChange,
      todayChangePercent,
      
      // 持仓统计
      holdingsCount: Object.values(portfolioData.assetsByType || {}).reduce((sum, type) => sum + (type.count || 0), 0),
      activeHoldings: Object.values(portfolioData.assetsByType || {}).reduce((sum, type) => sum + (type.count || 0), 0),
      
      // 性能指标
      totalReturn,
      totalReturnPercent,
      
      // 资产配置数据
      allocation,
      
      // 原始数据
      topHoldings: [], // 可以从portfolioData中提取
      performance: portfolioTrendData?.performanceData || {}
    };
    
    console.log('🎯 Final dashboard data:', result);
    console.log('📊 Final allocation object:', result.allocation);
    return result;
  }, [portfolioData, assetPrices, portfolioTrendData]);

  // 🚀 组件初始化时加载数据
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

  // 💰 在portfolio数据加载后获取所有资产价格
  useEffect(() => {
    if (portfolioData?.assetsByType) {
      console.log('🔄 Fetching asset prices for portfolio data');
      const allSymbols = [];
      Object.values(portfolioData.assetsByType).forEach(typeData => {
        typeData.assets?.forEach(asset => {
          allSymbols.push(asset.symbol);
        });
      });

      console.log('📊 Symbols to fetch prices for:', allSymbols);
      allSymbols.forEach(symbol => fetchAssetPrice(symbol));
    }
  }, [portfolioData]);

  // 📊 使用portfolio trend数据作为历史数据
  const historicalData = useMemo(() => {
    if (portfolioTrendData?.timePoints && portfolioTrendData.timePoints.length > 0) {
      console.log(`📈 Dashboard显示portfolio trend数据: ${portfolioTrendData.timePoints.length}个点`);
      return {
        labels: portfolioTrendData.timePoints.map(date => {
          const d = new Date(date);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        values: portfolioTrendData.portfolioValues || []
      };
    }
    
    console.log(`⏳ 等待portfolio trend数据`);
    return null;
  }, [portfolioTrendData]);

  // 📈 获取市场数据 - 与Portfolio.js保持一致
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [indices, setIndices] = useState([]);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // 获取涨跌榜
        const gainersResponse = await fetch(buildApiUrl(API_ENDPOINTS.market.gainers(5)));
        const gainersData = await gainersResponse.json();
        if (gainersData.success) {
          setGainers(gainersData.data || []);
        }

        const losersResponse = await fetch(buildApiUrl(API_ENDPOINTS.market.losers(5)));
        const losersData = await losersResponse.json();
        if (losersData.success) {
          setLosers(losersData.data || []);
        }

        // 获取指数数据
        const indicesResponse = await fetch(buildApiUrl(API_ENDPOINTS.market.indices));
        const indicesData = await indicesResponse.json();
        if (indicesData.success) {
          setIndices(indicesData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchMarketData();
  }, []);

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
    if (!dashboardData) {
      console.log('❌ dashboardData is null');
      return null;
    }

    console.log('📊 Generating allocation data from:', dashboardData);
    
    const labels = [];
    const data = [];
    const allocation = dashboardData.allocation;
    
    console.log('🎯 Allocation object:', allocation);

    // 🎨 创建渐变色函数
    const createGradient = (ctx, centerX, centerY, radius, colorStart, colorMid, colorEnd) => {
      try {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(0.3, colorMid);
        gradient.addColorStop(0.7, colorEnd);
        
        // 边缘淡化效果
        const fadeColor = hexToRgba(colorStart, 0.3);
        gradient.addColorStop(1, fadeColor);
        
        return gradient;
      } catch (error) {
        console.error('Gradient creation error:', error);
        return colorStart; // 回退到基本颜色
      }
    };

    // 🔧 hex转rgba工具函数（增强版）
    const hexToRgba = (hex, alpha = 1) => {
      try {
        // 移除#符号
        let cleanHex = hex.replace('#', '');
        
        // 支持3位hex格式
        if (cleanHex.length === 3) {
          cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        
        // 确保是6位格式
        if (cleanHex.length !== 6) {
          throw new Error(`Invalid hex length: ${cleanHex.length}`);
        }
        
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        
        // 检查是否解析成功
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          throw new Error(`Failed to parse RGB values`);
        }
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } catch (error) {
        console.warn(`Color conversion error for ${hex}:`, error.message);
        return `rgba(156, 168, 218, ${alpha})`; // 默认蓝色
      }
    };

    // 🌚 创建深色版本的颜色
    const darkenColor = (hex, factor = 0.75) => {
      try {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
          cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        
        const r = Math.round(parseInt(cleanHex.slice(0, 2), 16) * factor);
        const g = Math.round(parseInt(cleanHex.slice(2, 4), 16) * factor);
        const b = Math.round(parseInt(cleanHex.slice(4, 6), 16) * factor);
        
        // 确保值在0-255范围内
        const clampedR = Math.max(0, Math.min(255, r));
        const clampedG = Math.max(0, Math.min(255, g));
        const clampedB = Math.max(0, Math.min(255, b));
        
        // 转换回hex格式
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return `#${toHex(clampedR)}${toHex(clampedG)}${toHex(clampedB)}`;
      } catch (error) {
        console.warn(`Error darkening color ${hex}:`, error.message);
        return hex; // 返回原色作为备用
      }
    };

    // 🌈 简化的渐变色配置
    const gradientConfigs = [
      { start: '#9CA8DA', mid: '#A8B4E0', end: '#B1B8DD', name: 'Stocks' },
      { start: '#C49A71', mid: '#D0A47D', end: '#D4AA85', name: 'Crypto' },
      { start: '#9CA8DA', mid: '#B3A196', end: '#C49A71', name: 'ETFs' },
      { start: '#B1B8DD', mid: '#C3B1B1', end: '#D4AA85', name: 'Bonds' },
      { start: '#8B9FD6', mid: '#A3A2A1', end: '#BC9166', name: 'Cash' }
    ];

    let colorIndex = 0;

    // 股票
    if (allocation.stocks && allocation.stocks.totalValue > 0) {
      console.log('📈 Adding Stocks:', allocation.stocks.totalValue);
      labels.push('Stocks');
      data.push(allocation.stocks.totalValue);
      colorIndex++;
    } else {
      console.log('📈 Stocks value:', allocation.stocks?.totalValue);
    }

    // 加密货币
    if (allocation.crypto && allocation.crypto.totalValue > 0) {
      console.log('₿ Adding Crypto:', allocation.crypto.totalValue);
      labels.push('Crypto');
      data.push(allocation.crypto.totalValue);
      colorIndex++;
    } else {
      console.log('₿ Crypto value:', allocation.crypto?.totalValue);
    }

    // ETFs
    if (allocation.etfs && allocation.etfs.totalValue > 0) {
      console.log('🏛️ Adding ETFs:', allocation.etfs.totalValue);
      labels.push('ETFs');
      data.push(allocation.etfs.totalValue);
      colorIndex++;
    } else {
      console.log('🏛️ ETFs value:', allocation.etfs?.totalValue);
    }

    // 债券
    if (allocation.bonds && allocation.bonds.totalValue > 0) {
      console.log('📜 Adding Bonds:', allocation.bonds.totalValue);
      labels.push('Bonds');
      data.push(allocation.bonds.totalValue);
      colorIndex++;
    } else {
      console.log('📜 Bonds value:', allocation.bonds?.totalValue);
    }

    // 现金
    if (allocation.cash && allocation.cash.totalValue > 0) {
      console.log('💰 Adding Cash:', allocation.cash.totalValue);
      labels.push('Cash');
      data.push(allocation.cash.totalValue);
      colorIndex++;
    } else {
      console.log('💰 Cash value:', allocation.cash?.totalValue);
    }

    // 如果没有任何数据，显示空状态
    if (data.length === 0) {
      console.log('⚠️ No allocation data found, showing empty state');
      labels.push('No Investments');
      data.push(1);
    }

    console.log('✅ Final allocation data:', { labels, data });
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          
          if (!chartArea) {
            return null;
          }
          
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;
          const radius = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
          
          const dataIndex = context.dataIndex;
          const config = gradientConfigs[dataIndex] || gradientConfigs[0];
          
          return createGradient(ctx, centerX, centerY, radius * 0.8, config.start, config.mid, config.end);
        },
        hoverBackgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          
          if (!chartArea) {
            return null;
          }
          
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;
          const radius = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
          
          const dataIndex = context.dataIndex;
          const config = gradientConfigs[dataIndex] || gradientConfigs[0];
          
          // 🌚 创建深色版本的渐变
          const darkStart = darkenColor(config.start, 0.8);
          const darkMid = darkenColor(config.mid, 0.8);
          const darkEnd = darkenColor(config.end, 0.8);
          
          return createGradient(ctx, centerX, centerY, radius * 0.85, darkStart, darkMid, darkEnd);
        },
        borderWidth: 2,
        borderColor: function(context) {
          const dataIndex = context.dataIndex;
          const config = gradientConfigs[dataIndex] || gradientConfigs[0];
          return hexToRgba(config.start, 0.3);
        },
        hoverBorderWidth: 3,
        hoverBorderColor: function(context) {
          const dataIndex = context.dataIndex;
          const config = gradientConfigs[dataIndex] || gradientConfigs[0];
          const darkBorderColor = darkenColor(config.start, 0.7);
          return hexToRgba(darkBorderColor, 0.8); // 更深的边框色
        },
      }]
    };
  }, [dashboardData]);

  const allocationOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1500,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#ffffff',
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
            weight: '500'
          },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              // 🌈 渐变色配置
              const gradientConfigs = [
                { start: '#9CA8DA', mid: '#A8B4E0', end: '#B1B8DD' },
                { start: '#C49A71', mid: '#D0A47D', end: '#D4AA85' },
                { start: '#9CA8DA', mid: '#B3A196', end: '#C49A71' },
                { start: '#B1B8DD', mid: '#C3B1B1', end: '#D4AA85' },
                { start: '#8B9FD6', mid: '#A3A2A1', end: '#BC9166' }
              ];
              
              return data.labels.map((label, i) => {
                const meta = chart.getDatasetMeta(0);
                const config = gradientConfigs[i] || gradientConfigs[0];
                
                return {
                  text: label,
                  fillStyle: config.start, // 使用渐变起始色作为legend颜色
                  strokeStyle: config.mid, // 使用中间色作为边框
                  lineWidth: 2,
                  pointStyle: 'circle',
                  hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                  index: i
                };
              });
            }
            return [];
          }
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(156, 168, 218, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '65%',
    radius: '90%',
    interaction: {
      intersect: false,
      mode: 'nearest'
    },
    elements: {
      arc: {
        borderWidth: 2,
        hoverBorderWidth: 4,
        borderAlign: 'inner'
      }
    }
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
                {loading ? 'Loading...' : formatCurrency(dashboardData?.totalValue || 0)}
              </Typography>
              {dashboardData?.totalReturn !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {dashboardData.totalReturn >= 0 ? (
                    <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                  ) : (
                    <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
                  )}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: dashboardData.totalReturn >= 0 ? 'success.main' : 'error.main' 
                    }}
                  >
                    {dashboardData.totalReturn >= 0 ? '+' : ''}{formatCurrency(dashboardData.totalReturn)} ({formatPercentage(dashboardData.totalReturnPercent)})
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
                {loading ? 'Loading...' : formatCurrency(dashboardData?.cash || 0)}
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
                Total Return
              </Typography>
              {loading ? (
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  Loading...
                </Typography>
              ) : dashboardData?.totalReturn !== undefined ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    {dashboardData.totalReturn >= 0 ? (
                      <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                    ) : (
                      <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />
                    )}
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        color: dashboardData.totalReturn >= 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {dashboardData.totalReturn >= 0 ? '+' : ''}{formatCurrency(dashboardData.totalReturn)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: dashboardData.totalReturn >= 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {dashboardData.totalReturnPercent >= 0 ? '+' : ''}{formatPercentage(dashboardData.totalReturnPercent)}
                    </Typography>
                  </Box>
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
                {loading ? 'Loading...' : (dashboardData?.holdingsCount || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboardData?.activeHoldings ? `${dashboardData.activeHoldings} active positions` : 'Active positions'}
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
                </Box>
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
                      {formatPercentage(portfolioTrendData.performanceData.totalReturnPercent)}
                    </Typography>
                  )}
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
                      Loading portfolio trend data...
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Based on portfolio performance history
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 🍰 精致饼图 - Asset Allocation */}
        <Grid item xs={12} lg={4}>
          <Card 
            sx={{ 
              height: 400,
              background: 'linear-gradient(135deg, rgba(156, 168, 218, 0.05) 0%, rgba(196, 154, 113, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(156, 168, 218, 0.1)',
              boxShadow: `
                0 8px 32px rgba(156, 168, 218, 0.15),
                0 0 0 1px rgba(156, 168, 218, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(156, 168, 218, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none'
              },
              '&:hover': {
                boxShadow: `
                  0 12px 40px rgba(156, 168, 218, 0.2),
                  0 0 0 1px rgba(156, 168, 218, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15)
                `,
                transform: 'translateY(-2px)',
                transition: 'all 0.3s ease-in-out'
              }
            }}
          >
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Typography 
                variant="h6" 
                className="gradient-text"
                sx={{ 
                  fontWeight: 600, 
                  mb: 3,
                  textAlign: 'center',
                  fontSize: '1.2rem'
                }}
              >
                Asset Allocation
              </Typography>
              <Box 
                sx={{ 
                  height: 300,
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '160px',
                    height: '160px',
                    background: `
                      radial-gradient(circle, 
                        rgba(156, 168, 218, 0.15) 0%, 
                        rgba(196, 154, 113, 0.10) 40%,
                        rgba(156, 168, 218, 0.05) 70%,
                        transparent 100%
                      )
                    `,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 0
                  },
                  '& .pie-chart-pulse': {
                    animation: 'pieChartPulse 3s ease-in-out infinite'
                  }
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 2, height: '100%' }}>
                  {/* 🌟 中心脉冲光晕 */}
                  <Box 
                    className="pie-chart-pulse"
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '80px',
                      height: '80px',
                      background: `
                        radial-gradient(circle, 
                          rgba(156, 168, 218, 0.25) 0%, 
                          rgba(196, 154, 113, 0.15) 50%,
                          transparent 100%
                        )
                      `,
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />
                  
                  {allocationData ? (
                    <Doughnut data={allocationData} options={allocationOptions} />
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: '100%' 
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        {loading ? 'Loading allocation data...' : 'No allocation data available'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
