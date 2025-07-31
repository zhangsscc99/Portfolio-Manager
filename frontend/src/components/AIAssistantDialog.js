import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Paper,
  List,
  ListItem,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Fade,
  Slide,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Psychology as AIIcon,
  Person as UserIcon,
  AutoAwesome as SparkleIcon,
  TrendingUp,
  Warning,
  Minimize as MinimizeIcon,
  Maximize as MaximizeIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { buildApiUrl } from '../config/api';
import MarkdownText from './MarkdownText';

const AIAssistantDialog = ({ open, onClose, portfolioId, portfolioData, analysisData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isVerySmallScreen = useMediaQuery('(max-width:320px)');
  const isSmallScreen = useMediaQuery('(max-width:375px)');
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef({ x: 20, y: 20 });
  
  // 在移动端使用不同的初始位置
  useEffect(() => {
    if (isMobile) {
      const initialPosition = { x: 0, y: 0 }; // 移动端居中显示，不需要具体坐标
      setPosition(initialPosition);
      positionRef.current = initialPosition;
    }
  }, [isMobile]);

  // 监听窗口大小变化，确保对话框始终适配屏幕
  useEffect(() => {
    const handleResize = () => {
      if (isMobile && dialogRef.current) {
        // 在移动端，当窗口大小改变时，确保对话框尺寸正确
        const dimensions = getDialogDimensions();
        if (!isVerySmallScreen) {
          dialogRef.current.style.width = `${dimensions.width}px`;
          dialogRef.current.style.height = `${dimensions.height}px`;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isVerySmallScreen, isMinimized]);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  // Initialize persistent session when dialog opens
  useEffect(() => {
    if (open) {
      // Use portfolio-based session ID for persistent memory
      const persistentSessionId = portfolioId ? `portfolio_${portfolioId}` : uuidv4();
      setSessionId(persistentSessionId);
      setMessages([
        {
          id: 1,
          type: 'ai',
          content: `👋 Hello! I'm your AI Investment Assistant. I have access to your portfolio analysis and can help you with investment questions.

**Your portfolio summary:**
- Total Value: ${formatCurrency(portfolioData?.totalValue || 0)}
- Asset Types: ${Object.keys(portfolioData?.assetDistribution || {}).length}
- Risk Level: ${analysisData?.summary?.riskLevel || 'Unknown'}

Feel free to ask me anything about your investments, market outlook, or specific recommendations!

💾 **Memory Enabled**: I'll remember our conversation history across sessions for this portfolio.`,
          timestamp: new Date()
        }
      ]);
      setInputMessage('');
      setError(null);
      setIsMinimized(false);
      
      // 同步初始位置到ref
      positionRef.current = position;
      
      // Load existing conversation history if available
      if (portfolioId) {
        loadConversationHistory(persistentSessionId);
      }
      
      // Focus input after dialog animation
      setTimeout(() => {
        if (inputRef.current && !isMinimized) {
          inputRef.current.focus();
        }
      }, 300);
    }
  }, [open, portfolioData, analysisData, portfolioId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取对话框尺寸 - 更智能的响应式计算
  const getDialogDimensions = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (isMobile) {
      // 超小屏幕 (<320px)
      if (viewportWidth < 320) {
        return {
          width: isMinimized ? viewportWidth - 20 : viewportWidth - 10,
          height: isMinimized ? 'auto' : Math.min(400, viewportHeight - 40)
        };
      }
      // 小屏幕 (320px-375px)
      else if (viewportWidth < 375) {
        return {
          width: isMinimized ? Math.min(280, viewportWidth - 30) : Math.min(310, viewportWidth - 15),
          height: isMinimized ? 'auto' : Math.min(450, viewportHeight - 50)
        };
      }
      // 中等移动屏幕 (375px+)
      else {
        return {
          width: isMinimized ? Math.min(300, viewportWidth - 40) : Math.min(360, viewportWidth - 20),
          height: isMinimized ? 'auto' : Math.min(500, viewportHeight - 60)
        };
      }
    } else if (isTablet) {
      return {
        width: isMinimized ? 320 : 400,
        height: isMinimized ? 'auto' : 550
      };
    } else {
      return {
        width: isMinimized ? 350 : 450,
        height: isMinimized ? 'auto' : 600
      };
    }
  };

  // 优化的鼠标移动处理函数
  const handleMouseMove = useCallback((e) => {
    if (dialogRef.current && !isMobile) { // 在移动端禁用拖拽
      // 直接使用鼠标位置减去初始偏移，确保同步移动
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;
      
      const dimensions = getDialogDimensions();
      // 确保对话框不会拖出屏幕边界
      const maxX = window.innerWidth - dimensions.width;
      const maxY = window.innerHeight - (typeof dimensions.height === 'number' ? dimensions.height : 100);
      
      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));
      
      // 直接更新DOM位置，避免状态更新延迟
      dialogRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
      
      // 更新ref中的位置
      positionRef.current = { x: clampedX, y: clampedY };
    }
  }, [isMinimized, isMobile]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // 同步最终位置到state，用于重新渲染时的初始位置
    setPosition(positionRef.current);
  }, []);

  // Handle dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      // 防止文本选择
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback((e) => {
    // 在移动端禁用拖拽
    if (isMobile) return;
    
    // 防止在按钮上开始拖动
    if (e.target.closest('button') || e.target.closest('[role="button"]')) {
      return;
    }
    
    if (dialogRef.current) {
      const rect = dialogRef.current.getBoundingClientRect();
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      setIsDragging(true);
      e.preventDefault(); // 防止文本选择
    }
  }, [isMobile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load existing conversation history from server
  const loadConversationHistory = async (sessionId) => {
    try {
      console.log(`📚 Loading conversation history for session ${sessionId}...`);
      
      const response = await fetch(buildApiUrl(`/ai-analysis/chat/session/${sessionId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data.messageCount > 0) {
        console.log(`✅ Loaded ${result.data.messageCount} messages from history`);
        
        // Update the welcome message to indicate loaded history
        setMessages(prev => {
          const welcomeMessage = prev[0];
          return [{
            ...welcomeMessage,
            content: `👋 Welcome back! I'm your AI Investment Assistant with access to your portfolio analysis.

**Your portfolio summary:**
- Total Value: ${formatCurrency(portfolioData?.totalValue || 0)}
- Asset Types: ${Object.keys(portfolioData?.assetDistribution || {}).length}
- Risk Level: ${analysisData?.summary?.riskLevel || 'Unknown'}

💾 **Conversation Restored**: I've loaded our previous ${result.data.messageCount} messages. Feel free to continue our discussion!`
          }];
        });
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      // Continue without history - not a critical error
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);
    setAiGeneratedQuestions([]); // Clear previous AI questions when sending new message

    try {
      const response = await fetch(buildApiUrl('/ai-analysis/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMessage.content,
          portfolioId,
          portfolioContext: {
            portfolioData,
            analysisData,
            timestamp: new Date().toISOString()
          },
          requestFollowUpQuestions: true, // Request AI to generate follow-up questions
          conversationHistory: messages.slice(-4) // Send recent conversation context
        }),
      });

      const result = await response.json();

      if (result.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: result.data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Store AI-generated follow-up questions if available
        if (result.data.followUpQuestions && Array.isArray(result.data.followUpQuestions)) {
          setAiGeneratedQuestions(result.data.followUpQuestions);
        } else {
          setAiGeneratedQuestions([]); // Clear if no questions provided
        }
      } else {
        setError(result.error || 'Failed to get AI response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Network error occurred while sending message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInputMessage('');
    setError(null);
    setIsMinimized(false);
    onClose();
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized && inputRef.current) {
      // Focus input when expanding
      setTimeout(() => inputRef.current.focus(), 100);
    }
  };

  const getSuggestedQuestions = (messageHistory = [], isInitial = false) => {
    if (isInitial && portfolioData?.assetsByType) {
      console.log('🎯 Generating initial questions with portfolio data:', portfolioData);
      // Generate initial questions based on actual portfolio holdings
      const questions = [];
      
      // Add general questions
      questions.push("What are my biggest portfolio risks?");
      questions.push("How can I improve diversification?");
      
      // Add stock-specific questions based on actual holdings
      const stocks = portfolioData.assetsByType.stock?.assets || [];
      const crypto = portfolioData.assetsByType.crypto?.assets || [];
      const etf = portfolioData.assetsByType.etf?.assets || [];
      
      console.log('📊 Assets found - Stocks:', stocks.length, 'Crypto:', crypto.length, 'ETF:', etf.length);
      
      if (stocks.length > 0) {
        // Find the largest stock holding by current value
        const largestStock = stocks.reduce((prev, current) => {
          const prevValue = (prev.quantity || 0) * (prev.current_price || 0);
          const currentValue = (current.quantity || 0) * (current.current_price || 0);
          return prevValue > currentValue ? prev : current;
        });
        questions.push(`Should I sell my ${largestStock.name} (${largestStock.symbol}) stock?`);
      } else if (crypto.length > 0) {
        const largestCrypto = crypto.reduce((prev, current) => {
          const prevValue = (prev.quantity || 0) * (prev.current_price || 0);
          const currentValue = (current.quantity || 0) * (current.current_price || 0);
          return prevValue > currentValue ? prev : current;
        });
        questions.push(`What's your outlook on ${largestCrypto.name} (${largestCrypto.symbol})?`);
      } else if (etf.length > 0) {
        const largestETF = etf.reduce((prev, current) => {
          const prevValue = (prev.quantity || 0) * (prev.current_price || 0);
          const currentValue = (current.quantity || 0) * (current.current_price || 0);
          return prevValue > currentValue ? prev : current;
        });
        questions.push(`Is ${largestETF.name} (${largestETF.symbol}) a good long-term hold?`);
      }
      
      return questions.slice(0, 3);
    }
    
    // For non-initial (this will be replaced by AI-generated questions)
    const baseQuestions = [
      "What's your market outlook for next quarter?",
      "Should I increase my cash position?",
      "How does my portfolio compare to benchmarks?",
      "What sectors should I avoid right now?",
      "Is my risk level appropriate for my age?",
      "Should I consider international exposure?"
    ];
    
    // Get 3 random questions, but try to avoid recently asked ones
    const recentMessages = messageHistory.slice(-6).map(m => m.content?.toLowerCase() || '');
    const availableQuestions = baseQuestions.filter(q => 
      !recentMessages.some(msg => msg.includes(q.toLowerCase().substring(0, 15)))
    );
    
    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  if (!open) return null;

  const dimensions = getDialogDimensions();
  
  // 移动端定位逻辑 - 优化超小屏幕
  const getPosition = () => {
    if (isMobile) {
      // 超小屏幕时，占据更多空间，减少边距
      if (isVerySmallScreen) {
        return {
          position: 'fixed',
          left: '5px',
          top: '5px',
          right: '5px',
          bottom: '5px',
          transform: 'none'
        };
      } else {
        return {
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        };
      }
    } else {
      return {
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${position.x}px, ${position.y}px)`
      };
    }
  };

  return (
    <Paper
      ref={dialogRef}
      elevation={8}
      sx={{
        ...getPosition(),
        // 超小屏幕时不设置固定宽高，使用position属性
        ...(isVerySmallScreen ? {
          width: 'auto',
          height: 'auto'
        } : {
          width: dimensions.width,
          height: dimensions.height
        }),
        maxHeight: isVerySmallScreen ? '100vh' : (isMobile ? '90vh' : (isMinimized ? 'auto' : '80vh')),
        maxWidth: isVerySmallScreen ? '100vw' : (isMobile ? '95vw' : 'none'),
        minHeight: isVerySmallScreen ? '100vh' : 'auto',
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isVerySmallScreen ? 0 : (isMobile ? 2 : 3),
        overflow: 'hidden',
        transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
        boxShadow: isMobile ? '0 4px 20px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.4)',
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%), linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'content-box, border-box'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: isVerySmallScreen ? 1 : (isMobile ? 1.5 : 2),
          background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
          borderBottom: '1px solid #333',
          color: '#000',
          cursor: isMobile ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isVerySmallScreen ? 0.5 : 1 }}>
          {!isMobile && <DragIcon sx={{ color: '#000', fontSize: 16 }} />}
          <Avatar sx={{ 
            bgcolor: '#000',
            width: isVerySmallScreen ? 24 : (isMobile ? 28 : 32),
            height: isVerySmallScreen ? 24 : (isMobile ? 28 : 32)
          }}>
            <AIIcon sx={{ fontSize: isVerySmallScreen ? 14 : (isMobile ? 16 : 18), color: '#E8A855' }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 600, 
              fontSize: isVerySmallScreen ? '0.7rem' : (isMobile ? '0.8rem' : '0.9rem'), 
              color: '#000' 
            }}>
              {isVerySmallScreen ? 'AI Assistant' : 'AI Investment Assistant'}
            </Typography>
            {!isMinimized && !isMobile && (
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#333' }}>
                Portfolio ID: {portfolioId} • Session: {sessionId.split('-')[0]}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={isMinimized ? "Expand" : "Minimize"}>
            <IconButton 
              onClick={handleToggleMinimize} 
              size="small"
              sx={{
                width: 24,
                height: 24,
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }
              }}
            >
              {isMinimized ? <MaximizeIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton 
              onClick={handleClose} 
              size="small"
              sx={{
                width: 24,
                height: 24,
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Minimized state - show only last message preview */}
      {isMinimized && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ 
            color: '#ccc',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {messages.length > 1 
              ? `${messages[messages.length - 1]?.content?.replace(/\*\*/g, '').substring(0, 50)}...`
              : "Click to expand and start chatting"
            }
          </Typography>
        </Box>
      )}

      {/* Expanded state - full dialog */}
      {!isMinimized && (
        <>
          {/* Messages Area */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: isVerySmallScreen ? 0.5 : (isMobile ? 1 : 2),
            display: 'flex',
            flexDirection: 'column',
            maxHeight: isVerySmallScreen ? 'calc(100vh - 120px)' : (isMobile ? 300 : 400)
          }}>
                         {messages.length === 1 && !isLoading && (
               <Box sx={{ mb: 2 }}>
                 <Typography variant="body2" sx={{ mb: 1, fontSize: isVerySmallScreen ? '0.7rem' : '0.8rem', color: '#ccc' }}>
                   💡 Try asking:
                 </Typography>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                   {getSuggestedQuestions([], true).slice(0, isVerySmallScreen ? 2 : (isMobile ? 2 : 3)).map((question, index) => (
                     <Chip
                       key={index}
                       label={isVerySmallScreen && question.length > 30 ? `${question.substring(0, 27)}...` : 
                              (isMobile && question.length > 30 ? `${question.substring(0, 27)}...` : question)}
                       variant="outlined"
                       size="small"
                       onClick={() => {
                         setInputMessage(question);
                         // Focus the input after a brief delay to ensure state is updated
                         setTimeout(() => {
                           if (inputRef.current) {
                             inputRef.current.focus();
                           }
                         }, 100);
                       }}
                       sx={{ 
                         cursor: 'pointer',
                         fontSize: isVerySmallScreen ? '0.6rem' : (isMobile ? '0.65rem' : '0.7rem'),
                         height: isVerySmallScreen ? 18 : (isMobile ? 20 : 24),
                         color: '#E8A855',
                         borderColor: '#E8A855',
                         '&:hover': {
                           backgroundColor: 'rgba(232, 168, 85, 0.1)',
                           borderColor: '#D4961F'
                         }
                       }}
                     />
                   ))}
                 </Box>
                 <Divider sx={{ mt: 1.5, borderColor: '#333' }} />
               </Box>
             )}

                        <List sx={{ width: '100%', p: 0 }}>
              {messages.map((message, index) => (
                <React.Fragment key={message.id}>
                  <Fade in timeout={300}>
                    <ListItem sx={{ 
                      flexDirection: 'column', 
                      alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
                      px: 0,
                      py: 0.5
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: 1,
                        maxWidth: '90%',
                        flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                      }}>
                                               <Avatar sx={{ 
                           width: isVerySmallScreen ? 16 : (isMobile ? 20 : 24), 
                           height: isVerySmallScreen ? 16 : (isMobile ? 20 : 24),
                           bgcolor: message.type === 'user' ? '#E8A855' : '#000'
                         }}>
                           {message.type === 'user' ? 
                             <UserIcon sx={{ fontSize: isVerySmallScreen ? 10 : (isMobile ? 12 : 14), color: '#000' }} /> : 
                             <AIIcon sx={{ fontSize: isVerySmallScreen ? 10 : (isMobile ? 12 : 14), color: '#E8A855' }} />
                           }
                         </Avatar>
                         <Paper sx={{ 
                           p: isVerySmallScreen ? 0.5 : (isMobile ? 1 : 1.5), 
                           backgroundColor: message.type === 'user' ? '#E8A855' : '#333',
                           color: message.type === 'user' ? '#000' : '#fff',
                           borderRadius: 2,
                           position: 'relative',
                           border: message.type === 'user' ? '1px solid #D4961F' : '1px solid #555'
                         }}>
                          <MarkdownText 
                            variant="body2" 
                            sx={{ 
                              lineHeight: 1.4,
                              fontSize: isVerySmallScreen ? '0.7rem' : (isMobile ? '0.8rem' : '0.85rem'),
                              '& > div': { marginBottom: '0.2rem' },
                              '& > div:last-child': { marginBottom: 0 },
                              '& p': { margin: 0 },
                              '& br': { lineHeight: 0.5 }
                            }}
                          >
                            {message.content}
                          </MarkdownText>
                          <Typography variant="caption" sx={{ 
                            display: 'block',
                            mt: 0.5,
                            opacity: 0.7,
                            fontSize: isVerySmallScreen ? '0.6rem' : (isMobile ? '0.65rem' : '0.7rem')
                          }}>
                            {message.timestamp.toLocaleTimeString()}
                          </Typography>
                        </Paper>
                      </Box>
                    </ListItem>
                  </Fade>
                  
                  {/* Show suggested questions after AI messages (but not during loading or for welcome message) */}
                  {message.type === 'ai' && index === messages.length - 1 && !isLoading && messages.length > 1 && (
                    <Fade in timeout={500}>
                      <ListItem sx={{ 
                        flexDirection: 'column', 
                        alignItems: 'flex-start',
                        px: 0,
                        py: 1
                      }}>
                        <Box sx={{ maxWidth: '90%', ml: isVerySmallScreen ? 2 : (isMobile ? 3 : 4) }}>
                          <Typography variant="caption" sx={{ 
                            color: '#ccc', 
                            fontSize: isVerySmallScreen ? '0.6rem' : '0.7rem',
                            mb: 0.5,
                            display: 'block'
                          }}>
                            💡 Try asking:
                          </Typography>
                                                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                             {(aiGeneratedQuestions.length > 0 ? aiGeneratedQuestions : getSuggestedQuestions(messages.slice(0, index + 1))).map((question, qIndex) => (
                                                             <Chip
                                 key={qIndex}
                                 label={isVerySmallScreen && question.length > 35 ? `${question.substring(0, 32)}...` : question}
                                 variant="outlined"
                                 size="small"
                                 onClick={() => {
                                   setInputMessage(question);
                                   // Focus the input after a brief delay to ensure state is updated
                                   setTimeout(() => {
                                     if (inputRef.current) {
                                       inputRef.current.focus();
                                     }
                                   }, 100);
                                 }}
                                 sx={{ 
                                   cursor: 'pointer',
                                   fontSize: isVerySmallScreen ? '0.6rem' : (isMobile ? '0.65rem' : '0.7rem'),
                                   height: isVerySmallScreen ? 18 : (isMobile ? 20 : 24),
                                   color: '#E8A855',
                                   borderColor: '#E8A855',
                                   alignSelf: 'flex-start',
                                   '&:hover': {
                                     backgroundColor: 'rgba(232, 168, 85, 0.1)',
                                     borderColor: '#D4961F'
                                   }
                                 }}
                               />
                            ))}
                          </Box>
                        </Box>
                      </ListItem>
                    </Fade>
                  )}
                </React.Fragment>
              ))}
            </List>

            {/* Loading indicator */}
            {isLoading && (
              <ListItem sx={{ 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                px: 0,
                py: 0.5
              }}>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   <Avatar sx={{ width: isVerySmallScreen ? 16 : (isMobile ? 20 : 24), height: isVerySmallScreen ? 16 : (isMobile ? 20 : 24), bgcolor: '#000' }}>
                     <AIIcon sx={{ fontSize: isVerySmallScreen ? 10 : (isMobile ? 12 : 14), color: '#E8A855' }} />
                   </Avatar>
                   <Paper sx={{ p: isVerySmallScreen ? 0.5 : (isMobile ? 1 : 1.5), backgroundColor: '#333', borderRadius: 2, border: '1px solid #555' }}>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                       <CircularProgress size={14} sx={{ color: '#E8A855' }} />
                       <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#fff' }}>
                         AI is thinking...
                       </Typography>
                     </Box>
                   </Paper>
                 </Box>
              </ListItem>
            )}

                         {/* Error message */}
             {error && (
               <Alert 
                 severity="error" 
                 sx={{ 
                   mt: 1, 
                   fontSize: '0.8rem',
                   backgroundColor: '#2d1a1a',
                   color: '#ffcccb',
                   border: '1px solid #ff6b6b',
                   '& .MuiAlert-icon': {
                     color: '#ff6b6b'
                   }
                 }} 
                 onClose={() => setError(null)}
               >
                 {error}
               </Alert>
             )}

            <div ref={messagesEndRef} />
          </Box>

                     {/* Input Area */}
           <Box sx={{ 
             p: isVerySmallScreen ? 0.5 : (isMobile ? 1 : 1.5), 
             borderTop: '1px solid #333',
             background: '#1a1a1a'
           }}>
             <Box sx={{ 
               display: 'flex', 
               gap: 1,
               alignItems: 'flex-end'
             }}>
               <TextField
                 ref={inputRef}
                 fullWidth
                 multiline
                 maxRows={isVerySmallScreen ? 2 : (isMobile ? 3 : 2)}
                 placeholder={isVerySmallScreen ? "Ask me..." : "Ask me about your portfolio..."}
                 value={inputMessage}
                 onChange={(e) => setInputMessage(e.target.value)}
                 onKeyPress={handleKeyPress}
                 disabled={isLoading}
                 variant="outlined"
                 size="small"
                 sx={{
                   '& .MuiOutlinedInput-root': {
                     borderRadius: 2,
                     fontSize: isVerySmallScreen ? '0.75rem' : (isMobile ? '0.8rem' : '0.85rem'),
                     backgroundColor: '#333',
                     color: '#fff',
                     '& fieldset': {
                       borderColor: '#E8A855',
                     },
                     '&:hover fieldset': {
                       borderColor: '#D4961F',
                     },
                     '&.Mui-focused fieldset': {
                       borderColor: '#F4BE7E',
                     }
                   },
                   '& .MuiInputBase-input::placeholder': {
                     color: '#ccc',
                     opacity: 1
                   }
                 }}
               />
               <IconButton
                 onClick={handleSendMessage}
                 disabled={!inputMessage.trim() || isLoading}
                 size="small"
                 sx={{
                   bgcolor: '#E8A855',
                   color: '#000',
                   width: isVerySmallScreen ? 24 : (isMobile ? 28 : 32),
                   height: isVerySmallScreen ? 24 : (isMobile ? 28 : 32),
                   '&:hover': {
                     bgcolor: '#D4961F',
                   },
                   '&:disabled': {
                     bgcolor: '#555',
                     color: '#999'
                   }
                 }}
               >
                 <SendIcon fontSize={isVerySmallScreen ? 'small' : 'small'} />
               </IconButton>
             </Box>
           </Box>
        </>
      )}
    </Paper>
  );
};

export default AIAssistantDialog; 