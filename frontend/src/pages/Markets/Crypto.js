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
  AllInclusive as AllIcon, // Icon for 'All' tab
} from '@mui/icons-material';

// Ensure these paths are correct, they should point to your api.js or similar file
import { formatCurrency, formatPercentage, getChangeColor } from '../../services/api'; // Assuming these helpers are generic enough

// Tab Panel auxiliary component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`crypto-tabpanel-${index}`}
      aria-labelledby={`crypto-tab-${index}`}
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

// Accessibility properties for Tab
function a11yProps(index) {
  return {
    id: `crypto-tab-${index}`,
    'aria-controls': `crypto-tabpanel-${index}`,
  };
}

const Crypto = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // Main content area loading state

  // --- Search related states ---
  const [searchTerm, setSearchTerm] = useState(''); // Actual search term for debouncing
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState(''); // Search term displayed in input
  const [currentTabFilteredData, setCurrentTabFilteredData] = useState([]); // Data filtered by search for current tab
  const [isSearchingInput, setIsSearchingInput] = useState(false); // Loading indicator for search input
  const [hasSearched, setHasSearched] = useState(false); // Whether a search operation has been performed

  const debounceTimerRef = useRef(null); // Debounce timer reference

  // --- Pagination related states ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsRowsPerPage] = useState(10);

  // --- Sorting related states ---
  const [orderBy, setOrderBy] = useState('volume'); // Default sort field
  const [order, setOrder] = useState('desc'); // Default sort direction ('asc' or 'desc')

  // --- MOCK Crypto Data (In production, replace with actual API calls) ---
  const mockAllCrypto = [
    { symbol: 'BTC', name: 'Bitcoin', price: 68500.00, change: 1200.50, changePercent: 0.0178, marketCap: 1350000000000, volume: 35000000000, volumeInCurrency24h: 35000000000 },
    { symbol: 'ETH', name: 'Ethereum', price: 3800.00, change: 80.20, changePercent: 0.0215, marketCap: 450000000000, volume: 18000000000, volumeInCurrency24h: 18000000000 },
    { symbol: 'BNB', name: 'BNB', price: 600.00, change: -5.50, changePercent: -0.0091, marketCap: 90000000000, volume: 1500000000, volumeInCurrency24h: 1500000000 },
    { symbol: 'SOL', name: 'Solana', price: 150.00, change: 3.10, changePercent: 0.0211, marketCap: 65000000000, volume: 1200000000, volumeInCurrency24h: 1200000000 },
    { symbol: 'XRP', name: 'XRP', price: 0.52, change: -0.01, changePercent: -0.0190, marketCap: 28000000000, volume: 800000000, volumeInCurrency24h: 800000000 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.15, change: 0.005, changePercent: 0.0345, marketCap: 22000000000, volume: 500000000, volumeInCurrency24h: 500000000 },
    { symbol: 'ADA', name: 'Cardano', price: 0.40, change: 0.002, changePercent: 0.0050, marketCap: 14000000000, volume: 300000000, volumeInCurrency24h: 300000000 },
    { symbol: 'SHIB', name: 'Shiba Inu', price: 0.000025, change: 0.0000005, changePercent: 0.0204, marketCap: 15000000000, volume: 400000000, volumeInCurrency24h: 400000000 },
    { symbol: 'AVAX', name: 'Avalanche', price: 30.00, change: 0.80, changePercent: 0.0274, marketCap: 11000000000, volume: 250000000, volumeInCurrency24h: 250000000 },
    { symbol: 'DOT', name: 'Polkadot', price: 7.20, change: -0.05, changePercent: -0.0069, marketCap: 10000000000, volume: 180000000, volumeInCurrency24h: 180000000 },
    { symbol: 'LINK', name: 'Chainlink', price: 16.50, change: 0.45, changePercent: 0.0280, marketCap: 9500000000, volume: 150000000, volumeInCurrency24h: 150000000 },
    { symbol: 'TRX', name: 'TRON', price: 0.12, change: 0.001, changePercent: 0.0084, marketCap: 10500000000, volume: 100000000, volumeInCurrency24h: 100000000 },
  ];

  const mockMostActiveCrypto = [
    { symbol: 'BTC', name: 'Bitcoin', price: 68500.00, change: 1200.50, changePercent: 0.0178, marketCap: 1350000000000, volume: 35000000000, volumeInCurrency24h: 35000000000 },
    { symbol: 'ETH', name: 'Ethereum', price: 3800.00, change: 80.20, changePercent: 0.0215, marketCap: 450000000000, volume: 18000000000, volumeInCurrency24h: 18000000000 },
    { symbol: 'SOL', name: 'Solana', price: 150.00, change: 3.10, changePercent: 0.0211, marketCap: 65000000000, volume: 1200000000, volumeInCurrency24h: 1200000000 },
    { symbol: 'XRP', name: 'XRP', price: 0.52, change: -0.01, changePercent: -0.0190, marketCap: 28000000000, volume: 800000000, volumeInCurrency24h: 800000000 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.15, change: 0.005, changePercent: 0.0345, marketCap: 22000000000, volume: 500000000, volumeInCurrency24h: 500000000 },
    { symbol: 'SHIB', name: 'Shiba Inu', price: 0.000025, change: 0.0000005, changePercent: 0.0204, marketCap: 15000000000, volume: 400000000, volumeInCurrency24h: 400000000 },
  ];

  const mockTrendingNowCrypto = [
    { symbol: 'PEPE', name: 'Pepe', price: 0.000012, change: 0.0000015, changePercent: 0.1428, marketCap: 5000000000, volume: 900000000, volumeInCurrency24h: 900000000 },
    { symbol: 'WIF', name: 'dogwifhat', price: 2.80, change: 0.35, changePercent: 0.1428, marketCap: 2800000000, volume: 700000000, volumeInCurrency24h: 700000000 },
    { symbol: 'FLOKI', name: 'Floki', price: 0.0002, change: 0.00002, changePercent: 0.1111, marketCap: 1900000000, volume: 550000000, volumeInCurrency24h: 550000000 },
    { symbol: 'BONK', name: 'Bonk', price: 0.00003, change: 0.000003, changePercent: 0.1111, marketCap: 2000000000, volume: 600000000, volumeInCurrency24h: 600000000 },
    { symbol: 'INJ', name: 'Injective', price: 25.00, change: 2.50, changePercent: 0.1111, marketCap: 2000000000, volume: 120000000, volumeInCurrency24h: 120000000 },
  ];

  const mockTopGainersCrypto = [
    { symbol: 'ARB', name: 'Arbitrum', price: 1.20, change: 0.15, changePercent: 0.1428, marketCap: 3500000000, volume: 300000000, volumeInCurrency24h: 300000000 },
    { symbol: 'OP', name: 'Optimism', price: 3.00, change: 0.35, changePercent: 0.1304, marketCap: 3000000000, volume: 200000000, volumeInCurrency24h: 200000000 },
    { symbol: 'SUI', name: 'Sui', price: 1.10, change: 0.12, changePercent: 0.1224, marketCap: 2500000000, volume: 150000000, volumeInCurrency24h: 150000000 },
    { symbol: 'APT', name: 'Aptos', price: 9.50, change: 1.00, changePercent: 0.1176, marketCap: 4000000000, volume: 100000000, volumeInCurrency24h: 100000000 },
  ];

  const mockTopLosersCrypto = [
    { symbol: 'FTM', name: 'Fantom', price: 0.60, change: -0.08, changePercent: -0.1176, marketCap: 1800000000, volume: 180000000, volumeInCurrency24h: 180000000 },
    { symbol: 'GRT', name: 'The Graph', price: 0.25, change: -0.03, changePercent: -0.1071, marketCap: 2200000000, volume: 100000000, volumeInCurrency24h: 100000000 },
    { symbol: 'FIL', name: 'Filecoin', price: 5.50, change: -0.60, changePercent: -0.0983, marketCap: 3000000000, volume: 120000000, volumeInCurrency24h: 120000000 },
    { symbol: 'NEAR', name: 'NEAR Protocol', price: 6.00, change: -0.50, changePercent: -0.0769, marketCap: 5500000000, volume: 90000000, volumeInCurrency24h: 90000000 },
  ];
  // --- END MOCK Crypto Data ---


  // Helper function to format large numbers (e.g., Volume, Market Cap)
  const formatLargeNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    // Handle very small numbers for crypto prices
    if (num < 1 && num > 0) return num.toFixed(6).replace(/0+$/, ''); // Show more decimals for small crypto prices
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T'; // Trillions
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'; // Billions
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'; // Millions
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'; // Thousands
    return num.toFixed(2).toString(); // Default to 2 decimal places for larger numbers
  };

  // Get base mock data based on Tab index
  const getBaseDataForTab = (tabIndex) => {
    switch (tabIndex) {
      case 0: return mockAllCrypto;
      case 1: return mockMostActiveCrypto;
      case 2: return mockTrendingNowCrypto;
      case 3: return mockTopGainersCrypto;
      case 4: return mockTopLosersCrypto;
      default: return [];
    }
  };

  // --- Search Logic ---
  const performSearch = useCallback((query, baseData) => {
    setPage(0); // Reset pagination to first page on new search/filter
    setIsSearchingInput(true); // Show loading indicator for search input
    setHasSearched(true); // Mark that a search operation has been performed

    // Simulate API call or time-consuming filtering delay
    setTimeout(() => {
      if (!query) {
        setCurrentTabFilteredData(baseData);
      } else {
        const lowerCaseQuery = query.toLowerCase();
        const filteredResults = baseData.filter(item =>
          item?.symbol?.toLowerCase().includes(lowerCaseQuery) ||
          item?.name?.toLowerCase().includes(lowerCaseQuery)
        );
        setCurrentTabFilteredData(filteredResults);
      }
      setIsSearchingInput(false); // Hide loading indicator for search input
    }, 500); // Simulate 500ms delay
  }, []); // useCallback dependency array is empty, means this function is created once

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const baseData = getBaseDataForTab(currentTab);

    if (displayedSearchTerm.length > 0) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchTerm, baseData);
      }, 500); // 500ms debounce delay
    } else {
      performSearch('', baseData); // Update immediately when search term is cleared
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, currentTab, performSearch, displayedSearchTerm]); // Add displayedSearchTerm as dependency for immediate clear effect

  // Initial loading effect on Tab change
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const newTabData = getBaseDataForTab(currentTab);
      setCurrentTabFilteredData(newTabData);
      setIsLoading(false);
      setPage(0); // Reset pagination on tab change
      setSearchTerm(''); // Reset search term on tab change
      setDisplayedSearchTerm('');
      setHasSearched(false);
      setIsSearchingInput(false);

      // Reset sort to default on tab change
      setOrderBy('volume');
      setOrder('desc');
    }, 400); // Simulate tab data fetching delay
  }, [currentTab]);

  // --- Sorting Handlers ---
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Go back to first page after sorting
  };

  // Helper function: stable sort based on field and direction
  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1]; // Maintain original relative order
    });
    return stabilizedThis.map((el) => el[0]);
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
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
    setRowsRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };
  // --- End Pagination Handlers ---

  // Determine data to display in table: keep old data during search/loading, then display new data
  const dataToDisplayInTable = (isSearchingInput && hasSearched) || (searchTerm !== '' && isSearchingInput)
                               ? currentTabFilteredData
                               : currentTabFilteredData;

  // Apply sorting
  const sortedAndFilteredData = stableSort(dataToDisplayInTable, getComparator(order, orderBy));

  const renderCryptoTable = (data) => (
    <Card>
      <CardContent>
        {isLoading || (isSearchingInput && hasSearched) ? (
          // Main table loading indicator
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading cryptocurrencies...
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">% Change</TableCell>
                  <TableCell align="right">Market Cap</TableCell>
                  {/* Volume column supports sorting */}
                  <TableCell align="right" sortDirection={orderBy === 'volume' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'volume'}
                      direction={orderBy === 'volume' ? order : 'asc'}
                      onClick={() => handleRequestSort('volume')}
                    >
                      Volume
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Volume (24h)</TableCell> {/* New column for Volume in Currency */}
                </TableRow>
              </TableHead>
              <TableBody>
                {(data && data.length > 0) ? (
                  // Apply pagination
                  data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((crypto) => (
                      <TableRow key={crypto.symbol} hover sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{crypto.symbol}</TableCell>
                        <TableCell>{crypto.name}</TableCell>
                        <TableCell align="right">{formatCurrency(crypto.price, 'USD')}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: getChangeColor(crypto.change), fontWeight: 500 }}
                        >
                          {formatCurrency(crypto.change, 'USD')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: getChangeColor(crypto.changePercent), fontWeight: 500 }}
                        >
                          {formatPercentage(crypto.changePercent)}
                        </TableCell>
                        <TableCell align="right">{formatLargeNumber(crypto.marketCap)}</TableCell>
                        <TableCell align="right">{formatLargeNumber(crypto.volume)}</TableCell>
                        <TableCell align="right">{formatLargeNumber(crypto.volumeInCurrency24h)}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3 }}>
                      <Typography color="text.secondary">
                        No cryptocurrency data found for this category or your search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
      {/* Show pagination controls only when data is not loading and there is data */}
      {!(isLoading || isSearchingInput) && (data && data.length > 0) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      )}
    </Card>
  );

  // Handle Tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // useEffect will handle data loading and state reset for the new Tab
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Cryptocurrencies
        </Typography>
        <TextField
          size="small"
          placeholder={`Search ${currentTab === 0 ? 'All' :
                                 currentTab === 1 ? 'Most Active' :
                                 currentTab === 2 ? 'Trending Now' :
                                 currentTab === 3 ? 'Top Gainers' :
                                 currentTab === 4 ? 'Top Losers' : ''}...`}
          value={displayedSearchTerm}
          onChange={(e) => {
            setDisplayedSearchTerm(e.target.value);
            setSearchTerm(e.target.value); // searchTerm triggers debounce
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: isSearchingInput && (
              <InputAdornment position="end">
                <CircularProgress size={20} color="inherit" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="crypto market categories"
          variant="scrollable" // Allow scrolling on small screens
          scrollButtons="auto" // Automatically show/hide scroll buttons
        >
          {/* Apply minHeight and padding to match the Markets component for consistent tab height */}
          <Tab
            label="All"
            icon={<AllIcon />}
            iconPosition="start"
            {...a11yProps(0)}
            sx={{
              minHeight: '48px', // Match Markets component tab height
              padding: '6px 16px', // Match Markets component tab padding
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
          <Tab
            label="Most Active"
            icon={<ActiveIcon />}
            iconPosition="start"
            {...a11yProps(1)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
          <Tab
            label="Trending Now"
            icon={<TrendingIcon />}
            iconPosition="start"
            {...a11yProps(2)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
          <Tab
            label="Top Gainers"
            icon={<TrendingUpIcon />}
            iconPosition="start"
            {...a11yProps(3)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
          <Tab
            label="Top Losers"
            icon={<TrendingDownIcon />}
            iconPosition="start"
            {...a11yProps(4)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
        </Tabs>
      </Box>

      {/* Render content for current Tab, applying search and pagination */}
      {renderCryptoTable(sortedAndFilteredData)}
    </Box>
  );
};

export default Crypto;