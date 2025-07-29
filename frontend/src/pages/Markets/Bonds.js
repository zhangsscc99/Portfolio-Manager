// Bonds.js (请将文件名改为 Bonds.js)

import React, { useState, useEffect, useRef } from 'react';
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
  // Removed CircularProgress from here as it's not used for search input loading anymore
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

// Import utility functions (ensure this path is correct relative to your project structure)
import { formatCurrency, formatPercentage, getChangeColor } from '../../services/api';

const Bonds = () => { // Changed component name to Bonds
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Removed isSearching state as it was primarily for the search input loading spinner
  // If you later add a full page loading state for API calls, you'd reintroduce a different isLoading state.

  // --- Pagination States ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- MOCK BONDS DATA ---
  // Adjusted data structure and values to be more bond-like
  const mockBondsData = [
    { symbol: 'UST10Y', name: 'US Treasury Bond 10-Year', price: 98.75, yield: 4.25, change: -0.10, changePercent: -0.0010, maturity: '2034-07-15' },
    { symbol: 'DEU10Y', name: 'German Bund 10-Year', price: 102.30, yield: 2.50, change: 0.05, changePercent: 0.0005, maturity: '2034-08-20' },
    { symbol: 'GBR10Y', name: 'UK Gilt 10-Year', price: 95.10, yield: 4.55, change: -0.15, changePercent: -0.0016, maturity: '2034-09-01' },
    { symbol: 'JPN10Y', name: 'Japanese Government Bond 10-Year', price: 100.50, yield: 0.95, change: 0.02, changePercent: 0.0002, maturity: '2034-06-10' },
    { symbol: 'CAN10Y', name: 'Canadian Government Bond 10-Year', price: 97.80, yield: 3.80, change: -0.08, changePercent: -0.0008, maturity: '2034-10-05' },
    { symbol: 'AUS10Y', name: 'Australian Government Bond 10-Year', price: 99.20, yield: 4.30, change: 0.03, changePercent: 0.0003, maturity: '2034-11-25' },
    { symbol: 'ITA10Y', name: 'Italian BTP 10-Year', price: 92.50, yield: 4.00, change: -0.20, changePercent: -0.0021, maturity: '2034-12-01' },
    { symbol: 'FRN10Y', name: 'French OAT 10-Year', price: 99.80, yield: 3.00, change: 0.07, changePercent: 0.0007, maturity: '2034-07-20' },
    { symbol: 'SPN10Y', name: 'Spanish Bono 10-Year', price: 96.00, yield: 3.50, change: -0.05, changePercent: -0.0005, maturity: '2034-08-01' },
    { symbol: 'CHN10Y', name: 'Chinese Government Bond 10-Year', price: 101.00, yield: 2.30, change: 0.01, changePercent: 0.0001, maturity: '2034-09-10' },
    { symbol: 'IND10Y', name: 'Indian Government Bond 10-Year', price: 94.00, yield: 6.80, change: -0.12, changePercent: -0.0013, maturity: '2034-10-15' },
    { symbol: 'BRA10Y', name: 'Brazilian Government Bond 10-Year', price: 88.50, yield: 10.50, change: 0.25, changePercent: 0.0028, maturity: '2034-11-01' },
    { symbol: 'MEX10Y', name: 'Mexican Government Bond 10-Year', price: 90.20, yield: 8.50, change: -0.03, changePercent: -0.0003, maturity: '2034-12-20' },
    { symbol: 'ZAF10Y', name: 'South African Government Bond 10-Year', price: 85.00, yield: 11.00, change: 0.18, changePercent: 0.0021, maturity: '2034-07-01' },
  ];
  // --- END MOCK DATA ---

  // Ref to hold the debounce timer
  const debounceTimerRef = useRef(null);

  // Function to perform the actual search (or API call later)
  const performSearch = (query) => {
    setPage(0); // Reset to the first page of search results
    
    // For real API calls, you'd set isLoading(true) here
    // For this mock data, we just filter immediately
    const lowerCaseQuery = query.toLowerCase();
    const filteredResults = mockBondsData.filter(item =>
      item?.symbol?.toLowerCase().includes(lowerCaseQuery) ||
      item?.name?.toLowerCase().includes(lowerCaseQuery)
    );
    setSearchResults(filteredResults);
    // For real API calls, you'd set isLoading(false) here after fetch completes
  };

  // Debounced search logic
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchTerm) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchTerm);
      }, 300); // Shorter debounce for faster feedback (300ms)
    } else {
      // If search term is empty, clear search results to display all mock data
      setSearchResults([]);
      setPage(0); // Also reset page when search is cleared
    }

    // Cleanup function: clear timer if component unmounts or effect re-runs
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]); // Re-run effect when searchTerm changes

  const handleBondClick = (bond) => {
    console.log('Bond clicked:', bond);
    // TODO: Implement bond details view or other functionality
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
  // We now include a simple loading message for initial data if needed, or error.
  const renderBondsTable = (data) => (
    <Card>
      <CardContent>
        {/* Simplified loading/error handling for mock data */}
        {data.length === 0 && searchTerm !== '' ? ( // Display "No results" only if searching and nothing found
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">
              No bonds found matching your search.
            </Typography>
          </Box>
        ) : data.length === 0 && searchTerm === '' ? ( // Display "No data" if no search and mock data is empty
           <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, flexDirection: 'column' }}>
            <Typography variant="h6" color="error.main">
              Failed to load bond data.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please check your data source.
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
                  <TableCell align="right">Yield</TableCell> {/* Added Yield */}
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">% Change</TableCell>
                  <TableCell>Maturity</TableCell> {/* Added Maturity */}
                </TableRow>
              </TableHead>
              <TableBody>
                {data
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((bond) => (
                    <TableRow
                      key={bond?.symbol || Math.random()}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleBondClick(bond)}
                    >
                      <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {bond?.symbol || 'N/A'}
                      </TableCell>
                      <TableCell>{bond?.name || 'N/A'}</TableCell>
                      <TableCell align="right">{formatCurrency(bond?.price, 'USD', 2)}</TableCell> {/* Format price */}
                      <TableCell align="right">{bond?.yield !== undefined ? `${bond.yield.toFixed(2)}%` : 'N/A'}</TableCell> {/* Format yield */}
                      <TableCell
                        align="right"
                        sx={{ color: getChangeColor(bond?.change), fontWeight: 500 }}
                      >
                        {formatCurrency(bond?.change, 'USD')}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: getChangeColor(bond?.changePercent), fontWeight: 500 }}
                      >
                        {formatPercentage(bond?.changePercent)}
                      </TableCell>
                      <TableCell>{bond?.maturity || 'N/A'}</TableCell> {/* Display Maturity */}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {/* Table Pagination Component */}
        {data.length > 0 && ( // Only show pagination if there's data to paginate
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
      </CardContent>
    </Card>
  );

  // Determine whether to display mock data or search results
  const allDataToDisplay = searchTerm ? searchResults : mockBondsData;

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Bonds {/* Changed title to Bonds */}
        </Typography>
        <TextField
          size="small"
          placeholder="Search bonds... (e.g., UST10Y, DEU10Y)" 
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
            // Removed endAdornment with CircularProgress for search input
          }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      {renderBondsTable(allDataToDisplay)}
    </Box>
  );
};

export default Bonds;