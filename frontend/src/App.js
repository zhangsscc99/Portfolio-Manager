import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Import Navigate
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

// Components
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Analytics from './pages/Analytics';
import Markets from './pages/Markets'; // This will become a parent route

// New Market Sub-pages (assuming you'll create these files)
import Stock from './pages/Markets/Stock';
import Bonds from './pages/Markets/Bonds';
import ETF from './pages/Markets/ETF';
import Crypto from './pages/Markets/Crypto';
import AIAnalysis from './pages/AIAnalysis';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Create Material-UI dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E8A855', // Medium Gold - Primary color
      light: '#F4BE7E', // Light Gold - Light version
      dark: '#D4961F', // Dark Gold - Dark version
    },
    secondary: {
      main: '#B8821A', // Deeper gold as secondary color
      light: '#E8A855', // Harmonizes with primary
      dark: '#9A6B15', // Deepest gold
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a1a1aa',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#F4BE7E', // Using light gold as warning color
      light: '#F8D5A8', // Lighter gold
      dark: '#E8A855', // Medium gold
    },
    // 🎨 Custom Gold Palette
    gold: {
      50: '#FEF9F0',
      100: '#FDF2E0',
      200: '#F8D5A8',
      300: '#F4BE7E',
      400: '#E8A855',
      500: '#D4961F',
      600: '#B8821A',
      700: '#9A6B15',
      800: '#7C5510',
      900: '#5E3F0C',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '0.875rem',
    },
    body2: {
      fontSize: '0.75rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: '8px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
          color: '#1a1a1a', // Dark text on gold background
          '&:hover': {
            background: 'linear-gradient(135deg, #E8A855 0%, #D4961F 50%, #B8821A 100%)',
            boxShadow: '0 8px 25px rgba(244, 190, 126, 0.3)',
          },
          '&:active': {
            background: 'linear-gradient(135deg, #D4961F 0%, #B8821A 50%, #9A6B15 100%)',
          },
        },
        outlinedPrimary: {
          borderColor: '#E8A855',
          color: '#E8A855',
          '&:hover': {
            borderColor: '#D4961F',
            backgroundColor: 'rgba(232, 168, 85, 0.1)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '&.MuiChip-colorPrimary': {
            background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 100%)',
            color: '#1a1a1a',
            fontWeight: 500,
          },
        },
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <Routes>
              {/* Homepage route - no layout */}
              <Route path="/" element={<HomePage />} />

              {/* Main app routes - with layout */}
              <Route path="/app/*" element={
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="portfolio" element={<Portfolio />} />
                    <Route path="analytics" element={<Analytics />} />
                    {/* Markets route with nested routes for sub-menus */}
                    <Route path="markets/*" element={<Markets />}>
                      <Route path="stock" element={<Stock />} />
                    <Route path="bonds" element={<Bonds />} />
                      <Route path="etf" element={<ETF />} />
                      <Route path="crypto" element={<Crypto />} />
                      {/* Redirect from /app/markets to a default sub-page (e.g., stock) */}
                      <Route path="" element={<Navigate to="stock" replace />} />
                    </Route>
                    <Route path="ai-analysis" element={<AIAnalysis />} />
                    {/* Default to dashboard if no specific /app route is matched */}
                    <Route path="" element={<Dashboard />} />
                  </Routes>
                </Layout>
              } />

              {/* Legacy routes redirect to new structure */}
              {/* You might want to update these to redirect to the new /app/* structure */}
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/portfolio" element={<Navigate to="/app/portfolio" replace />} />
              <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
              {/* For /markets, redirect to the default sub-page within the new structure */}
              <Route path="/markets" element={<Navigate to="/app/markets/stock" replace />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1a1a',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                },
              }}
            />
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;