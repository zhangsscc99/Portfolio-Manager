import React, { useState, useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Fade,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
} from '@mui/icons-material';

const VideoPlayer = ({ 
  src, 
  poster, 
  title = "Product Demo",
  description = "See our platform in action"
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <Box sx={{ 
      position: 'relative',
      maxWidth: 900,
      mx: 'auto',
      borderRadius: 4,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      border: '2px solid rgba(232, 168, 85, 0.3)',
      '&:hover': {
        borderColor: 'rgba(232, 168, 85, 0.6)',
        transform: 'translateY(-5px)',
        boxShadow: '0 30px 80px rgba(232, 168, 85, 0.2)',
      },
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={() => setShowControls(true)}
    onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      <video
        ref={videoRef}
        width="100%"
        height="auto"
        poster={poster}
        preload="metadata"
        style={{
          display: 'block',
          backgroundColor: '#1a1a1a',
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* 主播放按钮覆盖层 */}
      {!isPlaying && (
        <Fade in timeout={300}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(244, 190, 126, 0.95) 0%, rgba(232, 168, 85, 0.95) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              transform: 'translate(-50%, -50%) scale(1.1)',
              boxShadow: '0 10px 30px rgba(244, 190, 126, 0.4)',
            },
            transition: 'all 0.3s ease',
          }}
          onClick={togglePlay}
          >
            <PlayArrow sx={{ 
              fontSize: 50, 
              color: '#1a1a1a',
              marginLeft: '4px',
            }} />
          </Box>
        </Fade>
      )}

      {/* 控制栏 */}
      <Fade in={showControls} timeout={300}>
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}>
          <IconButton
            onClick={togglePlay}
            sx={{ 
              color: 'white',
              '&:hover': { color: '#E8A855' },
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          <IconButton
            onClick={toggleMute}
            sx={{ 
              color: 'white',
              '&:hover': { color: '#E8A855' },
            }}
          >
            {isMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>

          <Box sx={{ flex: 1 }} />

          <IconButton
            onClick={toggleFullscreen}
            sx={{ 
              color: 'white',
              '&:hover': { color: '#E8A855' },
            }}
          >
            <Fullscreen />
          </IconButton>
        </Box>
      </Fade>

      {/* 视频标题覆盖层 */}
      {!isPlaying && (
        <Fade in timeout={500}>
          <Box sx={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            textAlign: 'left',
          }}>
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                fontWeight: 600,
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)',
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                textShadow: '0 1px 5px rgba(0, 0, 0, 0.7)',
              }}
            >
              {description}
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default VideoPlayer; 