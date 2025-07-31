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
  const [detailLoading, setDetailLoading] = useState(false);
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
  const handleChange = async (event, newValue) => {
    onChange(newValue);
    if (newValue && onSelectStock) {
      // 🐛 调试：打印完整的数据对象
      console.log('🔍 完整搜索结果数据:', newValue);
      console.log('🔍 所有可用字段:', Object.keys(newValue));
      console.log('🔍 资产类型:', assetType);
      
      setDetailLoading(true);
      try {
        let detailedData = newValue;
        
        // 🎯 根据资产类型采用不同的数据获取策略
        if (assetType === 'crypto') {
          console.log('💎 处理加密货币数据:', newValue.symbol);
          // 优先尝试使用专门的crypto quote API
          try {
            const cryptoQuoteResponse = await marketAPI.getCryptoQuote(newValue.symbol);
            console.log('💎 crypto quote API响应:', cryptoQuoteResponse);
            
            if (cryptoQuoteResponse.success && cryptoQuoteResponse.data) {
              const cryptoQuote = cryptoQuoteResponse.data;
              detailedData = {
                ...newValue,
                price: cryptoQuote.price || newValue.price,
                change: cryptoQuote.change || newValue.change,
                changePercent: cryptoQuote.changePercent || newValue.changePercent,
                volume: cryptoQuote.volume || newValue.volume,
                marketCap: cryptoQuote.marketCap || newValue.marketCap,
                name: cryptoQuote.name || newValue.name || newValue.longname,
              };
              console.log('✅ 使用crypto quote API数据:', detailedData);
            } else {
              console.log('⚠️ crypto quote API无数据，尝试backup方法');
              // 如果专门的crypto API失败，回退到原来的方法
              if (!newValue.marketCap && !newValue.market_cap) {
                try {
                  const cryptoResponse = await marketAPI.getCryptos(1, 100);
                  if (cryptoResponse.success && cryptoResponse.data) {
                    const cryptoMatch = cryptoResponse.data.find(crypto => 
                      crypto.symbol?.toLowerCase() === newValue.symbol?.toLowerCase() ||
                      crypto.symbol?.toLowerCase().includes(newValue.symbol?.toLowerCase().replace('-USD', ''))
                    );
                    if (cryptoMatch) {
                      console.log('✅ 从crypto列表API找到匹配数据:', cryptoMatch);
                      detailedData = {
                        ...newValue,
                        price: cryptoMatch.price || newValue.price,
                        change: cryptoMatch.change || newValue.change,
                        changePercent: cryptoMatch.changePercent || newValue.changePercent,
                        volume: cryptoMatch.volume || newValue.volume,
                        marketCap: cryptoMatch.marketCap || cryptoMatch.market_cap,
                      };
                    }
                  }
                } catch (backupError) {
                  console.warn('⚠️ 无法从crypto列表API获取详细数据:', backupError);
                }
              }
            }
          } catch (cryptoError) {
            console.warn('⚠️ crypto quote API调用失败:', cryptoError);
            // 如果crypto quote API失败，使用原来的backup方法
            if (!newValue.marketCap && !newValue.market_cap) {
              try {
                const cryptoResponse = await marketAPI.getCryptos(1, 100);
                if (cryptoResponse.success && cryptoResponse.data) {
                  const cryptoMatch = cryptoResponse.data.find(crypto => 
                    crypto.symbol?.toLowerCase() === newValue.symbol?.toLowerCase() ||
                    crypto.symbol?.toLowerCase().includes(newValue.symbol?.toLowerCase().replace('-USD', ''))
                  );
                  if (cryptoMatch) {
                    console.log('✅ backup: 找到匹配的加密货币数据:', cryptoMatch);
                    detailedData = {
                      ...newValue,
                      price: cryptoMatch.price || newValue.price,
                      change: cryptoMatch.change || newValue.change,
                      changePercent: cryptoMatch.changePercent || newValue.changePercent,
                      volume: cryptoMatch.volume || newValue.volume,
                      marketCap: cryptoMatch.marketCap || cryptoMatch.market_cap,
                    };
                  }
                }
              } catch (error) {
                console.warn('⚠️ backup crypto API也失败:', error);
              }
            }
          }
        } else if (assetType === 'stock' || assetType === 'etf') {
          console.log('📈 处理股票/ETF数据:', newValue.symbol);
          // 对于股票和ETF，尝试使用quote API获取详细数据
          try {
            const quoteResponse = await marketAPI.getQuote(newValue.symbol);
            console.log('📊 详细股票/ETF数据:', quoteResponse);
            
            if (quoteResponse.success && quoteResponse.data) {
              const quote = quoteResponse.data;
              detailedData = {
                ...newValue,
                price: quote.price || newValue.price,
                change: quote.change || newValue.change,
                changePercent: quote.changePercent || newValue.changePercent,
                volume: quote.volume || newValue.volume,
                marketCap: quote.marketCap || quote.market_cap || quote.marketCapitalization || quote.mktCap,
                exchange: quote.exchange || newValue.exchange,
              };
              console.log('✅ 合并后的股票/ETF数据:', detailedData);
            }
          } catch (error) {
            console.warn(`⚠️ 无法从quote API获取${assetType}详细数据:`, error);
          }
        }
        
        // 🔧 最后的数据清理和回退
        const finalMarketCap = detailedData.marketCap || 
                              detailedData.market_cap || 
                              detailedData.marketCapitalization || 
                              detailedData.mktCap ||
                              detailedData.MarketCap ||
                              detailedData.marketcap ||
                              detailedData.cap ||
                              detailedData.mcap ||
                              detailedData.market_capitalization ||
                              detailedData.sharesOutstanding ||
                              detailedData.marketValue;
        
        onSelectStock({
          symbol: detailedData.symbol,
          name: detailedData.name || detailedData.longname,
          price: detailedData.price,
          change: detailedData.change,
          changePercent: detailedData.changePercent,
          volume: detailedData.volume,
          marketCap: finalMarketCap,
          exchange: detailedData.exchange,
          type: assetType
        });
        
      } catch (error) {
        console.error('❌ 获取详细资产数据失败:', error);
        // 如果所有尝试都失败，使用原始搜索结果
        const marketCap = newValue.marketCap || 
                         newValue.market_cap || 
                         newValue.marketCapitalization || 
                         newValue.mktCap ||
                         newValue.MarketCap ||
                         newValue.marketcap ||
                         newValue.cap ||
                         newValue.mcap ||
                         newValue.market_capitalization ||
                         newValue.sharesOutstanding ||
                         newValue.marketValue;
        
        onSelectStock({
          symbol: newValue.symbol,
          name: newValue.name || newValue.longname,
          price: newValue.price,
          change: newValue.change,
          changePercent: newValue.changePercent,
          volume: newValue.volume,
          marketCap: marketCap,
          exchange: newValue.exchange,
          type: assetType
        });
      } finally {
        setDetailLoading(false);
      }
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
                {loading || detailLoading ? <CircularProgress color="inherit" size={20} /> : null}
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