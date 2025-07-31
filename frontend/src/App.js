import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Import Navigate
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import './styles/techEffects.css';
import './styles/localGlow.css';
import './styles/mobileOptimization.css';

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
import AIReportDetail from './pages/AIReportDetail'; // 新增AI报告详情页面

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
  // 📱 移动端响应式断点优化
  breakpoints: {
    values: {
      xs: 0,      // 超小屏 (手机竖屏)
      sm: 480,    // 小屏 (手机横屏)
      md: 768,    // 中屏 (平板竖屏)
      lg: 1024,   // 大屏 (平板横屏/小桌面)
      xl: 1200,   // 超大屏 (桌面)
    },
  },
  // 📐 移动端排版优化
  typography: {
    // 基础字体大小调整
    fontSize: 14,
    // 标题字体在移动端的响应式设置
    h1: {
      fontSize: '1.75rem',
      '@media (min-width:768px)': {
        fontSize: '2.5rem',
      },
      '@media (min-width:1024px)': {
        fontSize: '3rem',
      },
    },
    h2: {
      fontSize: '1.5rem',
      '@media (min-width:768px)': {
        fontSize: '2rem',
      },
      '@media (min-width:1024px)': {
        fontSize: '2.25rem',
      },
    },
    h3: {
      fontSize: '1.25rem',
      '@media (min-width:768px)': {
        fontSize: '1.75rem',
      },
    },
    h4: {
      fontSize: '1.125rem',
      '@media (min-width:768px)': {
        fontSize: '1.5rem',
      },
    },
    h5: {
      fontSize: '1rem',
      '@media (min-width:768px)': {
        fontSize: '1.25rem',
      },
    },
    h6: {
      fontSize: '0.875rem',
      '@media (min-width:768px)': {
        fontSize: '1rem',
      },
    },
    body1: {
      fontSize: '0.875rem',
      '@media (min-width:768px)': {
        fontSize: '1rem',
      },
    },
    body2: {
      fontSize: '0.75rem',
      '@media (min-width:768px)': {
        fontSize: '0.875rem',
      },
    },
  },
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
      default: '#000000', // 纯黑背景作为基础
      paper: 'rgba(20, 20, 25, 0.8)', // 带透明度的深色
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
                     // 使用你的hex颜色创建明显的背景光影效果
           background: `
             radial-gradient(ellipse 1200px 800px at 50% 0%, #7e7d8c40 0%, #69677930 30%, transparent 60%),
             radial-gradient(ellipse 800px 500px at 20% 20%, #53516625 0%, #3d3c5320 40%, transparent 70%),
             radial-gradient(ellipse 600px 400px at 80% 80%, #28264020 0%, #24223a15 50%, transparent 80%),
             linear-gradient(135deg, #000000 0%, #0a0510 25%, #050308 50%, #000000 100%)
           `,
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
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
          // 添加微妙的动画效果
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle 400px at 20% 30%, rgba(120, 70, 255, 0.03) 0%, transparent 50%),
              radial-gradient(circle 300px at 80% 70%, rgba(80, 120, 255, 0.02) 0%, transparent 50%)
            `,
            animation: 'backgroundShift 20s ease-in-out infinite alternate',
            pointerEvents: 'none',
            zIndex: -1,
          },
        },
        // 添加动画关键帧
        '@keyframes backgroundShift': {
          '0%': {
            transform: 'translateX(0px) translateY(0px)',
            opacity: 1,
          },
          '100%': {
            transform: 'translateX(30px) translateY(-20px)',
            opacity: 0.8,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(15, 15, 20, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            0 0 20px rgba(120, 70, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 4px 15px rgba(0, 0, 0, 0.2)
          `,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(120, 70, 255, 0.3) 50%, transparent 100%)',
          },
          '&:hover': {
            border: '1px solid rgba(120, 70, 255, 0.2)',
            boxShadow: `
              0 0 30px rgba(120, 70, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 8px 25px rgba(0, 0, 0, 0.3)
            `,
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease',
          },
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
          color: '#000000', // 更深的文字
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `
            0 0 20px rgba(244, 190, 126, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            transition: 'left 0.5s ease',
          },
          '&:hover': {
            background: 'linear-gradient(135deg, #E8A855 0%, #D4961F 50%, #B8821A 100%)',
            boxShadow: `
              0 0 30px rgba(244, 190, 126, 0.4),
              0 8px 25px rgba(244, 190, 126, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
            transform: 'translateY(-1px)',
            '&::before': {
              left: '100%',
            },
          },
          '&:active': {
            background: 'linear-gradient(135deg, #D4961F 0%, #B8821A 50%, #9A6B15 100%)',
            transform: 'translateY(0px)',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(232, 168, 85, 0.6)',
          color: '#E8A855',
          position: 'relative',
          background: 'rgba(232, 168, 85, 0.02)',
          backdropFilter: 'blur(5px)',
          boxShadow: `
            0 0 15px rgba(232, 168, 85, 0.1),
            inset 0 1px 0 rgba(232, 168, 85, 0.1)
          `,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(232, 168, 85, 0.5) 50%, transparent 100%)',
          },
          '&:hover': {
            borderColor: 'rgba(212, 150, 31, 0.8)',
            backgroundColor: 'rgba(232, 168, 85, 0.08)',
            boxShadow: `
              0 0 25px rgba(232, 168, 85, 0.2),
              inset 0 1px 0 rgba(232, 168, 85, 0.2),
              0 4px 15px rgba(232, 168, 85, 0.1)
            `,
            transform: 'translateY(-1px)',
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
                    <Route path="ai-report/:reportId" element={<AIReportDetail />} />
                    <Route path="" element={<Dashboard />} /> {/* Default to dashboard */}

                  </Routes>
                </Layout>
              } />

              {/* Legacy routes redirect to new structure */}

              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/portfolio" element={<Layout><Portfolio /></Layout>} />
              <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
              <Route path="/markets" element={<Layout><Markets /></Layout>} />
              <Route path="/ai-report/:reportId" element={<Layout><AIReportDetail /></Layout>} />

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