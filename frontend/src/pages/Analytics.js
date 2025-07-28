import React, { useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,

} from '@mui/material';
import { Line, Bar } from 'react-chartjs-2';
import { useQuery } from 'react-query';
import { portfolioAPI, formatCurrency, formatPercentage } from '../services/api';

const Analytics = () => {
  const { data: portfolio, isLoading } = useQuery(
    'currentPortfolio',
    portfolioAPI.getCurrentPortfolio
  );

  // Removed loading animation

  // Mock performance data
  const performanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Portfolio Performance',
        data: [65, 59, 80, 81, 56, 55],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        fill: true,
      },
      {
        label: 'S&P 500',
        data: [55, 49, 60, 71, 46, 45],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  const sectorData = {
    labels: ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial'],
    datasets: [
      {
        label: 'Allocation %',
        data: [35, 20, 15, 20, 10],
        backgroundColor: [
          '#6366f1',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#ffffff',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      y: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Portfolio Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label="YTD" size="small" />
          <Chip label="1Y" size="small" variant="outlined" />
          <Chip label="3Y" size="small" />
          <Chip label="5Y" size="small" />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Return
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                +12.4%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                vs S&P 500: +8.2%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sharpe Ratio
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                1.24
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Risk-adjusted return
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Volatility
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                15.2%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annual volatility
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Performance Comparison
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line 
                  key="performance-chart"
                  data={performanceData} 
                  options={chartOptions}
                  redraw={true}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Sector Allocation
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar 
                  key="sector-chart"
                  data={sectorData} 
                  options={chartOptions}
                  redraw={true}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics; 