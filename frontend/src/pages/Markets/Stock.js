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
  Grid,
  Button,
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
import StockSearchField from '../../components/StockSearchField';
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
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchValue, setSearchValue] = useState(null);

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
    ['stocks', currentTab, page + 1, rowsPerPage],
    () => fetchFunctions.current[currentTab](page + 1, rowsPerPage),
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

  useEffect(() => {
    setPage(0);
    // setRowsPerPage(10);
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
                    <TableCell align="right">{stock.price}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getChangeColor(stock.change), fontWeight: 500 }}
                    >
                      {stock.change.startsWith('-') ? stock.change : '+' + stock.change}
                    </TableCell>
                    <TableCell
                      align="right"
                      // Keep using getPercentageColorFromString for the string percentage
                      sx={{ color: getPercentageColorFromString(stock.changePercent), fontWeight: 500 }}
                    >
                      {/* Display the raw string percentage directly */}
                      {stock.changePercent.startsWith('-') ? stock.changePercent : '+' + stock.changePercent}
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
              No stock data found.
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

  // Search handlers
  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
  };

  const handleClearSearch = () => {
    setSelectedStock(null);
    setSearchValue(null);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Stocks
        </Typography>
      </Box>

      {/* Search Section */}
      <Box sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon />
          Search Stocks
        </Typography>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={10}>
            <StockSearchField
              assetType="stock"
              label="Search stocks..."
              placeholder="Type symbol or company name to search stocks"
              onSelectStock={handleSelectStock}
              value={searchValue}
              onChange={setSearchValue}
            />
          </Grid>
          {selectedStock && (
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
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{selectedStock.symbol}</TableCell>
                        <TableCell>{selectedStock.name || selectedStock.longname}</TableCell>
                        <TableCell align="right">{selectedStock.price ? `$${parseFloat(selectedStock.price).toFixed(2)}` : '-'}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: selectedStock.change && parseFloat(selectedStock.change) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}
                        >
                          {selectedStock.change ? (selectedStock.change.toString().startsWith('-') ? selectedStock.change : '+' + selectedStock.change) : '-'}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: selectedStock.changePercent && parseFloat(selectedStock.changePercent) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}
                        >
                          {selectedStock.changePercent ? (selectedStock.changePercent.toString().startsWith('-') ? selectedStock.changePercent + '%' : '+' + selectedStock.changePercent + '%') : '-'}
                        </TableCell>
                        <TableCell align="right">{selectedStock.volume || '-'}</TableCell>
                        <TableCell align="right">{selectedStock.marketCap || '-'}</TableCell>
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