import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Grid,
  Button,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalFireDepartment as ActiveIcon,
  Star as TrendingIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query'; // Import useQuery
import toast from 'react-hot-toast'; // Import toast for notifications

// Ensure these paths are correct for your project
import {
  formatCurrency,
  formatPercentage, // Still useful for formatting percentages if API sends numbers
  getChangeColor,
  marketAPI,
  getPercentageColorFromString
} from '../../services/api';
import StockSearchField from '../../components/StockSearchField';

/**
 * TabPanel component for managing tab content visibility.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Content to be rendered inside the tab panel.
 * @param {number} props.value - The current active tab value.
 * @param {number} props.index - The index of this tab panel.
 * @param {object} props.other - Other props passed to the div element.
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`etf-tabpanel-${index}`}
      aria-labelledby={`etf-tab-${index}`}
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

/**
 * Helper function for accessibility props for tabs.
 * @param {number} index - The index of the tab.
 * @returns {object} Accessibility properties.
 */
function a11yProps(index) {
  return {
    id: `etf-tab-${index}`,
    'aria-controls': `etf-tabpanel-${index}`,
  };
}

/**
 * ETF component for displaying ETF market data with tabs, and pagination.
 * Data fetching is managed by React Query.
 */
const ETF = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedETF, setSelectedETF] = useState(null);
  const [searchValue, setSearchValue] = useState(null);

  const debounceTimerRef = useRef(null);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Changed from setRowsRowsPerPage for consistency

  // --- useQuery for data fetching ---
  // Define an array of API fetch functions for each tab
  // For this example, I'm assuming your marketAPI functions like getETFsMostActive
  // If your API doesn't support sorting on the backend, you'd need to reintroduce client-side sorting.
  const fetchFunctions = useRef([
    marketAPI.getETFsMostActive,
    marketAPI.getETFtrending,
    marketAPI.getETFGainers,
    marketAPI.getETFLosers,
  ]);

  // Default sorting parameters. Assuming most active/trending/gainers/losers
  // implies a default sort order from the API.
  // If your API supports dynamic sorting for all tabs, you'd pass orderBy and order.
  const [orderBy, setOrderBy] = useState('marketVolume'); // Default initial sort for 'Most Active'
  const [order, setOrder] = useState('desc'); // Default initial order for 'Most Active'

  const {
    data: baseData, // This will be the response object from your API, which should include `data` and `totalRecords`
    isLoading, // Initial loading state
    isFetching, // Loading state for subsequent fetches (pagination, tab change)
    isError,
    error,
    refetch // Function to manually refetch data
  } = useQuery(
    // Query key: changes when currentTab, page, rowsPerPage, orderBy, or order changes,
    // triggering a refetch.
    ['etfs', currentTab, page + 1, rowsPerPage, orderBy, order],
    async () => {
      // Call the appropriate API function with pagination, and sort parameters
      // You NEED to update your marketAPI functions to accept these arguments.
      // Example: marketAPI.getETFsMostActive(page, rowsPerPage, orderBy, order)
      // For simplicity, this example assumes the backend handles default sorting for each category
      // If backend sorting is implemented, uncomment orderBy and order arguments.
      const func = fetchFunctions.current[currentTab];
      const response = await func(page + 1, rowsPerPage, orderBy, order);

      // Your API should return an object like { data: [...], totalRecords: X }
      // The `data` array should contain *already paginated* and *filtered* results.
      // The `totalRecords` should be the total count of *filtered* records (before pagination).
      if (!response || (!Array.isArray(response.data) && typeof response.totalRecords === 'undefined')) {
         // Fallback if API returns just an array without totalRecords (like original code)
         const processedArray = Array.isArray(response) ? response : response?.data || [];
         return {
            data: processedArray,
            totalRecords: processedArray.length // If no totalRecords, assume data length is total
         };
      }
      return response; // Expecting { data: [...], totalRecords: X }
    },
    {
      staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch automatically when window regains focus
      keepPreviousData: true, // Keep displaying previous data while fetching new (smoother UX)
      onError: (err) => {
        toast.error(`Failed to load ETF data: ${err.message || "Unknown error"}`);
        console.error("[React Query Error] ETF Data:", err);
      },
      // You might need to add a select function if your API response structure is complex
      // select: (data) => data.results // Example if API returns { results: [...], count: X }
    }
  );

  // Extract actual data and total count from the react-query response
  // Ensure your API returns data in the format { data: [...], totalRecords: X }
  const etfData = baseData?.data || [];
  const totalRecords = baseData?.totalRecords || 0;

  /**
   * Formats a large number into a more readable string (e.g., 1.23T, 4.56B, 7.89M, 1.23K).
   * @param {number|string} num - The number to format.
   * @returns {string} The formatted number string.
   */
  const formatLargeNumber = (num) => {
    const numericValue = Number(num);
    if (isNaN(numericValue) || numericValue === null || numericValue === undefined) return 'N/A';

    if (numericValue >= 1_000_000_000_000) return (numericValue / 1_000_000_000_000).toFixed(2) + 'T';
    if (numericValue >= 1_000_000_000) return (numericValue / 1_000_000_000).toFixed(2) + 'B';
    if (numericValue >= 1_000_000) return (numericValue / 1_000_000).toFixed(2) + 'M';
    if (numericValue >= 1_000) return (numericValue / 1_000).toFixed(2) + 'K';
    return numericValue.toFixed(2).toString();
  };

  useEffect(() => {
    setPage(0); // Always reset page when tab changes
    // Reset sorting parameters for each tab's default behavior
    if (currentTab === 0) { // Most Active
        setOrderBy('marketVolume');
        setOrder('desc');
    } else if (currentTab === 1) { // Trending Now (might have a different default sort)
        setOrderBy('changePercent'); // Example: might trend by percentage change
        setOrder('desc');
    } else if (currentTab === 2) { // Top Gainers
        setOrderBy('changePercent');
        setOrder('desc'); // Gainers are sorted descending by positive change
    } else if (currentTab === 3) { // Top Losers
        setOrderBy('changePercent');
        setOrder('asc'); // Losers are sorted ascending by negative change
    }
    // Clear any pending debounce timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [currentTab]);

  /**
   * Handles changing the current page.
   * @param {object} event - The event object.
   * @param {number} newPage - The new page number (0-indexed).
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Handles changing the number of rows displayed per page.
   * @param {object} event - The event object.
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };

  /**
   * Handles the request to sort the table by a specific property.
   * This now only updates the sort state, which react-query will use to refetch data.
   * @param {string} property - The property to sort by.
   */
  const handleRequestSort = (property) => {
    // Only update order if changing sort column, otherwise toggle
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting changes
  };

  // Search handlers
  const handleSelectETF = (etf) => {
    setSelectedETF(etf);
  };

  const handleClearSearch = () => {
    setSelectedETF(null);
    setSearchValue(null);
  };


  /**
   * Renders the ETF data table, including loading states, error messages, and pagination.
   * @param {Array<object>} data - The paginated and filtered data received from the API.
   */
  const renderETFTable = (data) => (
    <Card>
      <CardContent>
        {/* Loading/Fetching State */}
        {(isLoading || isFetching) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading ETFs...
            </Typography>
          </Box>
        ) : isError ? (
          // Error State
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, flexDirection: 'column' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading ETF data: {error?.message || "Please check your network connection or try again later."}
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please ensure your backend server is running and accessible.
            </Typography>
          </Box>
        ) : (data && data.length > 0) ? (
          // Data Available State
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'changePercent'}
                      direction={orderBy === 'changePercent' ? order : 'asc'}
                      onClick={() => handleRequestSort('changePercent')}
                    >
                      Change %
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'marketVolume'}
                      direction={orderBy === 'marketVolume' ? order : 'asc'}
                      onClick={() => handleRequestSort('marketVolume')}
                    >
                      Volume
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'fiftyTwoWeekChangePercent'}
                      direction={orderBy === 'fiftyTwoWeekChangePercent' ? order : 'asc'}
                      onClick={() => handleRequestSort('fiftyTwoWeekChangePercent')}
                    >
                      52 Week Change (%)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'fiftyDayAvg'}
                      direction={orderBy === 'fiftyDayAvg' ? order : 'asc'}
                      onClick={() => handleRequestSort('fiftyDayAvg')}
                    >
                      50 Day Avg
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'twoHundredDayAvg'}
                      direction={orderBy === 'twoHundredDayAvg' ? order : 'asc'}
                      onClick={() => handleRequestSort('twoHundredDayAvg')}
                    >
                      200 Day Avg
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* No client-side slice needed, as data is already paginated by API */}
                {data.map((etf) => (
                  <TableRow key={etf.symbol} hover sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{etf.symbol || 'N/A'}</TableCell>
                    <TableCell>{etf.name || 'N/A'}</TableCell>
                    <TableCell align="right">{formatCurrency(etf.price, 'USD')}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getChangeColor(etf.change), fontWeight: 500 }}
                    >
                      {etf.change.startsWith('-') ? etf.change : '+' + etf.change}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getPercentageColorFromString(etf.changePercent), fontWeight: 500 }}
                    >
                      {/* Assuming changePercent from API is already a number or string that formatPercentage can handle */}
                      {etf.changePercent.startsWith('-') ? etf.changePercent : '+' + etf.changePercent}
                    </TableCell>
                    <TableCell align="right">{etf.marketVolume}</TableCell>
                    <TableCell
                        align="right"
                        sx={{ color: getPercentageColorFromString(etf.fiftyTwoWeekChangePercent) }}
                        >
                        {etf.fiftyTwoWeekChangePercent}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(etf.fiftyDayAvg, 'USD')}</TableCell>
                    <TableCell align="right">{formatCurrency(etf.twoHundredDayAvg, 'USD')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          // No Data Found State
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">
               No ETF data available for this category.
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Pagination component - only render if not loading/fetching and there are records */}
      {!(isLoading || isFetching) && totalRecords > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]} // Common options
          component="div"
          count={totalRecords} // Total records from the API response
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      )}
    </Card>
  );

  /**
   * Handles tab changes, updating the currentTab state.
   * This will trigger a react-query refetch.
   * @param {object} event - The event object.
   * @param {number} newValue - The new tab index.
   */
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          ETFs
        </Typography>
      </Box>

      {/* Search Section */}
      <Box sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon />
          Search ETFs
        </Typography>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={10}>
            <StockSearchField
              assetType="etf"
              label="Search ETFs..."
              placeholder="Type symbol or name to search ETFs"
              onSelectStock={handleSelectETF}
              value={searchValue}
              onChange={setSearchValue}
            />
          </Grid>
          {selectedETF && (
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
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{selectedETF.symbol}</TableCell>
                        <TableCell>{selectedETF.name || selectedETF.longname}</TableCell>
                        <TableCell align="right">{selectedETF.price ? `$${parseFloat(selectedETF.price).toFixed(2)}` : '-'}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: selectedETF.change && parseFloat(selectedETF.change) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}
                        >
                          {selectedETF.change ? (selectedETF.change.toString().startsWith('-') ? selectedETF.change : '+' + selectedETF.change) : '-'}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: selectedETF.changePercent && parseFloat(selectedETF.changePercent) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}
                        >
                          {selectedETF.changePercent ? (selectedETF.changePercent.toString().startsWith('-') ? selectedETF.changePercent + '%' : '+' + selectedETF.changePercent + '%') : '-'}
                        </TableCell>
                        <TableCell align="right">{selectedETF.volume || '-'}</TableCell>
                        <TableCell align="right">{selectedETF.marketCap || '-'}</TableCell>
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

      {/* Tabs for ETF Categories */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="etf market categories"
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

      {/* Render the ETF Table using data from react-query */}
      {renderETFTable(etfData)}
    </Box>
  );
};

export default ETF;