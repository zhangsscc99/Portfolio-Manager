import React from 'react';
import { Box, Typography } from '@mui/material';

const Crypto = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
      Crypto Market
      </Typography>
      <Typography variant="body1">
        This is the Crypto market overview page.
      </Typography>
    </Box>
  );
};

export default Crypto;