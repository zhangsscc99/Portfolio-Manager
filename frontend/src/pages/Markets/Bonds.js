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
  TextField,
  InputAdornment,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from 'react-query';

// Ensure marketAPI.js still parses string numbers to actual numbers!
import { formatCurrency, getPercentageColorFromString, getChangeColor, marketAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Bonds = () => {
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState('');
  // We will still filter on the frontend for the current page's data
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const debounceTimerRef = useRef(null);

  // --- Backend Pagination States ---
  // Material-UI TablePagination uses 0-indexed pages, API returns 1-indexed.
  // We will convert when passing to API and interpreting API response.
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default to 5 as per API's perPage

  // --- Sorting States (Frontend Sorting for current page) ---
  const [orderBy, setOrderBy] = useState('symbol');
  const [order, setOrder] = useState('asc');

  // --- useQuery for backend-driven data fetching ---
  const {
    data: apiResponse, // This will hold the entire API response object (currentPage, data, totalRecords, etc.)
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery(
    // Query key now includes page and rowsPerPage to trigger re-fetch when they change
    ['bonds', page, rowsPerPage],
    async () => {
      // Pass the 0-indexed Material-UI page + 1 for backend (1-indexed)
      // Pass rowsPerPage to the backend if your API supports it.
      // Assuming marketAPI.getBonds now takes { page, perPage } or similar.
      const response = await marketAPI.getBonds(page + 1);
      return response; // Return the entire response object
    },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      onError: (err) => {
        toast.error(`Failed to load bond data: ${err.message || "Unknown error"}`);
        console.error("API Fetch Error for Bonds:", err);
      },
      // Keep previous data true while fetching new, to avoid blank table during transition
      keepPreviousData: true,
    }
  );

  // Extract relevant data from the API response
  const bonds = apiResponse?.data || [];
  const totalRecords = apiResponse?.totalRecords || 0; // Use totalRecords from API for TablePagination count

  // --- Search Logic (Frontend Filtering of current page's data) ---
  // Note: If you want server-side search, your backend API needs to support a search parameter.
  // For now, this searches only the current page's data.
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setDisplayedSearchTerm(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setFilterSearchTerm(value);
      // No need to reset page here, as filtering is only on the current page.
      // If you implement server-side search, then you'd reset page to 0.
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // --- Filtering Data (Frontend for the current page) ---
  const filteredBonds = (bonds || []).filter(bond => {
    if (!filterSearchTerm) return true;
    const lowerCaseSearchTerm = filterSearchTerm.toLowerCase();
    return (
      bond.symbol?.toLowerCase().includes(lowerCaseSearchTerm) ||
      bond.name?.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });

  // --- Sorting Handlers (Frontend Sorting for current page) ---
  // If you want server-side sorting, your backend API needs to support sort parameters.
  const handleRequestSort = useCallback((property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    // No need to reset page here, as sorting is only on the current page.
  }, [orderBy, order]);

  const stableSort = useCallback((array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    console.log("Sorted data:", stabilizedThis);
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

    if (typeof valA === 'string' && typeof valB === 'string' && (orderBy === 'symbol' || orderBy === 'name')) {
      return valB.localeCompare(valA);
    }

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
  // Apply frontend sorting to the filtered data (which is just the current page's data)
  const sortedBonds = stableSort(filteredBonds, getComparator(order, orderBy));


  // --- Pagination Handlers (Backend Pagination triggered by state changes) ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage); // Material-UI gives 0-indexed newPage, which useQuery will use.
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };

  const handleBondClick = (bond) => {
    console.log('Bond clicked:', bond);
  };

  const renderBondsTable = () => (
    <Card>
      <CardContent>
        {isLoading || isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading bonds...
            </Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, flexDirection: 'column' }}>
            <Typography variant="h6" color="error.main">
              Error loading bond data.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {error?.message || "Please try again later."}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ensure your API is running and accessible.
            </Typography>
          </Box>
        ) : (sortedBonds && sortedBonds.length > 0) ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {/* Symbol Column */}
                  <TableCell sortDirection={orderBy === 'symbol' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'symbol'}
                      direction={orderBy === 'symbol' ? order : 'asc'}
                      onClick={() => handleRequestSort('symbol')}
                    >
                      Symbol
                    </TableSortLabel>
                  </TableCell>
                  {/* Name Column */}
                  <TableCell sortDirection={orderBy === 'name' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  {/* Price Column */}
                  <TableCell align="right" sortDirection={orderBy === 'price' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'price'}
                      direction={orderBy === 'price' ? order : 'asc'}
                      onClick={() => handleRequestSort('price')}
                    >
                      Price
                    </TableSortLabel>
                  </TableCell>
                  {/* Change Column */}
                  <TableCell align="right" sortDirection={orderBy === 'change' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'change'}
                      direction={orderBy === 'change' ? order : 'asc'}
                      onClick={() => handleRequestSort('change')}
                    >
                      Change
                    </TableSortLabel>
                  </TableCell>
                  {/* % Change Column */}
                  <TableCell align="right" sortDirection={orderBy === 'changePercent' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'changePercent'}
                      direction={orderBy === 'changePercent' ? order : 'asc'}
                      onClick={() => handleRequestSort('changePercent')}
                    >
                      Change %
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedBonds.map((bond) => ( // Use sortedBonds directly, as backend already paginated
                  <TableRow
                    key={bond?.symbol || `bond-${Math.random()}`}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleBondClick(bond)}
                  >
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {bond?.symbol || 'N/A'}
                    </TableCell>
                    <TableCell>{bond?.name || 'N/A'}</TableCell>
                    <TableCell align="right">{bond?.price}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getChangeColor(bond?.change), fontWeight: 500 }}
                    >
                      {formatCurrency(bond?.change, 'USD')}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: getPercentageColorFromString(bond?.changePercent), fontWeight: 500 }}
                    >
                      {bond?.changePercent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">
              No bond data available or found matching your search.
            </Typography>
          </Box>
        )}
      </CardContent>
      {/* Table Pagination Component - now uses totalRecords from API for count */}
      {!(isLoading || isError) && (totalRecords > 0) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]} // Keep options, but backend will only return `perPage` items
          component="div"
          count={totalRecords} // Use totalRecords from the API response
          rowsPerPage={rowsPerPage}
          page={page} // Material-UI's 0-indexed page
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      )}
    </Card>
  );

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Bonds
        </Typography>
        <TextField
          size="small"
          placeholder="Search bonds..."
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

      {renderBondsTable()}
    </Box>
  );
};

export default Bonds;