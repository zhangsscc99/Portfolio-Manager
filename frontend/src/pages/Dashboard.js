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
    
    // 🔄 计算真实的今日变化数据
    let totalTodayChange = 0;
    let totalCurrentValue = 0;
    
    Object.values(assetsByType).forEach(typeData => {
      if (typeData.assets) {
        typeData.assets.forEach(asset => {
          const currentValue = asset.quantity * asset.current_price;
          totalCurrentValue += currentValue;
          
          // 如果资产有日变化数据，计算加权变化
          if (asset.dailyChange !== undefined && asset.dailyChange !== null) {
            totalTodayChange += asset.dailyChange * asset.quantity;
          } else if (asset.changePercent !== undefined && asset.changePercent !== null) {
            // 如果有百分比变化，转换为绝对值
            const previousPrice = asset.current_price / (1 + asset.changePercent / 100);
            const dailyChange = asset.current_price - previousPrice;
            totalTodayChange += dailyChange * asset.quantity;
          }
        });
      }
    });
    
    const todayChange = totalTodayChange;
    const todayChangePercentValue = totalCurrentValue > 0 ? (totalTodayChange / totalCurrentValue) * 100 : 0;
    
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
    if (!portfolioData) return null;

    const labels = [];
    const data = [];
    const allocation = portfolioData.allocation;

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
      labels.push('Stocks');
      data.push(allocation.stocks.totalValue);
      colorIndex++;
    }

    // 加密货币
    if (allocation.crypto && allocation.crypto.totalValue > 0) {
      labels.push('Crypto');
      data.push(allocation.crypto.totalValue);
      colorIndex++;
    }

    // ETFs
    if (allocation.etfs && allocation.etfs.totalValue > 0) {
      labels.push('ETFs');
      data.push(allocation.etfs.totalValue);
      colorIndex++;
    }

    // 债券
    if (allocation.bonds && allocation.bonds.totalValue > 0) {
      labels.push('Bonds');
      data.push(allocation.bonds.totalValue);
      colorIndex++;
    }

    // 现金
    if (portfolioData.cash > 0) {
      labels.push('Cash');
      data.push(portfolioData.cash);
      colorIndex++;
    }

    // 如果没有任何数据，显示空状态
    if (data.length === 0) {
      labels.push('No Investments');
      data.push(1);
    }

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
  }, [portfolioData]);

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
                    {portfolioData.todayChange >= 0 ? '+' : ''}{formatCurrency(portfolioData.todayChange)}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: portfolioData.todayChange >= 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {portfolioData.todayChange >= 0 ? '+' : ''}{formatCurrency(portfolioData.todayChange)}
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
                        Loading allocation data...
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
