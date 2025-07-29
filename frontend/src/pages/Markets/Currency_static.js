import React, { useState, useEffect, useRef } from 'react'; // Import useRef
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
  TablePagination,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

// Import utility functions (ensure this path is correct relative to your project structure)
import { formatCurrency, formatPercentage, getChangeColor } from '../../services/api'; 

const Currency = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState(''); // New state for input field
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Pagination States ---
  const [page, setPage] = useState(0); // Current page (0-indexed)
  const [rowsPerPage, setRowsPerPage] = useState(10); // Number of rows per page

  // --- MOCK CURRENCY DATA FOR STATIC DISPLAY ---
  const mockCurrencyData = [
    { symbol: 'EURUSD', name: 'Euro/US Dollar', price: 1.0850, change: 0.0025, changePercent: 0.0023 },
    { symbol: 'GBPUSD', name: 'British Pound/US Dollar', price: 1.2720, change: -0.0010, changePercent: -0.0008 },
    { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen', price: 157.85, change: 0.30, changePercent: 0.0019 },
    { symbol: 'AUDUSD', name: 'Australian Dollar/US Dollar', price: 0.6690, change: 0.0005, changePercent: 0.0007 },
    { symbol: 'USDCAD', name: 'US Dollar/Canadian Dollar', price: 1.3650, change: -0.0020, changePercent: -0.0015 },
    { symbol: 'USDCHF', name: 'US Dollar/Swiss Franc', price: 0.8955, change: -0.0008, changePercent: -0.0009 },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar/US Dollar', price: 0.6195, change: 0.0015, changePercent: 0.0024 },
    { symbol: 'EURGBP', name: 'Euro/British Pound', price: 0.8520, change: 0.0003, changePercent: 0.0004 },
    { symbol: 'XAUUSD', name: 'Gold/US Dollar', price: 2315.70, change: 5.50, changePercent: 0.0024 },
    { symbol: 'XAGUSD', name: 'Silver/US Dollar', price: 29.50, change: 0.15, changePercent: 0.0051 },
    { symbol: 'EURAUD', name: 'Euro/Australian Dollar', price: 1.6210, change: 0.0007, changePercent: 0.0004 },
    { symbol: 'GBPJPY', name: 'British Pound/Japanese Yen', price: 199.50, change: -0.0020, changePercent: -0.0010 },
    { symbol: 'USDPLN', name: 'US Dollar/Polish Zloty', price: 4.0200, change: -0.0050, changePercent: -0.0012 },
    { symbol: 'USDMXN', name: 'US Dollar/Mexican Peso', price: 18.250, change: 0.020, changePercent: 0.0011 },
    { symbol: 'USDSGD', name: 'US Dollar/Singapore Dollar', price: 1.3550, change: 0.0005, changePercent: 0.0004 },
    { symbol: 'USDHKD', name: 'US Dollar/Hong Kong Dollar', price: 7.8200, change: 0.0000, changePercent: 0.0000 },
  ];
  // --- END MOCK DATA ---

  // For static page, isLoading is always false, error is always null
  const currencyLoading = false;
  const currencyError = null;

  // Ref to hold the debounce timer
  const debounceTimerRef = useRef(null);

  // Function to perform the actual search (or API call later)
  const performSearch = (query) => {
    // When performing a search, reset to the first page of search results
    setPage(0); 
    setIsSearching(true); // Show loading spinner
    
    // --- Simulate API call delay (for static page) ---
    setTimeout(() => {
      const lowerCaseQuery = query.toLowerCase();
      const filteredResults = mockCurrencyData.filter(item =>
        item?.symbol?.toLowerCase().includes(lowerCaseQuery) ||
        item?.name?.toLowerCase().includes(lowerCaseQuery)
      );
      setSearchResults(filteredResults);
      setIsSearching(false); // Hide loading spinner
    }, 500); // Simulate 500ms API call delay
  };

  // Debounced search logic
  useEffect(() => {
    // Clear any existing timer when searchTerm changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only debounce if there's a search term
    if (searchTerm) {
      // Set a new timer
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchTerm);
      }, 500); // Wait 500ms after last keystroke
    } else {
      // If search term is empty, clear results and stop searching
      setSearchResults([]);
      setIsSearching(false);
    }

    // Cleanup function: clear timer if component unmounts or effect re-runs
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]); // Re-run effect when searchTerm changes

  const handleCurrencyClick = (currency) => {
    console.log('Currency clicked:', currency);
    // TODO: Implement currency details view or other functionality
  };

  // --- Pagination Handlers ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };
  // --- END Pagination Handlers ---

  // Render table content
  const renderCurrencyTable = (data) => ( 
    <Card>
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Change</TableCell>
                <TableCell align="right">% Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data && data.length > 0) ? (
                // Slice the data for current page display
                data
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((currency) => (
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
                      <TableCell align="right">{formatCurrency(currency?.price, 'USD')}</TableCell>
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
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">
                      No currency data available (mock data filtered or empty).
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {/* Table Pagination Component */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]} // Options for rows per page
          component="div"
          count={data.length} // Total number of items
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }} // Add some margin top
        />
      </CardContent>
    </Card>
  );

  // Determine whether to display mock data or search results based on search term
  // Note: allDataToDisplay now holds the full set of filtered data
  const allDataToDisplay = searchTerm ? searchResults : mockCurrencyData;

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Currencies
        </Typography>
        <TextField
          size="small"
          placeholder="Search currencies... (e.g., EURUSD, GBPJPY)"
          // Bind to displayedSearchTerm for immediate input feedback
          value={displayedSearchTerm} 
          // Update displayedSearchTerm immediately, and searchTerm after debounce
          onChange={(e) => {
            setDisplayedSearchTerm(e.target.value);
            setSearchTerm(e.target.value); 
          }}
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

      {/* Render the table directly with the potentially filtered and paginated data */}
      {renderCurrencyTable(allDataToDisplay)}
    </Box>
  );
};

export default Currency;