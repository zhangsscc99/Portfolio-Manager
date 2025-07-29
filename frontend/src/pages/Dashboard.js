import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
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
  MoreVert,
  Add,
  Remove,
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

import { portfolioAPI, marketAPI, formatCurrency, formatPercentage, getChangeColor } from '../services/api';

// Register Chart.js components
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
  
  // Fetch portfolio data
  const { data: portfolio, isLoading: portfolioLoading } = useQuery(
    'currentPortfolio',
    portfolioAPI.getCurrentPortfolio,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch market gainers and losers
  const { data: gainers } = useQuery('marketGainers', () => marketAPI.getGainers(5));
  const { data: losers } = useQuery('marketLosers', () => marketAPI.getLosers(5));
  const { data: indices } = useQuery('marketIndices', marketAPI.getIndices);

  // Removed loading animation

  const portfolioData = portfolio?.data;

  // Generate mock historical data for the net worth chart
  const generateHistoricalData = () => {
    const data = [];
    const labels = [];
    const currentValue = portfolioData?.totalValue || 2317371;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Generate realistic portfolio growth
      const randomChange = (Math.random() - 0.5) * 0.02; // ±1% daily change
      const value = currentValue * (0.85 + (29 - i) * 0.005 + randomChange);
      data.push(Math.round(value));
    }
    
    return { labels, data };
  };

  const historicalData = generateHistoricalData();

  // Net Worth Chart Configuration
  const netWorthChartData = {
    labels: historicalData.labels,
    datasets: [
      {
        label: 'Portfolio Value',
        data: historicalData.data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const netWorthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
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
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          maxTicksLimit: 6,
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
        hoverBackgroundColor: '#6366f1',
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 2,
      },
    },
  };

  // Asset Allocation Chart
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
        backgroundColor: [
          '#6366f1',
          '#10b981',
          '#f59e0b',
          '#ef4444',
        ],
        borderWidth: 0,
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
          label: function(context) {
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
      {/* Header Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Net Worth */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Net Worth
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(portfolioData?.totalValue || 2317371)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: 'success.main' }}>
                  +$3,662 (+0.16%)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cash */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cash
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(portfolioData?.cash || 25000)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available for investing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Day Change */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Today's Change
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                +$3,662
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: 'success.main' }}>
                  +0.16%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Holdings Count */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Holdings
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {portfolioData?.holdings?.length || 5}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active positions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Net Worth Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Portfolio Performance
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['1M', '3M', '1Y', 'ALL'].map((period) => (
                    <Chip 
                      key={period}
                      label={period} 
                      size="small" 
                      clickable
                      color={selectedTimeRange === period ? 'primary' : 'default'}
                      variant={selectedTimeRange === period ? 'filled' : 'outlined'}
                      onClick={() => setSelectedTimeRange(period)}
                      sx={{
                        fontWeight: selectedTimeRange === period ? 600 : 500,
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
                <Line data={netWorthChartData} options={netWorthChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Allocation */}
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

        {/* Holdings Table */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Your Holdings
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Shares</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {portfolioData?.holdings?.slice(0, 5).map((holding) => (
                      <TableRow key={holding.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{holding.symbol}</TableCell>
                        <TableCell>{holding.name}</TableCell>
                        <TableCell align="right">{holding.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(holding.currentPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(holding.currentValue)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              color: getChangeColor(holding.gainLoss),
                              fontWeight: 500,
                            }}
                          >
                            {formatPercentage(holding.gainLossPercent)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Movers */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            {/* Top Gainers */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Market Movers
                  </Typography>
                  
                  <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                    Today's Gainers
                  </Typography>
                  {gainers?.data?.slice(0, 3).map((stock) => (
                    <Box key={stock.symbol} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {stock.symbol}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(stock.price)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                        {formatPercentage(stock.changePercent)}
                      </Typography>
                    </Box>
                  ))}

                  <Typography variant="subtitle2" color="error.main" sx={{ mb: 1, mt: 2 }}>
                    Today's Losers
                  </Typography>
                  {losers?.data?.slice(0, 3).map((stock) => (
                    <Box key={stock.symbol} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {stock.symbol}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(stock.price)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500 }}>
                        {formatPercentage(stock.changePercent)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Market Indices */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Market Indices
                  </Typography>
                  {indices?.data?.map((index) => (
                    <Box key={index.symbol} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {index.symbol}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(index.price)}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getChangeColor(index.change),
                          fontWeight: 500,
                        }}
                      >
                        {formatPercentage(index.changePercent)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 