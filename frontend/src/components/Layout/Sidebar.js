import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as PortfolioIcon,
  Analytics as AnalyticsIcon,
  ShowChart as MarketsIcon,
  ChevronRight as ExpandMoreIcon,
  ExpandMore as ChevronDownIcon,
  ViewList as ETFIcon,
  AttachMoney as StocksIcon,
  MonetizationOn as CurrencyIcon,
  CurrencyBitcoin as CryptoIcon,
} from '@mui/icons-material';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: DashboardIcon,
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    path: '/app/portfolio',
    icon: PortfolioIcon,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/app/analytics',
    icon: AnalyticsIcon,
  },
  {
    id: 'markets',
    label: 'Markets',
    path: '/markets',
    icon: MarketsIcon,
    children: [
      {
        id: 'stocks',
        label: 'Stocks',
        path: '/markets/stock',
        icon: StocksIcon,
      },
      {
        id: 'currency',
        label: 'Currencies',
        path: '/markets/currency',
        icon: CurrencyIcon,
      },
      {
        id: 'crypto',
        label: 'Crypto',
        path: '/markets/crypto',
        icon: CryptoIcon,
      },
      
      {
        id: 'etf',
        label: 'ETFs',
        path: '/markets/etf',
        icon: ETFIcon,
      },
    ],
  },
];

const Sidebar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMarketSubmenu, setOpenMarketSubmenu] = useState(false);

  // Determine if any market sub-item is currently active
  const isAnyMarketChildActive = navigationItems.find(item => item.id === 'markets')
    ?.children?.some(child => location.pathname.startsWith(child.path));

  // Effect to handle initial market submenu state and default navigation
  useEffect(() => {
    const marketsItem = navigationItems.find(item => item.id === 'markets');
    if (marketsItem && marketsItem.children && marketsItem.children.length > 0) {
      // If a child of markets is active, open the submenu
      if (isAnyMarketChildActive) {
        setOpenMarketSubmenu(true);
      } else if (location.pathname === marketsItem.path) {
        // If we are exactly on '/markets', redirect to its first child
        const firstChildPath = marketsItem.children[0].path;
        navigate(firstChildPath);
        if (onNavigate) {
          onNavigate();
        }
      }
    }
  }, [location.pathname, navigate, onNavigate, isAnyMarketChildActive]);

  const handleNavigation = (item) => {
    if (item.children && item.children.length > 0) {
      // If it's a parent item with children (like Markets), toggle its submenu
      setOpenMarketSubmenu(!openMarketSubmenu);
      // If it's currently closed and we're opening it, navigate to its first child
      if (!openMarketSubmenu && !isAnyMarketChildActive) {
          const firstChildPath = item.children[0].path;
          navigate(firstChildPath);
          if (onNavigate) {
            onNavigate();
          }
      } else if (!openMarketSubmenu && isAnyMarketChildActive) {
        // If opening but a child is already active, stay on active child
        // No explicit navigation needed here as route is already correct
      }
    } else {
      // If it's a regular item or a sub-item, navigate directly
      navigate(item.path);
      if (onNavigate) {
        onNavigate();
      }
    }
  };

  // --- MODIFICATION STARTS HERE ---
  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    // Ensure 'Markets' parent never highlights itself directly
    const marketsItem = navigationItems.find(item => item.id === 'markets');
    if (path === marketsItem.path) {
      return false; // Explicitly set to false so 'Markets' never highlights
    }
    return location.pathname === path;
  };
  // --- MODIFICATION ENDS HERE ---

  const isSubmenuActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
      }}
    >
      {/* Logo and Brand */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: '#1a1a1a', // 深色文字在金色背景上
                fontWeight: 700,
                fontSize: '1.2rem',
              }}
            >
              P
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              cursor: 'pointer',
              '&:hover': {
                color: 'primary.main',
              },
            }}
            onClick={() => navigate('/')}
          >
            Portfolio Manager
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Navigation */}
      <List sx={{ flex: 1, py: 0 }}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path); // 'active' for parent menu items
          const hasChildren = item.children && item.children.length > 0;

          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  backgroundColor: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: active ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    backgroundColor: active 
                      ? 'rgba(99, 102, 241, 0.15)' 
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                  '&:before': active ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: '70%',
                    backgroundColor: 'primary.main',
                    borderRadius: '0 2px 2px 0',
                  } : {},
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'inherit',
                    minWidth: 40,
                  }}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      bgcolor: 'secondary.main',
                      color: 'white',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            textAlign: 'center',
            display: 'block',
          }}
        >
          Portfolio Manager v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;