import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Paper
} from '@mui/material';
import { debounce } from 'lodash';
import { marketAPI } from '../services/api';

const StockSearchField = ({ 
  value, 
  onChange, 
  onSelectStock,
  assetType = 'stock',
  label = "Search stocks...",
  placeholder = "Type symbol or company name",
  disabled = false 
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // 🔍 股票搜索功能 - 使用防抖优化
  const searchStocks = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 1) {
        setOptions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 搜索股票:', query, '资产类型:', assetType);
        
        const response = await marketAPI.searchStocks(query);
        console.log('🎯 搜索响应:', response);
        
        if (response.success) {
          const results = response.data || [];
          console.log('📊 原始结果:', results);
          
          // 🎯 根据资产类型过滤结果
          const filteredResults = results.filter(stock => {
            console.log('🎯 检查股票:', stock.symbol, '类型:', stock.type, 'typeDisp:', stock.typeDisp);
            
            if (assetType === 'crypto') {
              return stock.type?.toLowerCase().includes('crypto') || 
                     stock.typeDisp?.toLowerCase().includes('crypto') ||
                     stock.symbol?.includes('-USD') ||
                     ['BTC', 'ETH', 'ADA', 'DOT', 'LINK'].some(crypto => 
                       stock.symbol?.includes(crypto)
                     );
            } else if (assetType === 'etf') {
              return stock.type?.toLowerCase().includes('etf') ||
                     stock.typeDisp?.toLowerCase().includes('etf') ||
                     stock.quoteType?.toLowerCase() === 'etf';
            } else {
              // 默认股票过滤 - 对于stocks类型，显示所有结果
              return true; // 暂时显示所有结果，便于调试
            }
          });

          console.log('✅ 过滤后结果:', filteredResults);
          setOptions(filteredResults.slice(0, 10)); // 最多显示10个结果
        } else {
          console.log('❌ 响应不成功:', response);
          setOptions([]);
        }
      } catch (error) {
        console.error('❌ 搜索股票失败:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300), // 300ms 防抖延迟
    [assetType]
  );

  // 🎯 当输入值变化时触发搜索
  useEffect(() => {
    if (inputValue) {
      searchStocks(inputValue);
    } else {
      setOptions([]);
    }
  }, [inputValue, searchStocks]);

  // 🎨 自定义选项渲染
  const renderOption = (props, option) => (
    <Box component="li" {...props} key={option.symbol}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {option.symbol}
            </Typography>
            {option.typeDisp && (
              <Chip 
                label={option.typeDisp} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: '20px' }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {option.name || option.longname}
          </Typography>
          {option.exchange && (
            <Typography variant="caption" color="text.secondary">
              {option.exchange}
            </Typography>
          )}
        </Box>
        {option.price && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ${parseFloat(option.price).toFixed(2)}
            </Typography>
            {option.changePercent && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: option.changePercent >= 0 ? 'success.main' : 'error.main',
                  fontWeight: 500
                }}
              >
                {option.changePercent >= 0 ? '+' : ''}{option.changePercent.toFixed(2)}%
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );

  // 🎯 处理选择
  const handleChange = (event, newValue) => {
    onChange(newValue);
    if (newValue && onSelectStock) {
      onSelectStock({
        symbol: newValue.symbol,
        name: newValue.name || newValue.longname,
        price: newValue.price,
        type: assetType
      });
    }
  };

  // 🎯 获取选项的标签
  const getOptionLabel = (option) => {
    if (typeof option === 'string') return option;
    return `${option.symbol} - ${option.name || option.longname}`;
  };

  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      getOptionLabel={getOptionLabel}
      renderOption={renderOption}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      PaperComponent={({ children, ...other }) => (
        <Paper {...other} sx={{ mt: 1 }}>
          {children}
        </Paper>
      )}
      filterOptions={(x) => x} // 不使用默认过滤，因为我们已经在后端搜索了
      isOptionEqualToValue={(option, value) => option.symbol === value?.symbol}
      noOptionsText={
        inputValue.length < 1 
          ? "Type to search..." 
          : loading 
            ? "Searching..." 
            : "No results found"
      }
      loadingText="Searching..."
    />
  );
};

export default StockSearchField; 