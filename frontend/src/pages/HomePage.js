import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp,
  Security,
  Analytics,
  Speed,
  Dashboard as DashboardIcon,
  ArrowForward,
} from '@mui/icons-material';

const HomePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      title: 'Real-time Tracking',
      description: 'Monitor your portfolio performance in real-time with accurate market data and price updates.',
      color: '#E8A855',
    },
    {
      icon: <Analytics sx={{ fontSize: 40 }} />,
      title: 'Advanced Analytics',
      description: 'Get professional-grade investment analysis including risk assessment, return analysis, and recommendations.',
      color: '#F4BE7E',
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security protection ensures your investment data and privacy are safeguarded.',
      color: '#D4961F',
    },
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: 'Lightning Fast',
      description: 'Experience blazing-fast response times to seize opportunities in rapidly changing markets.',
      color: '#B8821A',
    },
  ];

  const handleGetStarted = () => {
    navigate('/app/dashboard');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰元素 */}
      <Box sx={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(232, 168, 85, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 0,
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: -100,
        left: -100,
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(244, 190, 126, 0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 0,
      }} />

      {/* 顶部导航 */}
      <Box sx={{ 
        position: 'relative', 
        zIndex: 10,
        py: 2,
        px: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: '#1a1a1a',
                fontWeight: 700,
              }}
            >
              P
            </Typography>
          </Box>
          <Typography 
            variant="h5" 
            className="gradient-text"
            sx={{ fontWeight: 700 }}
          >
            Openfolio - Your Portfolio Manager
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          onClick={handleGetStarted}
          sx={{
            borderColor: '#E8A855',
            color: '#E8A855',
            '&:hover': {
              borderColor: '#F4BE7E',
              backgroundColor: 'rgba(232, 168, 85, 0.1)',
            },
          }}
        >
          Get Started
        </Button>
      </Box>

      {/* 其余内容层级提升，确保在视频之上 */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 5 }}>
        {/* 主标题区域 */}
        <Box sx={{ 
          textAlign: 'center', 
          py: { xs: 8, md: 12 },
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative', // 使视频/图片定位于此区域
        }} className="homepage-hero">
          {/* 背景视频或帧图片：放在主标题区域的正后方 */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
              overflow: 'hidden',
              pointerEvents: 'none', // 不影响交互
            }}
          >
            {/* React实现滚动切换视频/图片帧 */}
            <ScrollVideoOrFrames />
          </Box>
          {/* 主标题内容，zIndex提升，确保在视频/图片之上 */}
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            <Fade in timeout={0}>
              <Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '4rem' },
                    fontWeight: 800,
                    mb: 3,
                    lineHeight: 1.2,
                    background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Track. Optimize. Invest.
                </Typography>
                <Typography
                  variant="h2"
                  className="gradient-text"
                  sx={{
                    fontSize: { xs: '1.8rem', md: '2.5rem' },
                    fontWeight: 600,
                    mb: 2,
                    opacity: 0.9,
                  }}
                >
                  Openfolio - Your Portfolio Manager
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: { xs: '1rem', md: '1.25rem' },
                    color: 'rgba(255, 255, 255, 0.7)',
                    mb: 6,
                    maxWidth: 600,
                    mx: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  Openfolio is your professional investment companion. Track real-time market data, analyze performance, optimize asset allocation, and make smarter investment decisions.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGetStarted}
                    endIcon={<ArrowForward />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
                      color: '#1a1a1a',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #E8A855 0%, #D4961F 50%, #B8821A 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(244, 190, 126, 0.4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Start Your Journey
                  </Button>
                </Box>
              </Box>
            </Fade>
          </Box>
        </Box>

                 {/* 产品演示视频 */}
         <Box sx={{ py: 8, textAlign: 'center' }}>
           <Typography
             variant="h3"
             className="gradient-text"
             sx={{
               mb: 6,
               fontWeight: 700,
               fontSize: { xs: '2rem', md: '2.5rem' },
             }}
           >
             See It In Action
           </Typography>

          <Box className="homepage-video-container">
            <VideoPlayer
              src="/pm.mp4"
              poster="/video-poster.jpg"
              title="Openfolio - Your Portfolio Manager"
              description="Experience the power of professional investment management"
            />
          </Box>

           <Typography
             variant="body1"
             sx={{
               mt: 4,
               color: 'rgba(255, 255, 255, 0.7)',
               fontSize: '1.1rem',
               maxWidth: 600,
               mx: 'auto',
             }}
           >
             Watch how Openfolio transforms your investment workflow with real-time tracking, 
             advanced analytics, and intuitive portfolio management.
           </Typography>
         </Box>

         {/* 功能特色区域 */}
         <Box sx={{ py: 8 }}>
                     <Typography
             variant="h3"
             className="gradient-text"
             sx={{
               textAlign: 'center',
               mb: 6,
               fontWeight: 700,
               fontSize: { xs: '2rem', md: '2.5rem' },
             }}
           >
             Why Choose Us?
           </Typography>

          <Grid container spacing={4} className="homepage-features-grid">
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Slide direction="up" in timeout={800 + index * 200}>
                  <Card
                    sx={{
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 20px 40px rgba(${feature.color === '#E8A855' ? '232, 168, 85' : 
                          feature.color === '#F4BE7E' ? '244, 190, 126' :
                          feature.color === '#D4961F' ? '212, 150, 31' : '184, 130, 26'}, 0.3)`,
                        borderColor: feature.color,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <Box
                        sx={{
                          color: feature.color,
                          mb: 2,
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        className="gradient-text"
                        sx={{
                          fontWeight: 600,
                          mb: 2,
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          lineHeight: 1.6,
                        }}
                      >
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Slide>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA区域 */}
        <Box sx={{ 
          py: 8, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(244, 190, 126, 0.1) 0%, rgba(232, 168, 85, 0.05) 100%)',
          borderRadius: 4,
          border: '1px solid rgba(232, 168, 85, 0.2)',
          mb: 8
        }}>
                     <Typography
             variant="h4"
             className="gradient-text"
             sx={{
               fontWeight: 700,
               mb: 2,
               fontSize: { xs: '1.75rem', md: '2.25rem' },
             }}
           >
             Ready to Start Your Investment Journey?
           </Typography>
           
           <Typography
             variant="h6"
             sx={{
               color: 'rgba(255, 255, 255, 0.8)',
               mb: 4,
               fontSize: { xs: '1rem', md: '1.1rem' },
             }}
           >
             Take control of your financial future with professional-grade investment tools
           </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            endIcon={<DashboardIcon />}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
              color: '#1a1a1a',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #E8A855 0%, #D4961F 50%, #B8821A 100%)',
                transform: 'translateY(-3px)',
                boxShadow: '0 12px 30px rgba(244, 190, 126, 0.5)',
              },
              transition: 'all 0.3s ease',
            }}
                     >
             Enter Dashboard
           </Button>
        </Box>

        {/* QR码访问区域 */}
        <Box sx={{ 
          py: 8, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(232, 168, 85, 0.08) 0%, rgba(244, 190, 126, 0.03) 100%)',
          borderRadius: 4,
          border: '1px solid rgba(232, 168, 85, 0.15)',
          mt: 8
        }}>
          <Typography
            variant="h4"
            className="gradient-text"
            sx={{
              fontWeight: 700,
              mb: 3,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            Access Anywhere, Anytime
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4,
              fontSize: { xs: '0.9rem', md: '1rem' },
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Get instant access to Openfolio from any device. Scan the QR code or visit our website directly.
          </Typography>

          <Grid container spacing={4} alignItems="center" justifyContent="center">
            {/* QR码区域 */}
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{
                  p: 3,
                  background: 'white',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  border: '2px solid rgba(232, 168, 85, 0.2)'
                }}>
                                     <img 
                     src="/qrcode_finance_app2.png" 
                     alt="Openfolio QR Code"
                     style={{
                       width: '220px',
                       height: '220px',
                       display: 'block'
                     }}
                   />
                </Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 600,
                    fontSize: { xs: '0.9rem', md: '1rem' }
                  }}
                >
                  📱 Scan with your mobile device
                </Typography>
              </Box>
            </Grid>

            {/* 网址区域 */}
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 3
              }}>
                <Typography
                  variant="h5"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 600,
                    mb: 1,
                    fontSize: { xs: '1.1rem', md: '1.3rem' }
                  }}
                >
                  Or visit our website:
                </Typography>
                
                <Box sx={{
                  p: 3,
                  background: 'rgba(15, 15, 20, 0.7)',
                  border: '2px solid rgba(232, 168, 85, 0.3)',
                  borderRadius: 3,
                  backdropFilter: 'blur(10px)',
                  minWidth: { xs: '280px', md: '320px' }
                }}>
                                     <Typography
                     variant="h4"
                     sx={{
                       background: 'linear-gradient(90deg, #9CA8DA 0%, #C49A71 100%)',
                       backgroundClip: 'text',
                       WebkitBackgroundClip: 'text',
                       WebkitTextFillColor: 'transparent',
                       fontFamily: 'monospace',
                       fontSize: { xs: '1.4rem', md: '1.8rem' },
                       fontWeight: 900,
                       letterSpacing: '1px'
                     }}
                   >
                     http://cn-tech.net
                   </Typography>
                </Box>

                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: { xs: '0.85rem', md: '0.95rem' },
                    textAlign: 'center',
                    maxWidth: 300,
                    lineHeight: 1.5
                  }}
                >
                  🌐 Copy and paste into your browser, or bookmark for easy access
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: { xs: '0.8rem', md: '0.85rem' },
                fontStyle: 'italic'
              }}
            >
              Professional Portfolio Management •  Real-time Analytics •  AI-Powered Insights
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* 底部信息 */}
      <Box sx={{ 
        py: 4, 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        <Container>
                   <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
           © 2025 Openfolio - Your Portfolio Manager. Professional Investment Management Platform v1.0.0
         </Typography>
        </Container>
      </Box>
    </Box>
  );
};

/**
 * 根据滚动进度切换显示视频或图片帧
 */
function ScrollVideoOrFrames() {
  // 帧图片总数
  const TOTAL_FRAMES = 10;
  // 滚动多少像素后切换为帧图片
  const SWITCH_SCROLL_Y = 1; // px

  const [scrollY, setScrollY] = React.useState(0);

  React.useEffect(() => {
    // 滚动事件监听器，带节流
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY || window.pageYOffset || document.documentElement.scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 判断是否切换为帧图片
  if (scrollY < SWITCH_SCROLL_Y) {
    // 显示GIF图片（替代原视频）
    return (
      <img
        src="/rotating-animation.gif"
        alt="Rotating Animation"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.7) blur(1px)',
        }}
        draggable={false}
      />
    );
  } else {
    // 计算当前帧编号（1 ~ TOTAL_FRAMES）
    // 滚动区间 [SWITCH_SCROLL_Y, SWITCH_SCROLL_Y+1000] 映射到帧区间
    const maxScroll = 100;
    const progress = Math.min(Math.max(scrollY - SWITCH_SCROLL_Y, 0), maxScroll) / maxScroll;
    const frameNo = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(progress * (TOTAL_FRAMES - 1)) + 1));
    const frameSrc = `/frame-extractor-1/Picture${frameNo}.png`;
    return (
      <img
        src={frameSrc}
        alt={`Frame ${frameNo}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.7) blur(1px)',
        }}
        draggable={false}
      />
    );
  }
}

export default HomePage; 
