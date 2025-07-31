import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Tabs,
  Tab,
  IconButton,
  Typography,
  Button,
  Chip,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as StocksIcon,
  CurrencyBitcoin as CryptoIcon,
  ViewList as ETFIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import StockSearchField from './StockSearchField';

const AssetSearchDialog = ({ open, onClose, onAddAsset, onViewAsset }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchResults, setSearchResults] = useState({
    stock: null,
    crypto: null,
    etf: null
  });

  const assetTypes = [
    {
      id: 'stock',
      label: 'Stocks',
      icon: StocksIcon,
      color: '#4CAF50',
      description: 'Search for individual stocks and securities'
    },
    {
      id: 'crypto',
      label: 'Crypto',
      icon: CryptoIcon,
      color: '#FF9800',
      description: 'Cryptocurrencies and digital assets'
    },
    {
      id: 'etf',
      label: 'ETFs',
      icon: ETFIcon,
      color: '#9C27B0',
      description: 'Exchange-traded funds'
    }
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedAsset(null);
  };

  const handleSelectAsset = (asset) => {
    const assetType = assetTypes[activeTab].id;
    setSelectedAsset({ ...asset, type: assetType });
    setSearchResults(prev => ({
      ...prev,
      [assetType]: asset
    }));
  };

  const handleAddToPortfolio = () => {
    if (selectedAsset && onAddAsset) {
      onAddAsset(selectedAsset);
      handleClose();
    }
  };

  const handleViewDetails = () => {
    if (selectedAsset && onViewAsset) {
      onViewAsset(selectedAsset);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedAsset(null);
    setSearchResults({
      stock: null,
      crypto: null,
      etf: null
    });
    onClose();
  };

  const currentAssetType = assetTypes[activeTab];

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(28, 28, 35, 0.95) 0%, rgba(20, 20, 25, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #F4BE7E 0%, #E8A855 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <currentAssetType.icon sx={{ color: '#1a1a1a', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Asset Search
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Find and add assets to your portfolio
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Asset Type Tabs */}
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ 
            mb: 3,
            '& .MuiTab-root': {
              minHeight: 60,
              flexDirection: 'column',
              gap: 0.5,
              '&.Mui-selected': {
                color: '#E8A855'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#E8A855',
              height: 3,
              borderRadius: '3px 3px 0 0'
            }
          }}
        >
          {assetTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <Tab
                key={type.id}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Icon sx={{ fontSize: 20 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {type.label}
                    </Typography>
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        {/* Search Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Search {currentAssetType.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {currentAssetType.description}
          </Typography>
          
          <StockSearchField
            assetType={currentAssetType.id}
            label={`Search ${currentAssetType.label.toLowerCase()}...`}
            placeholder={`Type symbol or name to search ${currentAssetType.label.toLowerCase()}`}
            onSelectStock={handleSelectAsset}
            value={searchResults[currentAssetType.id]}
            onChange={(newValue) => setSelectedAsset(newValue)}
          />
        </Box>

        {/* Selected Asset Display */}
        {selectedAsset && (
          <Card sx={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            mb: 2
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedAsset.symbol}
                    </Typography>
                    <Chip 
                      label={currentAssetType.label}
                      size="small"
                      sx={{ 
                        backgroundColor: currentAssetType.color,
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    {selectedAsset.name}
                  </Typography>
                  {selectedAsset.exchange && (
                    <Typography variant="caption" color="text.secondary">
                      {selectedAsset.exchange}
                    </Typography>
                  )}
                </Box>
                {selectedAsset.price && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      ${parseFloat(selectedAsset.price).toFixed(2)}
                    </Typography>
                    {selectedAsset.changePercent && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: selectedAsset.changePercent >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 500
                        }}
                      >
                        {selectedAsset.changePercent >= 0 ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddToPortfolio}
                  sx={{
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45A049 0%, #3D8B40 100%)',
                    }
                  }}
                >
                  Add to Portfolio
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ViewIcon />}
                  onClick={handleViewDetails}
                  sx={{
                    borderColor: '#E8A855',
                    color: '#E8A855',
                    '&:hover': {
                      borderColor: '#D4961F',
                      backgroundColor: 'rgba(232, 168, 85, 0.1)'
                    }
                  }}
                >
                  View Details
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssetSearchDialog; 