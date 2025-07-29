import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Slide
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Psychology as AIIcon,
  Person as UserIcon,
  AutoAwesome as SparkleIcon,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { buildApiUrl } from '../config/api';

const AIAssistantDialog = ({ open, onClose, portfolioId, portfolioData, analysisData }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize new session when dialog opens
  useEffect(() => {
    if (open) {
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      setMessages([
        {
          id: 1,
          type: 'ai',
          content: `👋 Hello! I'm your AI Investment Assistant. I have access to your portfolio analysis and can help you with investment questions.

Your portfolio summary:
• Total Value: ${formatCurrency(portfolioData?.totalValue || 0)}
• Asset Types: ${Object.keys(portfolioData?.assetDistribution || {}).length}
• Risk Level: ${analysisData?.summary?.riskLevel || 'Unknown'}

Feel free to ask me anything about your investments, market outlook, or specific recommendations!`,
          timestamp: new Date()
        }
      ]);
      setInputMessage('');
      setError(null);
      
      // Focus input after dialog animation
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
    }
  }, [open, portfolioData, analysisData]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    onClose();
  };

  const getSuggestedQuestions = () => [
    "What are my biggest portfolio risks?",
    "Should I sell my Tesla stock?",
    "How can I improve diversification?",
    "What's your outlook on my crypto holdings?",
    "When should I rebalance my portfolio?"
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 2,
        background: 'linear-gradient(135deg, rgba(244, 190, 126, 0.1) 0%, rgba(232, 168, 85, 0.1) 100%)',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            bgcolor: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 100%)',
            width: 40,
            height: 40
          }}>
            <AIIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Investment Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Portfolio ID: {portfolioId} • Session: {sessionId.split('-')[0]}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        p: 0
      }}>
        {/* Messages Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {messages.length === 1 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                💡 Try asking:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getSuggestedQuestions().map((question, index) => (
                  <Chip
                    key={index}
                    label={question}
                    variant="outlined"
                    size="small"
                    onClick={() => setInputMessage(question)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(232, 168, 85, 0.1)',
                        borderColor: '#E8A855'
                      }
                    }}
                  />
                ))}
              </Box>
              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          <List sx={{ width: '100%', p: 0 }}>
            {messages.map((message, index) => (
              <Fade key={message.id} in timeout={300} style={{ transitionDelay: `${index * 100}ms` }}>
                <ListItem sx={{ 
                  flexDirection: 'column', 
                  alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
                  px: 0,
                  py: 1
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: 1,
                    maxWidth: '85%',
                    flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                  }}>
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: message.type === 'user' ? '#E8A855' : '#F4BE7E'
                    }}>
                      {message.type === 'user' ? 
                        <UserIcon sx={{ fontSize: 18 }} /> : 
                        <AIIcon sx={{ fontSize: 18 }} />
                      }
                    </Avatar>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: message.type === 'user' ? '#E8A855' : '#f5f5f5',
                      color: message.type === 'user' ? 'white' : 'text.primary',
                      borderRadius: 2,
                      position: 'relative'
                    }}>
                      <Typography variant="body1" sx={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        '& strong': { fontWeight: 600 }
                      }}>
                        {message.content}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                        fontSize: '0.75rem'
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
            <Slide direction="up" in timeout={300}>
              <ListItem sx={{ 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                px: 0,
                py: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#F4BE7E' }}>
                    <AIIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        AI is thinking...
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </ListItem>
            </Slide>
          )}

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <div ref={messagesEndRef} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        background: '#fafafa'
      }}>
        <Box sx={{ 
          display: 'flex', 
          width: '100%', 
          gap: 1,
          alignItems: 'flex-end'
        }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={3}
            placeholder="Ask me about your portfolio, investments, or market outlook..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            sx={{
              bgcolor: '#4caf50',
              color: 'white',
              '&:hover': {
                bgcolor: '#45a049',
              },
              '&:disabled': {
                bgcolor: 'grey.300',
                color: 'grey.500'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default AIAssistantDialog; 