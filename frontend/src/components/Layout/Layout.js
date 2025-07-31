import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import Sidebar from './Sidebar';
import Header from './Header';
import AIAssistantDialog from '../AIAssistantDialog';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

const drawerWidth = 280;

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Fetch portfolio data for AI Assistant
  const fetchPortfolioData = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.portfolio.getById(1)));
      const data = await response.json();
      if (data.success) {
        setPortfolioData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data for AI Assistant:', error);
    }
  };

  // AI Assistant handlers
  const handleOpenAssistant = () => {
    setAssistantOpen(true);
    // Fetch fresh portfolio data when opening assistant
    if (!portfolioData) {
      fetchPortfolioData();
    }
  };

  const handleCloseAssistant = () => {
    setAssistantOpen(false);
  };



  // Load portfolio data on component mount
  React.useEffect(() => {
    fetchPortfolioData();
  }, []);

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/portfolio':
        return 'Portfolio';

      case '/analytics':
        return 'Analytics';
      case '/markets':
        return 'Markets';
      default:
        return 'Portfolio Manager';
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: 'background.paper',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {getPageTitle(location.pathname)}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleOpenAssistant}
              sx={{
                color: '#E8A855',
                '&:hover': {
                  backgroundColor: 'rgba(232, 168, 85, 0.1)',
                },
              }}
            >
              <ChatIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
        }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                backgroundColor: 'background.paper',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton onClick={handleDrawerToggle} color="inherit">
                <CloseIcon />
              </IconButton>
            </Box>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                position: 'relative',
              },
            }}
            PaperProps={{
              className: 'tech-sidebar'
            }}
            open
          >
            <Sidebar />
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        className="tech-background"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          mt: isMobile ? '64px' : 0,
        }}
      >
        {/* 浮动光效装饰 */}
        <div className="floating-orb floating-orb-1"></div>
        <div className="floating-orb floating-orb-2"></div>
        <div className="floating-orb floating-orb-3"></div>
        {!isMobile && <Header onOpenAssistant={handleOpenAssistant} />}
        
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Global AI Assistant Dialog */}
      <AIAssistantDialog
        open={assistantOpen}
        onClose={handleCloseAssistant}
        portfolioId="1"
        portfolioData={{
          totalValue: portfolioData?.totalValue || 0,
          totalAssets: portfolioData?.assetsByType ? 
            Object.values(portfolioData.assetsByType).reduce((sum, type) => sum + type.assets.length, 0) : 0,
          assetDistribution: portfolioData?.assetsByType ? 
            Object.entries(portfolioData.assetsByType).reduce((acc, [type, data]) => {
              acc[type] = {
                value: data.totalValue,
                percentage: ((data.totalValue / (portfolioData?.totalValue || 1)) * 100).toFixed(2),
                count: data.assets.length
              };
              return acc;
            }, {}) : {},
          assetsByType: portfolioData?.assetsByType || {} // Add this for AI questions generation
        }}
        analysisData={{
          summary: {
            riskLevel: 'Medium', // Could be calculated based on portfolio data
            overallScore: 75 // Could be calculated based on portfolio performance
          }
        }}
      />


    </Box>
  );
};

export default Layout; 