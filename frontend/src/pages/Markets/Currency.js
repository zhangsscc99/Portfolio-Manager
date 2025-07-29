// src/pages/markets/Currency.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { marketAPI, formatCurrency, formatPercentage, getChangeColor } from '../../services/api'; // Please check if the path is correct

const Currency = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Use React Query to fetch currency data
  const { data: currencyData, isLoading: currencyLoading, error: currencyError } = useQuery(
    'currencyMarketData', // Query key, ensure uniqueness
    () => marketAPI.getCurrencies(50), // Call API function, get 50 items
    {
      cacheTime: 30000, // 30 seconds cache
      staleTime: 30000, // Data considered fresh for 30 seconds
      retry: 2, // Retry 2 times on failure
    }
  );

  // Debugging data and error messages
  useEffect(() => {
    if (currencyData) {
      console.log('Currency data:', currencyData);
    }
    if (currencyError) {
      console.error('Currency error:', currencyError);
    }
  }, [currencyData, currencyError]);

  // Local search function (only searches currently loaded currency data)
  const handleSearch = (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const lowerCaseQuery = query.toLowerCase();
    // Assuming currencyData.data is the array containing currency data
    const filteredResults = (currencyData?.data || []).filter(item =>
      item?.symbol?.toLowerCase().includes(lowerCaseQuery) ||
      item?.name?.toLowerCase().includes(lowerCaseQuery)
    );
    setSearchResults(filteredResults);
    setIsSearching(false);
  };

  // Debounced search for input
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, currencyData]); // Trigger on search term or original data change

  const handleCurrencyClick = (currency) => {
    // Logic for when a currency is clicked, e.g., navigate to a detail page or show more info
    console.log('Currency clicked:', currency);
    // TODO: Implement currency details view or other functionality
  };

  // Render table content
  const renderCurrencyTable = (data, isLoading = false, error = null) => (
    <Card>
      <CardContent>
        {/* Error State */}
        {error && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="error" variant="body2">
              Failed to load: {error.message || 'Backend API call failed'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Backend API URL: {process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}
            </Typography>
          </Box>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                border: '3px solid',
                borderColor: 'primary.main',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                mx: 'auto',
                mb: 2,
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
            <Typography color="text.secondary">
              Loading currency data...
            </Typography>
          </Box>
        )}

        {/* Data Table */}
        {!isLoading && !error && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">% Change</TableCell>
                  <TableCell align="right">52 Wk Range</TableCell> {/* New 52-week range column */}
                </TableRow>
              </TableHead>
              <TableBody>
                {(data && data.length > 0) ? (
                  data.map((currency) => (
                    <TableRow
                      key={currency?.symbol || Math.random()}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleCurrencyClick(currency)}
                    >
                      <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {currency?.symbol || 'N/A'}
                      </TableCell>
                      <TableCell>{currency?.name || 'N/A'}</TableCell>
                      <TableCell align="right">{formatCurrency(currency?.price, 'USD')}</TableCell> {/* Assuming base currency is USD */}
                      <TableCell
                        align="right"
                        sx={{ color: getChangeColor(currency?.change), fontWeight: 500 }}
                      >
                        {formatCurrency(currency?.change, 'USD')}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: getChangeColor(currency?.changePercent), fontWeight: 500 }}
                      >
                        {formatPercentage(currency?.changePercent)}
                      </TableCell>
                      <TableCell align="right">
                        {currency?.fiftyTwoWeekLow !== undefined && currency?.fiftyTwoWeekHigh !== undefined
                          ? `${formatCurrency(currency.fiftyTwoWeekLow, 'USD')} - ${formatCurrency(currency.fiftyTwoWeekHigh, 'USD')}`
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>
                      <Typography color="text.secondary">
                        No currency data available
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  // Determine whether to display raw data or search results based on search term
  const displayData = searchTerm ? searchResults : (currencyData?.data || []);

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Currencies
        </Typography>
        <TextField
          size="small"
          placeholder="Search currencies... (e.g., EURUSD, GBPJPY)"
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

      {renderCurrencyTable(displayData, currencyLoading, currencyError)}
    </Box>
  );
};

export default Currency;