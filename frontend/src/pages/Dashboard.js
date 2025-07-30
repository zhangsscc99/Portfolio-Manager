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


  const { data: portfolio } = useQuery('currentPortfolio', portfolioAPI.getCurrentPortfolio, {
    refetchInterval: 30000,
  });


  const { data: gainers } = useQuery('marketGainers', () => marketAPI.getGainers(5));
  const { data: losers } = useQuery('marketLosers', () => marketAPI.getLosers(5));
  const { data: indices } = useQuery('marketIndices', marketAPI.getIndices);

  const portfolioData = portfolio?.data;

  // ⭐️ 动态生成历史数据（关键修改）
  const historicalData = useMemo(() => {
    const labels = [];
    const data = [];
    const currentValue = portfolioData?.totalValue || 2317371;

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
  const allocationData = {
    labels: ['Stocks', 'Cash', 'ETFs', 'Bonds'],
    datasets: [
      {
        data: [
          portfolioData?.totalValue - portfolioData?.cash || 50000,
          portfolioData?.cash || 25000,
          15000,
          10000,
        ],
// <<<<<<< feature_backend1
//         backgroundColor: ['#E8A855', '#10b981', '#6366f1', '#F4BE7E'],
//         hoverBackgroundColor: ['#F4BE7E', '#34d399', '#F8D5A8', '#E8A855'],
// =======
        backgroundColor: [
          
          '#E8A855', // 金色 - Stocks
          '#10b981', // 保持绿色 - Cash  
          '#6366f1',  
          '#F4BE7E', // 浅金色 - ETFs
          '#D4961F', // 深金色 - Bonds
        ],
        hoverBackgroundColor: [
          '#F4BE7E', // 悬停时的浅金色 - Stocks
          '#34d399', // 悬停时的浅绿色 - Cash
          '#F8D5A8', // 悬停时的更浅金色 - ETFs
          '#E8A855', // 悬停时的中等金色 - Bonds
        ],
        
// >>>>>>> main
        borderWidth: 0,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff',
      },
    ],
  };

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
