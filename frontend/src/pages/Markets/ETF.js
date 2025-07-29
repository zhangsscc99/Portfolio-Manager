import React from 'react';
import { Box, Typography } from '@mui/material';

const ETF = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        ETF Market
      </Typography>
      <Typography variant="body1">
        This is the ETF market overview page.
      </Typography>
    </Box>
  );
};

export default ETF;