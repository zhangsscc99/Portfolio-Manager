import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';

const Header = () => {
  const currentTime = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 2,
        px: 3,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Left side - Welcome and Date */}
      <Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          Welcome back! 👋
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
          }}
        >
          {currentTime}
        </Typography>
      </Box>

      {/* Right side simplified */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* All interactive elements removed for cleaner interface */}
      </Box>
    </Box>
  );
};

export default Header; 