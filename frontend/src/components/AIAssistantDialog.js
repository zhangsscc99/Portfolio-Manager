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
  Tooltip
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

const AIAssistantDialog = ({ open, onClose, portfolioId, portfolioData, analysisData }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef({ x: 20, y: 20 });
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

Your portfolio summary:
• Total Value: ${formatCurrency(portfolioData?.totalValue || 0)}
• Asset Types: ${Object.keys(portfolioData?.assetDistribution || {}).length}
• Risk Level: ${analysisData?.summary?.riskLevel || 'Unknown'}

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

  // 优化的鼠标移动处理函数
  const handleMouseMove = useCallback((e) => {
    if (dialogRef.current) {
      // 直接使用鼠标位置减去初始偏移，确保同步移动
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;
      
      // 确保对话框不会拖出屏幕边界
      const maxX = window.innerWidth - (isMinimized ? 350 : 450);
      const maxY = window.innerHeight - (isMinimized ? 100 : 600);
      
      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));
      
      // 直接更新DOM位置，避免状态更新延迟
      dialogRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
      
      // 更新ref中的位置
      positionRef.current = { x: clampedX, y: clampedY };
    }
  }, [isMinimized]);

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
  }, []);

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

Your portfolio summary:
• Total Value: ${formatCurrency(portfolioData?.totalValue || 0)}
• Asset Types: ${Object.keys(portfolioData?.assetDistribution || {}).length}
• Risk Level: ${analysisData?.summary?.riskLevel || 'Unknown'}

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
          }
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

  const getSuggestedQuestions = () => [
    "What are my biggest portfolio risks?",
    "Should I sell my Tesla stock?",
    "How can I improve diversification?",
    "What's your outlook on my crypto holdings?",
    "When should I rebalance my portfolio?"
  ];

  if (!open) return null;

  return (
    <Paper
      ref={dialogRef}
      elevation={8}
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: isMinimized ? 350 : 450,
        height: isMinimized ? 'auto' : 600,
        maxHeight: isMinimized ? 'auto' : '80vh',
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
          p: 2,
          background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
          borderBottom: '1px solid #333',
          color: '#000',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DragIcon sx={{ color: '#000', fontSize: 16 }} />
          <Avatar sx={{ 
            bgcolor: '#000',
            width: 32,
            height: 32
          }}>
            <AIIcon sx={{ fontSize: 18, color: '#E8A855' }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#000' }}>
              AI Investment Assistant
            </Typography>
            {!isMinimized && (
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
              ? `${messages[messages.length - 1]?.content?.substring(0, 50)}...`
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
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 400
          }}>
                         {messages.length === 1 && (
               <Box sx={{ mb: 2 }}>
                 <Typography variant="body2" sx={{ mb: 1, fontSize: '0.8rem', color: '#ccc' }}>
                   💡 Try asking:
                 </Typography>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                   {getSuggestedQuestions().slice(0, 3).map((question, index) => (
                     <Chip
                       key={index}
                       label={question}
                       variant="outlined"
                       size="small"
                       onClick={() => setInputMessage(question)}
                       sx={{ 
                         cursor: 'pointer',
                         fontSize: '0.7rem',
                         height: 24,
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
                <Fade key={message.id} in timeout={300}>
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
                         width: 24, 
                         height: 24,
                         bgcolor: message.type === 'user' ? '#E8A855' : '#000'
                       }}>
                         {message.type === 'user' ? 
                           <UserIcon sx={{ fontSize: 14, color: '#000' }} /> : 
                           <AIIcon sx={{ fontSize: 14, color: '#E8A855' }} />
                         }
                       </Avatar>
                       <Paper sx={{ 
                         p: 1.5, 
                         backgroundColor: message.type === 'user' ? '#E8A855' : '#333',
                         color: message.type === 'user' ? '#000' : '#fff',
                         borderRadius: 2,
                         position: 'relative',
                         border: message.type === 'user' ? '1px solid #D4961F' : '1px solid #555'
                       }}>
                        <Typography variant="body2" sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.4,
                          fontSize: '0.85rem'
                        }}>
                          {message.content}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          display: 'block',
                          mt: 0.5,
                          opacity: 0.7,
                          fontSize: '0.7rem'
                        }}>
                          {message.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Paper>
                    </Box>
                  </ListItem>
                </Fade>
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
                   <Avatar sx={{ width: 24, height: 24, bgcolor: '#000' }}>
                     <AIIcon sx={{ fontSize: 14, color: '#E8A855' }} />
                   </Avatar>
                   <Paper sx={{ p: 1.5, backgroundColor: '#333', borderRadius: 2, border: '1px solid #555' }}>
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
             p: 1.5, 
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
                 maxRows={2}
                 placeholder="Ask me about your portfolio..."
                 value={inputMessage}
                 onChange={(e) => setInputMessage(e.target.value)}
                 onKeyPress={handleKeyPress}
                 disabled={isLoading}
                 variant="outlined"
                 size="small"
                 sx={{
                   '& .MuiOutlinedInput-root': {
                     borderRadius: 2,
                     fontSize: '0.85rem',
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
                   width: 32,
                   height: 32,
                   '&:hover': {
                     bgcolor: '#D4961F',
                   },
                   '&:disabled': {
                     bgcolor: '#555',
                     color: '#999'
                   }
                 }}
               >
                 <SendIcon fontSize="small" />
               </IconButton>
             </Box>
           </Box>
        </>
      )}
    </Paper>
  );
};

export default AIAssistantDialog; 