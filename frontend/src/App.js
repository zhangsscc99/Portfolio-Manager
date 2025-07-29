import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import Markets from './pages/Markets';
import ScrollProgress from './components/ScrollProgress';
import ParallaxBackground from './components/ParallaxBackground';

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
      main: '#E8A855', // 中等金色 - 主色
      light: '#F4BE7E', // 浅金色 - 浅色版本
      dark: '#D4961F', // 深金色 - 深色版本
    },
    secondary: {
      main: '#B8821A', // 更深的金色作为辅助色
      light: '#E8A855', // 与主色呼应
      dark: '#9A6B15', // 最深的金色
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
      main: '#F4BE7E', // 使用浅金色作为警告色
      light: '#F8D5A8', // 更浅的金色
      dark: '#E8A855', // 中等金色
    },
    // 🎨 自定义金色调色板
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
          color: '#1a1a1a', // 深色文字在金色背景上
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
            {/* 全局滚动进度条 */}
            <ScrollProgress />
            
            {/* 视差背景效果 */}
            <ParallaxBackground />
            
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
                    <Route path="markets" element={<Markets />} />
                    <Route path="" element={<Dashboard />} /> {/* Default to dashboard */}
                  </Routes>
                </Layout>
              } />
              
              {/* Legacy routes redirect to new structure */}
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/portfolio" element={<Layout><Portfolio /></Layout>} />
              <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
              <Route path="/markets" element={<Layout><Markets /></Layout>} />
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