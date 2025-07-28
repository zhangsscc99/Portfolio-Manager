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
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: gainers } = useQuery('marketGainers', () => marketAPI.getGainers(10));
  const { data: losers } = useQuery('marketLosers', () => marketAPI.getLosers(10));
  const { data: trending } = useQuery('marketTrending', () => marketAPI.getTrending(10));
  const { data: indices } = useQuery('marketIndices', marketAPI.getIndices);

  // 搜索功能
  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await marketAPI.searchStocks(query);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索
  React.useEffect(() => {
    const delayedSearch = setTimeout(() => {
      handleSearch(searchTerm);
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleStockClick = (stock) => {
    // 可以添加股票详情查看或添加到投资组合的功能
    console.log('Stock clicked:', stock);
    // TODO: 实现股票详情查看或添加到关注列表
  };

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
                <TableRow 
                  key={stock?.symbol || Math.random()} 
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleStockClick(stock)}
                >
                  <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {stock?.symbol || 'N/A'}
                  </TableCell>
                  <TableCell>{stock?.name || 'N/A'}</TableCell>
                  <TableCell align="right">{formatCurrency(stock?.price)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ color: getChangeColor(stock?.change), fontWeight: 500 }}
                  >
                    {formatCurrency(stock?.change)}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ color: getChangeColor(stock?.changePercent), fontWeight: 500 }}
                  >
                    {formatPercentage(stock?.changePercent)}
                  </TableCell>
                  <TableCell align="right">
                    {stock?.volume ? stock.volume.toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              )) || []}
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
          placeholder="Search stocks... (e.g., AAPL, Apple)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: isSearching && (
              <InputAdornment position="end">
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      {/* Market Indices */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {indices?.data?.map((index) => (
          <Grid item xs={12} sm={6} md={3} key={index?.symbol || Math.random()}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {index?.symbol || 'N/A'}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  {formatCurrency(index?.price)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: getChangeColor(index?.change),
                      fontWeight: 500 
                    }}
                  >
                    {formatCurrency(index?.change)} ({formatPercentage(index?.changePercent)})
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )) || []}
      </Grid>

      {/* Market Data Tabs - only show when not searching */}
      {!searchTerm && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Trending" />
            <Tab label="Gainers" />
            <Tab label="Losers" />
          </Tabs>
        </Box>
      )}

      {/* Search Results */}
      {searchTerm && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Search Results for "{searchTerm}"
            {isSearching && <span> - Searching...</span>}
          </Typography>
          {searchResults.length > 0 ? (
            renderStockTable(searchResults, `Search Results (${searchResults.length})`)
          ) : (
            !isSearching && (
              <Card>
                <CardContent>
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    {searchTerm.length < 2 ? 'Enter at least 2 characters to search' : 'No results found'}
                  </Typography>
                </CardContent>
              </Card>
            )
          )}
        </Box>
      )}

      {/* Tab Content - only show when not searching */}
      {!searchTerm && (
        <>
          {tabValue === 0 && renderStockTable(trending?.data, 'Trending Stocks')}
          {tabValue === 1 && renderStockTable(gainers?.data, 'Top Gainers')}
          {tabValue === 2 && renderStockTable(losers?.data, 'Top Losers')}
        </>
      )}
    </Box>
  );
};

export default Markets; 