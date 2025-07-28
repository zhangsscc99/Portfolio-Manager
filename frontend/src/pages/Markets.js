import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Chip,

} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { marketAPI, formatCurrency, formatPercentage, getChangeColor } from '../services/api';

const Markets = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: gainers, isLoading: gainersLoading } = useQuery('marketGainers', () => marketAPI.getGainers(10));
  const { data: losers, isLoading: losersLoading } = useQuery('marketLosers', () => marketAPI.getLosers(10));
  const { data: trending, isLoading: trendingLoading } = useQuery('marketTrending', () => marketAPI.getTrending(10));
  const { data: indices, isLoading: indicesLoading } = useQuery('marketIndices', marketAPI.getIndices);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const isLoading = gainersLoading || losersLoading || trendingLoading || indicesLoading;

  const renderStockTable = (data, title) => (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          {title}
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Change</TableCell>
                <TableCell align="right">% Change</TableCell>
                <TableCell align="right">Volume</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((stock) => (
                <TableRow key={stock.symbol} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{stock.symbol}</TableCell>
                  <TableCell>{stock.name}</TableCell>
                  <TableCell align="right">{formatCurrency(stock.price)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ color: getChangeColor(stock.change), fontWeight: 500 }}
                  >
                    {formatCurrency(stock.change)}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ color: getChangeColor(stock.changePercent), fontWeight: 500 }}
                  >
                    {formatPercentage(stock.changePercent)}
                  </TableCell>
                  <TableCell align="right">
                    {stock.volume ? stock.volume.toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  // Removed loading animation

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Market Overview
        </Typography>
        <TextField
          size="small"
          placeholder="Search stocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
      </Box>

      {/* Market Indices */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {indices?.data?.map((index) => (
          <Grid item xs={12} sm={6} md={3} key={index.symbol}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {index.symbol}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  {formatCurrency(index.price)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: getChangeColor(index.change),
                      fontWeight: 500 
                    }}
                  >
                    {formatCurrency(index.change)} ({formatPercentage(index.changePercent)})
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Market Data Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Trending" />
          <Tab label="Gainers" />
          <Tab label="Losers" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && renderStockTable(trending?.data, 'Trending Stocks')}
      {tabValue === 1 && renderStockTable(gainers?.data, 'Top Gainers')}
      {tabValue === 2 && renderStockTable(losers?.data, 'Top Losers')}
    </Box>
  );
};

export default Markets; 