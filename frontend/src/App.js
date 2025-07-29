import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import './styles/techEffects.css';

// Components
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Analytics from './pages/Analytics';
import Markets from './pages/Markets';
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
          // 创建类似图片中的背景光影效果
          background: `
            radial-gradient(ellipse 800px 600px at 50% 0%, rgba(120, 70, 255, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 600px 400px at 0% 100%, rgba(80, 120, 255, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 400px 300px at 100% 50%, rgba(255, 100, 150, 0.04) 0%, transparent 50%),
            linear-gradient(135deg, #000000 0%, #0a0508 25%, #080510 50%, #000000 100%)
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
                    <Route path="markets" element={<Markets />} />
                    <Route path="ai-analysis" element={<AIAnalysis />} />
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