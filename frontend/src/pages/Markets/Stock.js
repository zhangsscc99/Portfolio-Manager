import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  InputAdornment,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalFireDepartment as ActiveIcon,
  Star as TrendingIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';

// Ensure these paths are correct
import { formatCurrency, formatPercentage, getChangeColor, marketAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Tab Panel Helper Component (No change)
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stock-tabpanel-${index}`}
      aria-labelledby={`stock-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Accessibility props for Tabs (No change)
function a11yProps(index) {
  return {
    id: `stock-tab-${index}`,
    'aria-controls': `stock-tabpanel-${index}`,
  };
}

const Stock = () => {
  const [currentTab, setCurrentTab] = useState(0);
  // displayedSearchTerm will only be for the input field
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState('');
  // actualSearchTerm will be debounced and used in useQuery
  const [actualSearchTerm, setActualSearchTerm] = useState('');

  const debounceTimerRef = useRef(null); // Debounce timer reference

  // Pagination states
  const [page, setPage] = useState(0); // Current page (0-indexed for TablePagination)
  const [rowsPerPage, setRowsPerPage] = useState(10); // Rows per page

  // Sorting states (frontend sort assumed here; if backend sorts, modify API and useQuery)
  const [orderBy, setOrderBy] = useState('volume'); // Default sort field
  const [order, setOrder] = useState('desc'); // Default sort direction ('asc' or 'desc')

  // --- useQuery for data fetching ---
  const fetchFunctions = useRef([
    marketAPI.getMostActive,
    marketAPI.getTrending,
    marketAPI.getGainers,
    marketAPI.getLosers,
  ]);

  // Dynamic query key and function based on currentTab, page, rowsPerPage, and actualSearchTerm
  const {
    data: baseData, // rawData now includes { data: [], currentPage, perPage, totalRecords }
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery(
    // The query key now depends on actualSearchTerm
    ['stocks', currentTab, page + 1, rowsPerPage, actualSearchTerm],
    // Note: TablePagination's 0-indexed page is converted to 1-indexed for backend API
    () => fetchFunctions.current[currentTab](page + 1, rowsPerPage, actualSearchTerm),
    {
      staleTime: 5 * 60 * 1000, // Data considered "fresh" for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      onError: (err) => {
        toast.error(`Failed to load data: ${err.message}`);
        console.error("API Fetch Error:", err);
      },
    }
  );

  // Extract actual stock data and total records from baseData
  const stockData = baseData?.data || [];
  const totalRecords = baseData?.totalRecords || 0;

  // Utility function to format large numbers (e.g., Volume, Market Cap)
  const formatLargeNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    const number = Number(num);
    if (isNaN(number)) return 'N/A';
    if (number >= 1_000_000_000_000) return (number / 1_000_000_000_000).toFixed(2) + 'T'; // Trillions
    if (number >= 1_000_000_000) return (number / 1_000_000_000).toFixed(2) + 'B'; // Billions
    if (number >= 1_000_000) return (number / 1_000_000).toFixed(2) + 'M'; // Millions
    if (number >= 1_000) return (number / 1_000).toFixed(2) + 'K'; // Thousands
    return number.toString();
  };

  // --- Search Logic ---
  // Updates displayedSearchTerm immediately, and triggers debounce for actualSearchTerm
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setDisplayedSearchTerm(value); // Update displayed search term immediately
    setPage(0); // Reset page to first page when searching

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Debounce setting the actual search term, which triggers the useQuery re-fetch
    debounceTimerRef.current = setTimeout(() => {
      setActualSearchTerm(value); // This will update the query key and trigger re-fetch
    }, 500); // 500ms debounce delay
  };

  // Reset states when tab changes (including search and pagination)
  useEffect(() => {
    setPage(0); // Go back to first page on tab change
    setRowsPerPage(10); // Reset rows per page
    setActualSearchTerm(''); // Clear actual search term, triggering useQuery refetch
    setDisplayedSearchTerm(''); // Clear displayed search term
    setOrderBy('volume'); // Reset sort to default
    setOrder('desc');
    // Clear any pending debounce on tab change
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [currentTab]);

  // --- Sorting Handlers (Frontend Sorting) ---
  const handleRequestSort = useCallback((property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Go back to first page after sorting
  }, [orderBy, order]);

  // Helper function for stable sorting
  const stableSort = useCallback((array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1]; // Maintain original relative order
    });
    return stabilizedThis.map((el) => el[0]);
  }, []);

  const getComparator = useCallback((order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }, []);

  const descendingComparator = (a, b, orderBy) => {
    // Handle null/undefined values by treating them as 0 for comparison
    const valA = a[orderBy] === null || a[orderBy] === undefined ? 0 : a[orderBy];
    const valB = b[orderBy] === null || b[orderBy] === undefined ? 0 : b[orderBy];

    if (valB < valA) {
      return -1;
    }
    if (valB > valA) {
      return 1;
    }
    return 0;
  };
  // --- End Sorting Handlers ---

  // --- Pagination Handlers ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };
  // --- End Pagination Handlers ---

  // Apply frontend sorting to the currently fetched (paginated) data
  const sortedStockData = stableSort(stockData, getComparator(order, orderBy));

  const renderStockTable = (data) => (
    <Card>
      <CardContent>
        {isLoading || isFetching ? (
          // Loading indicator
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading stock data...
            </Typography>
          </Box>
        ) : isError ? (
          // Error message
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, flexDirection: 'column' }}>
            <Typography variant="h6" color="error.main">
              Error loading stock data.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {error?.message || "Please try again later."}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ensure your backend server is running and accessible.
            </Typography>
          </Box>
        ) : (data && data.length > 0) ? (
          // Display data table
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">% Change</TableCell>
                  {/* Volume column with sort */}
                  <TableCell align="right" sortDirection={orderBy === 'volume' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'volume'}
                      direction={orderBy === 'volume' ? order : 'asc'}
                      onClick={() => handleRequestSort('volume')}
                    >
                      Volume
                    </TableSortLabel>
                  </TableCell>
                  {/* Conditionally render Market Cap column */}
                  {currentTab !== 1 && ( // Only show if NOT "Trending Now" tab (index 1)
                    <TableCell align="right">Market Cap</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Render data directly from backend's paginated response */}
                {data.map((stock) => (
                  <TableRow key={stock.symbol} hover sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{stock.symbol}</TableCell>
                    <TableCell>{stock.name}</TableCell>
                    <TableCell align="right">{formatCurrency(stock.price, 'USD')}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getChangeColor(stock.change), fontWeight: 500 }}
                    >
                      {formatCurrency(stock.change, 'USD')}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getChangeColor(stock.changePercent), fontWeight: 500 }}
                    >
                      {formatPercentage(stock.changePercent)}
                    </TableCell>
                    <TableCell align="right">{formatLargeNumber(stock.volume)}</TableCell>
                    {/* Conditionally render Market Cap cell */}
                    {currentTab !== 1 && ( // Only show if NOT "Trending Now" tab (index 1)
                      <TableCell align="right">{formatLargeNumber(stock.marketCap)}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          // No data found message
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">
              No stock data found for this category or your search.
            </Typography>
          </Box>
        )}
      </CardContent>
      {/* Show pagination only if data is loaded and there are records */}
      {!(isLoading || isFetching) && (totalRecords > 0) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalRecords} // Use total records from backend
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      )}
    </Card>
  );

  // Handle Tab change (No change)
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // useQuery will automatically refetch data when currentTab changes
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Stocks
        </Typography>
        <TextField
          size="small"
          placeholder={`Search ${currentTab === 0 ? 'Most Active' :
            currentTab === 1 ? 'Trending Now' :
            currentTab === 2 ? 'Top Gainers' :
            currentTab === 3 ? 'Top Losers' : ''}...`}
          value={displayedSearchTerm} // Binds to displayedSearchTerm
          onChange={handleSearchChange} // Triggers debounce and updates actualSearchTerm
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: isFetching && ( // Use isFetching from useQuery
              <InputAdornment position="end">
                <CircularProgress size={20} color="inherit" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="stock market categories"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label="Most Active"
            icon={<ActiveIcon />}
            iconPosition="start"
            {...a11yProps(0)}
            sx={{ minHeight: '48px', padding: '6px 16px', '& .MuiTab-iconWrapper': { marginRight: '8px' } }}
          />
          <Tab
            label="Trending Now"
            icon={<TrendingIcon />}
            iconPosition="start"
            {...a11yProps(1)}
            sx={{ minHeight: '48px', padding: '6px 16px', '& .MuiTab-iconWrapper': { marginRight: '8px' } }}
          />
          <Tab
            label="Top Gainers"
            icon={<TrendingUpIcon />}
            iconPosition="start"
            {...a11yProps(2)}
            sx={{ minHeight: '48px', padding: '6px 16px', '& .MuiTab-iconWrapper': { marginRight: '8px' } }}
          />
          <Tab
            label="Top Losers"
            icon={<TrendingDownIcon />}
            iconPosition="start"
            {...a11yProps(3)}
            sx={{ minHeight: '48px', padding: '6px 16px', '& .MuiTab-iconWrapper': { marginRight: '8px' } }}
          />
        </Tabs>
      </Box>

      {/* Render current Tab content using data from useQuery */}
      {renderStockTable(sortedStockData)}
    </Box>
  );
};

export default Stock;