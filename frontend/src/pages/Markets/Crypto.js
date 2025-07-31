import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CircularProgress,
  TablePagination,
  Grid,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query'; // Keep useQuery for API fetching

// Ensure these paths are correct
import { formatCurrency, getPercentageColorFromString, getChangeColor, marketAPI } from '../../services/api'; // Assuming marketAPI contains getCryptos
import StockSearchField from '../../components/StockSearchField';
import toast from 'react-hot-toast'; // For error notifications

const Crypto = () => {
  const debounceTimerRef = useRef(null);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [searchValue, setSearchValue] = useState(null);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Corrected typo from setRowsRowsPerPage

  // --- useQuery for data fetching ---
  const {
    data: baseData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery(
    ['allCryptos', page + 1, rowsPerPage],
    () => marketAPI.getCryptos(page + 1, rowsPerPage),
    {
      staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch automatically on window focus
      onError: (err) => {
        toast.error(`Failed to load cryptocurrency data: ${err.message}`);
        console.error("API Fetch Error:", err);
      },
      keepPreviousData: true, // Keep old data visible while fetching new data for better UX
    }
  );

  // Extract data and totalRecords from the API response
  const cryptoData = baseData?.data || [];
  const totalRecords = baseData?.totalRecords || 0;


  // Helper function to format large numbers (e.g., Volume, Market Cap)
  const formatLargeNumber = useCallback((num) => {
    if (num === null || num === undefined) return 'N/A';
    const number = Number(num);
    if (isNaN(number)) return 'N/A';

    // Handle very small numbers for crypto prices, if necessary (though usually price is formatted by formatCurrency)
    // This part might be redundant if formatCurrency handles it well.
    if (number > 0 && number < 0.000001) { // For numbers like 0.000000123
        return number.toPrecision(3); // Show 3 significant figures
    }
    if (number >= 1_000_000_000_000) return (number / 1_000_000_000_000).toFixed(2) + 'T'; // Trillions
    if (number >= 1_000_000_000) return (number / 1_000_000_000).toFixed(2) + 'B'; // Billions
    if (number >= 1_000_000) return (number / 1_000_000).toFixed(2) + 'M'; // Millions
    if (number >= 1_000) return (number / 1_000).toFixed(2) + 'K'; // Thousands
    return number.toFixed(2).toString(); // Default to 2 decimal places
  }, []);

  // --- Pagination Handlers ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  // Search handlers
  const handleSelectCrypto = (crypto) => {
    setSelectedCrypto(crypto);
  };

  const handleClearSearch = () => {
    setSelectedCrypto(null);
    setSearchValue(null);
  };

  const renderCryptoTable = (data) => (
    <Card>
      <CardContent>
        {isLoading || isFetching ? ( // Use isLoading and isFetching from useQuery
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading cryptocurrencies...
            </Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, flexDirection: 'column' }}>
            <Typography variant="h6" color="error.main">
              Error loading crypto data.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {error?.message || "Please try again later."}
            </Typography>
             <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ensure your backend server is running and accessible.
            </Typography>
          </Box>
        ) : (data && data.length > 0) ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">Change %</TableCell>
                  <TableCell align="right">Market Cap</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="right">Volume (24h)</TableCell>
                  <TableCell align="right">Market Cap</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((crypto) => (
                  <TableRow key={crypto.symbol} hover sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{crypto.symbol}</TableCell>
                    <TableCell>{crypto.name}</TableCell>
                    <TableCell align="right">{crypto.price}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getChangeColor(crypto.change), fontWeight: 500 }}
                    >
                      {crypto.change.startsWith('-') ? crypto.change : '+' + crypto.change}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getPercentageColorFromString(crypto.changePercent), fontWeight: 500 }} // Assuming getChangeColor also works for percentage
                    >
                      {crypto.changePercent.startsWith('-') ? crypto.changePercent : '+' + crypto.changePercent}
                    </TableCell>
                    <TableCell align="right">{crypto.marketCap}</TableCell>
                    <TableCell align="right">{crypto.totalVolume}</TableCell>
                    <TableCell align="right">{crypto.volume24Hr}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">
              No cryptocurrency data found.
            </Typography>
          </Box>
        )}
      </CardContent>
      {/* Show pagination controls only when data is not loading/fetching and there are records */}
      {!(isLoading || isFetching) && (totalRecords > 0) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalRecords} // Use totalRecords from API for accurate count
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      )}
    </Card>
  );

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Cryptocurrencies
        </Typography>
      </Box>

      {/* Search Section */}
      <Box sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon />
          Search Cryptocurrencies
        </Typography>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={10}>
            <StockSearchField
              assetType="crypto"
              label="Search cryptocurrencies..."
              placeholder="Type symbol or name to search cryptocurrencies"
              onSelectStock={handleSelectCrypto}
              value={searchValue}
              onChange={setSearchValue}
            />
          </Grid>
          {selectedCrypto && (
            <Grid item xs={12}>
              <Card sx={{ 
                background: 'rgba(156, 168, 218, 0.1)',
                border: '1px solid rgba(156, 168, 218, 0.3)',
                mt: 2
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#9CA8DA' }}>
                    Search Result:
                  </Typography>
                  
                  {/* Table-style display */}
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Change</TableCell>
                        <TableCell align="right">Change %</TableCell>
                        <TableCell align="right">Volume</TableCell>
                        <TableCell align="right">Market Cap</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{selectedCrypto.symbol}</TableCell>
                        <TableCell>{selectedCrypto.name || selectedCrypto.longname}</TableCell>
                        <TableCell align="right">{selectedCrypto.price ? `$${parseFloat(selectedCrypto.price).toFixed(2)}` : '-'}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: selectedCrypto.change && parseFloat(selectedCrypto.change) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}
                        >
                          {selectedCrypto.change ? (selectedCrypto.change.toString().startsWith('-') ? selectedCrypto.change : '+' + selectedCrypto.change) : '-'}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: selectedCrypto.changePercent && parseFloat(selectedCrypto.changePercent) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}
                        >
                          {selectedCrypto.changePercent ? (selectedCrypto.changePercent.toString().startsWith('-') ? selectedCrypto.changePercent + '%' : '+' + selectedCrypto.changePercent + '%') : '-'}
                        </TableCell>
                        <TableCell align="right">{selectedCrypto.volume || '-'}</TableCell>
                        <TableCell align="right">{selectedCrypto.marketCap || '-'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={handleClearSearch}
                      sx={{ color: 'text.secondary' }}
                    >
                      Clear Search
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Removed Tabs component */}

      {renderCryptoTable(cryptoData)} {/* Pass cryptoData directly, as useQuery handles the fetching */}
    </Box>
  );
};

export default Crypto;