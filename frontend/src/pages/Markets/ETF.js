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
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalFireDepartment as ActiveIcon,
  Star as TrendingIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import {
  formatCurrency,
  formatPercentage,
  getChangeColor,
  marketAPI
} from '../../services/api';

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

function a11yProps(index) {
  return {
    id: `etf-tab-${index}`,
    'aria-controls': `etf-tabpanel-${index}`,
  };
}

const ETF = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState('');
  const [currentTabFilteredData, setCurrentTabFilteredData] = useState([]);
  const [isSearchingInput, setIsSearchingInput] = useState(false);
  const debounceTimerRef = useRef(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsRowsPerPage] = useState(10);

  const [orderBy, setOrderBy] = useState('marketVolume');
  const [order, setOrder] = useState('desc');

  const [currentTabRawData, setCurrentTabRawData] = useState([]);

  const formatLargeNumber = (num) => {
    const numericValue = Number(num);
    if (isNaN(numericValue) || numericValue === null || numericValue === undefined) return 'N/A';

    if (numericValue >= 1_000_000_000_000) return (numericValue / 1_000_000_000_000).toFixed(2) + 'T';
    if (numericValue >= 1_000_000_000) return (numericValue / 1_000_000_000).toFixed(2) + 'B';
    if (numericValue >= 1_000_000) return (numericValue / 1_000_000).toFixed(2) + 'M';
    if (numericValue >= 1_000) return (numericValue / 1_000).toFixed(2) + 'K';
    return numericValue.toFixed(2).toString();
  };

  const fetchDataForTab = useCallback(async (tabIndex) => {
    setApiError(null);
    setIsLoading(true);
    setPage(0);
    setSearchTerm('');
    setDisplayedSearchTerm('');
    setIsSearchingInput(false);
    setOrderBy('marketVolume');
    setOrder('desc');

    try {
      let data;
      switch (tabIndex) {
        case 0: data = await marketAPI.getETFsMostActive(); break;
        case 1: data = await marketAPI.getETFtrending(); break;
        case 2: data = await marketAPI.getETFGainers(); break;
        case 3: data = await marketAPI.getETFLosers(); break;
        default: data = [];
      }

      const array = Array.isArray(data) ? data : data.data || [];

      // --- CRITICAL IMPROVEMENT: Robust data parsing for sorting and display ---
      const processedArray = array.map(item => {
        // --- ADDED: Check if item itself is null or undefined ---
        if (item === null || item === undefined) {
            return null; // Return null for invalid items
        }

        const safeParseFloat = (value) => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const cleaned = value.replace(/,/g, '').replace('%', '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        };

        const processedItem = {
          ...item,
          price: safeParseFloat(item.price),
          change: safeParseFloat(item.change),
          changePercent: (safeParseFloat(item.changePercent) || 0) / 100,
          marketVolume: safeParseFloat(item.marketVolume),
          fiftyDayAvg: safeParseFloat(item.fiftyDayAvg),
          twoHundredDayAvg: safeParseFloat(item.twoHundredDayAvg),
          fiftyTwoWeekChangePercent: (safeParseFloat(item.fiftyTwoWeekChangePercent) || 0) / 100,
          volumeInCurrency24h: safeParseFloat(item.marketVolume),
          marketCap: safeParseFloat(item.marketCap) || null,
        };

        // --- ADDED: Log the processed item to inspect its values ---
        return processedItem;
      });

      // --- CRITICAL FIX: Filter out any nulls resulting from invalid items in the original array ---
      const nonNullProcessedArray = processedArray.filter(item => item !== null);

      // Filter out items that are missing critical unique identifiers (like symbol)
      const finalFilteredArray = nonNullProcessedArray.filter(item => item.symbol);

      setCurrentTabRawData(finalFilteredArray);
      setCurrentTabFilteredData(finalFilteredArray);
    } catch (error) {
      console.error("[fetchDataForTab] Failed to fetch or process ETF data:", error);
      setApiError("Failed to load ETF data. Please try again later.");
      setCurrentTabRawData([]);
      setCurrentTabFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataForTab(currentTab);
  }, [currentTab, fetchDataForTab]);

  const performSearch = useCallback((query, baseData) => {
    setPage(0);
    setIsSearchingInput(true);
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
      setIsSearchingInput(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (displayedSearchTerm.length > 0) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchTerm, currentTabRawData);
      }, 500);
    } else {
      performSearch('', currentTabRawData);
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, performSearch, displayedSearchTerm, currentTabRawData]);

  const handleRequestSort = useCallback((property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  }, [orderBy, order]);

  const stableSort = useCallback((array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  }, []);

  const getComparator = useCallback((order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }, []);

  const descendingComparator = (a, b, orderBy) => {
    const valA = a[orderBy];
    const valB = b[orderBy];

    const normalizedValA = (valA === null || valA === undefined || isNaN(valA)) ? -Infinity : valA;
    const normalizedValB = (valB === null || valB === undefined || isNaN(valB)) ? -Infinity : valB;

    if (normalizedValB < normalizedValA) {
      return -1;
    }
    if (normalizedValB > normalizedValA) {
      return 1;
    }
    return 0;
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortedAndFilteredData = stableSort(currentTabFilteredData, getComparator(order, orderBy));

  const renderETFTable = (data) => (
    <Card>
      <CardContent>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading ETFs...
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
                  <TableCell align="right" sortDirection={orderBy === 'marketVolume' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'marketVolume'}
                      direction={orderBy === 'marketVolume' ? order : 'asc'}
                      onClick={() => handleRequestSort('marketVolume')}
                    >
                      Volume
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={orderBy === 'fiftyTwoWeekChangePercent' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'fiftyTwoWeekChangePercent'}
                      direction={orderBy === 'fiftyTwoWeekChangePercent' ? order : 'asc'}
                      onClick={() => handleRequestSort('fiftyTwoWeekChangePercent')}
                    >
                      52 Week Change (%)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={orderBy === 'fiftyDayAvg' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'fiftyDayAvg'}
                      direction={orderBy === 'fiftyDayAvg' ? order : 'asc'}
                      onClick={() => handleRequestSort('fiftyDayAvg')}
                    >
                      50 Day Avg
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={orderBy === 'twoHundredDayAvg' ? order : false}>
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
                {(data && data.length > 0) ? (
                  data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((etf) => (
                      <TableRow key={etf.symbol || etf.name} hover sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{etf.symbol || 'N/A'}</TableCell>
                        <TableCell>{etf.name || 'N/A'}</TableCell>
                        <TableCell align="right">{formatCurrency(etf.price, 'USD')}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: getChangeColor(etf.change), fontWeight: 500 }}
                        >
                          {formatCurrency(etf.change, 'USD')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: getChangeColor(etf.changePercent), fontWeight: 500 }}
                        >
                          {formatPercentage(etf.changePercent)}
                        </TableCell>
                        <TableCell align="right">{formatLargeNumber(etf.marketVolume)}</TableCell>
                        <TableCell align="right">{formatPercentage(etf.fiftyTwoWeekChangePercent)}</TableCell>
                        <TableCell align="right">{formatCurrency(etf.fiftyDayAvg, 'USD')}</TableCell>
                        <TableCell align="right">{formatCurrency(etf.twoHundredDayAvg, 'USD')}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 3 }}>
                      <Typography color="text.secondary">
                        {searchTerm ? "No ETFs found matching your search criteria." : "No ETF data available for this category."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
      {!(isLoading || apiError) && (data && data.length > 0) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={currentTabFilteredData.length}
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
          ETFs
        </Typography>
        <TextField
          size="small"
          placeholder={`Search ${currentTab === 0 ? 'Most Active' :
                                 currentTab === 1 ? 'Trending Now' :
                                 currentTab === 2 ? 'Top Gainers' :
                                 currentTab === 3 ? 'Top Losers' : ''}...`}
          value={displayedSearchTerm}
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
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="etf market categories"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label="Most Active"
            icon={<ActiveIcon />}
            iconPosition="start"
            {...a11yProps(0)}
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
            label="Top Gainers"
            icon={<TrendingUpIcon />}
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
            label="Top Losers"
            icon={<TrendingDownIcon />}
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
        </Tabs>
      </Box>

      {renderETFTable(sortedAndFilteredData)}
    </Box>
  );
};

export default ETF;