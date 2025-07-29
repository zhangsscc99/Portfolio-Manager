import React from 'react';
import { Box, Typography } from '@mui/material';

const Stock = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
      Stock Market
      </Typography>
      <Typography variant="body1">
        This is the Stock market overview page.
      </Typography>
    </Box>
  );
};

export default Stock;