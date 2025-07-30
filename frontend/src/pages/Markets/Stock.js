import React, { useState, useEffect, useRef } from 'react'; // Removed useCallback
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
  // Removed TableSortLabel
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
import { formatCurrency, getPercentageColorFromString, getChangeColor, marketAPI } from '../../services/api';
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
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState('');
  const [actualSearchTerm, setActualSearchTerm] = useState('');

  const debounceTimerRef = useRef(null);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- useQuery for data fetching ---
  const fetchFunctions = useRef([
    marketAPI.getMostActive,
    marketAPI.getTrending,
    marketAPI.getGainers,
    marketAPI.getLosers,
  ]);

  const {
    data: baseData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery(
    ['stocks', currentTab, page + 1, rowsPerPage, actualSearchTerm],
    () => fetchFunctions.current[currentTab](page + 1, rowsPerPage, actualSearchTerm),
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      onError: (err) => {
        toast.error(`Failed to load data: ${err.message}`);
        console.error("API Fetch Error:", err);
      },
    }
  );

  const stockData = baseData?.data || [];
  const totalRecords = baseData?.totalRecords || 0;

  // --- Search Logic ---
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setDisplayedSearchTerm(value);
    setPage(0); // Reset page to first page when searching

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setActualSearchTerm(value);
    }, 500);
  };

  // Reset states when tab changes (including search and pagination)
  useEffect(() => {
    setPage(0);
    setRowsPerPage(10);
    setActualSearchTerm('');
    setDisplayedSearchTerm('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [currentTab]);

  // --- Sorting Handlers REMOVED ---
  // const handleRequestSort = useCallback((property) => { ... }, [orderBy, order]);
  // const stableSort = useCallback((array, comparator) => { ... }, []);
  // const getComparator = useCallback((order, orderBy) => { ... }, []);
  // const descendingComparator = (a, b, orderBy) => { ... };

  // --- Pagination Handlers ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  // --- End Pagination Handlers ---

  // No frontend sorting needed anymore. Use stockData directly.
  const displayedStockData = stockData;

  const renderStockTable = (data) => (
    <Card>
      <CardContent>
        {isLoading || isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading stock data...
            </Typography>
          </Box>
        ) : isError ? (
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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">Change %</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  {currentTab !== 1 && (
                    <TableCell align="right">Market Cap</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Use displayedStockData directly */}
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
                      // Keep using getPercentageColorFromString for the string percentage
                      sx={{ color: getPercentageColorFromString(stock.changePercent), fontWeight: 500 }}
                    >
                      {/* Display the raw string percentage directly */}
                      {stock.changePercent}
                    </TableCell>
                    <TableCell align="right">{stock.volume}</TableCell>
                    {currentTab !== 1 && (
                      <TableCell align="right">{stock.marketCap}</TableCell> 
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">
              No stock data found for this category or your search.
            </Typography>
          </Box>
        )}
      </CardContent>
      {!(isLoading || isFetching) && (totalRecords > 0) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      )}
    </Card>
  );

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
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
          value={displayedSearchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: isFetching && (
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

      {renderStockTable(displayedStockData)}
    </Box>
  );
};

export default Stock;