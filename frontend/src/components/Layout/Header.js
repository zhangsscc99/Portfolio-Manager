import React from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import {
  Chat as ChatIcon,
} from '@mui/icons-material';

const Header = ({ onOpenAssistant }) => {
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
          Welcome back! 
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

      {/* Right side - AI Assistant Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<ChatIcon />}
          onClick={onOpenAssistant}
          sx={{
            background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
            color: '#1a1a1a',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              background: 'linear-gradient(135deg, #E8A855 0%, #D4961F 50%, #B8821A 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 15px rgba(232, 168, 85, 0.3)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          AI Assistant
        </Button>
      </Box>
    </Box>
  );
};

export default Header; 