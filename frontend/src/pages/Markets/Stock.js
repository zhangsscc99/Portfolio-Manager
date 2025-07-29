// src/pages/markets/Stocks.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  InputAdornment,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalFireDepartment as ActiveIcon,
  Star as TrendingIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

// 确保这里的路径正确，它应该指向你的api.js或类似文件
import { formatCurrency, formatPercentage, getChangeColor } from '../../services/api';

// Tab Panel 的辅助组件
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stock-tabpanel-${index}`}
      aria-labelledby={`stock-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Tab 的无障碍辅助属性
function a11yProps(index) {
  return {
    id: `stock-tab-${index}`,
    'aria-controls': `stock-tabpanel-${index}`,
  };
}

const Stocks = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // 主内容区域的加载状态

  // --- 搜索相关状态 ---
  const [searchTerm, setSearchTerm] = useState(''); // 实际用于防抖的搜索词
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState(''); // 显示在输入框的搜索词
  const [currentTabFilteredData, setCurrentTabFilteredData] = useState([]); // 当前 Tab 下经过搜索过滤后的数据
  const [isSearchingInput, setIsSearchingInput] = useState(false); // 搜索输入框的加载指示器
  const [hasSearched, setHasSearched] = useState(false); // 是否执行过搜索操作

  const debounceTimerRef = useRef(null); // 防抖计时器引用

  // --- 分页相关状态 ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsRowsPerPage] = useState(10);

  // --- 排序相关状态 ---
  const [orderBy, setOrderBy] = useState('volume'); // 默认排序字段
  const [order, setOrder] = useState('desc'); // 默认排序方向 ('asc' 或 'desc')

  // --- MOCK 股票数据 (生产环境中应替换为实际 API 调用获取的数据) ---
  const mockMostActive = [
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 250.10, change: -5.20, changePercent: -0.0204, volume: 150000000, marketCap: 790000000000 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 1000.50, change: 10.75, changePercent: 0.0108, volume: 120000000, marketCap: 2500000000000 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.30, change: 2.15, changePercent: 0.0121, volume: 80000000, marketCap: 1850000000000 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', price: 175.80, change: 1.50, changePercent: 0.0086, volume: 70000000, marketCap: 2100000000000 },
    { symbol: 'META', name: 'Meta Platforms Inc.', price: 450.00, change: 8.00, changePercent: 0.0180, volume: 60000000, marketCap: 1200000000000 },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 170.00, change: 0.50, changePercent: 0.0030, volume: 90000000, marketCap: 2600000000000 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.00, change: 3.00, changePercent: 0.0072, volume: 75000000, marketCap: 3100000000000 },
    { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', price: 178.00, change: 1.60, changePercent: 0.0091, volume: 65000000, marketCap: 2150000000000 },
    { symbol: 'NFLX', name: 'Netflix Inc.', price: 600.00, change: 5.00, changePercent: 0.0084, volume: 30000000, marketCap: 260000000000 },
    { symbol: 'ADBE', name: 'Adobe Inc.', price: 550.00, change: 4.50, changePercent: 0.0082, volume: 20000000, marketCap: 250000000000 },
    { symbol: 'CRM', name: 'Salesforce Inc.', price: 280.00, change: 2.80, changePercent: 0.0101, volume: 25000000, marketCap: 270000000000 },
    { symbol: 'INTC', name: 'Intel Corp.', price: 35.00, change: 0.50, changePercent: 0.0145, volume: 80000000, marketCap: 150000000000 },
  ];

  const mockTrendingNow = [
    { symbol: 'SMCI', name: 'Super Micro Computer, Inc.', price: 900.20, change: 45.10, changePercent: 0.0527, volume: 30000000, marketCap: 50000000000 },
    { symbol: 'PLTR', name: 'Palantir Technologies Inc.', price: 23.40, change: 1.20, changePercent: 0.0540, volume: 60000000, marketCap: 50000000000 },
    { symbol: 'SOFI', name: 'SoFi Technologies, Inc.', price: 7.80, change: 0.40, changePercent: 0.0541, volume: 40000000, marketCap: 7000000000 },
    { symbol: 'RIVN', name: 'Rivian Automotive Inc.', price: 12.50, change: 0.70, changePercent: 0.0590, volume: 25000000, marketCap: 12000000000 },
    { symbol: 'PINS', name: 'Pinterest Inc.', price: 40.00, change: 2.00, changePercent: 0.0526, volume: 15000000, marketCap: 28000000000 },
    { symbol: 'COIN', name: 'Coinbase Global Inc.', price: 250.00, change: 12.00, changePercent: 0.0505, volume: 10000000, marketCap: 55000000000 },
    { symbol: 'AI', name: 'C3.ai Inc.', price: 30.00, change: 1.50, changePercent: 0.0526, volume: 20000000, marketCap: 3500000000 },
    { symbol: 'JOBY', name: 'Joby Aviation Inc.', price: 7.00, change: 0.35, changePercent: 0.0526, volume: 18000000, marketCap: 4000000000 },
  ];

  const mockTopGainers = [
    { symbol: 'XYZ', name: 'XYZ Corp.', price: 35.60, change: 3.20, changePercent: 0.0987, volume: 5000000, marketCap: 1200000000 },
    { symbol: 'ABC', name: 'ABC Innovations', price: 120.90, change: 9.50, changePercent: 0.0850, volume: 3500000, marketCap: 5000000000 },
    { symbol: 'LMN', name: 'LMN Solutions', price: 8.75, change: 0.65, changePercent: 0.0803, volume: 10000000, marketCap: 500000000 },
    { symbol: 'PQR', name: 'PQR Holdings', price: 75.00, change: 5.50, changePercent: 0.0780, volume: 1200000, marketCap: 3000000000 },
    { symbol: 'UVW', name: 'UVW Group', price: 25.00, change: 1.80, changePercent: 0.0770, volume: 2000000, marketCap: 800000000 },
    { symbol: 'DEF', name: 'DEF Tech', price: 50.00, change: 3.50, changePercent: 0.0750, volume: 1800000, marketCap: 1000000000 },
    { symbol: 'GHI', name: 'GHI Systems', price: 15.00, change: 1.00, changePercent: 0.0714, volume: 1500000, marketCap: 700000000 },
  ];

  const mockTopLosers = [
    { symbol: 'QWE', name: 'QWE Systems', price: 55.20, change: -4.80, changePercent: -0.0800, volume: 2500000, marketCap: 2000000000 },
    { symbol: 'RTY', name: 'RTY Global', price: 15.10, change: -1.20, changePercent: -0.0735, volume: 7000000, marketCap: 800000000 },
    { symbol: 'UIO', name: 'UIO Enterprises', price: 200.00, change: -15.00, changePercent: -0.0698, volume: 1500000, marketCap: 10000000000 },
    { symbol: 'JKL', name: 'JKL Industries', price: 30.00, change: -2.00, changePercent: -0.0625, volume: 4000000, marketCap: 1500000000 },
    { symbol: 'GHI', name: 'GHI Solutions', price: 10.00, change: -0.60, changePercent: -0.0566, volume: 3000000, marketCap: 400000000 },
    { symbol: 'OPQ', name: 'OPQ Corp', price: 80.00, change: -4.50, changePercent: -0.0530, volume: 2200000, marketCap: 4000000000 },
    { symbol: 'MNO', name: 'MNO Tech', price: 25.00, change: -1.20, changePercent: -0.0455, volume: 2800000, marketCap: 1100000000 },
  ];
  // --- END MOCK 股票数据 ---


  // 格式化大数字的工具函数 (例如 Volume, Market Cap)
  const formatLargeNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T'; // Trillions
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'; // Billions
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'; // Millions
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'; // Thousands
    return num.toString();
  };

  // 根据 Tab 索引获取对应的基础 Mock 数据
  const getBaseDataForTab = (tabIndex) => {
    switch (tabIndex) {
      case 0: return mockMostActive;
      case 1: return mockTrendingNow;
      case 2: return mockTopGainers;
      case 3: return mockTopLosers;
      default: return [];
    }
  };

  // --- 搜索逻辑 ---
  const performSearch = useCallback((query, baseData) => {
    setPage(0); // 每次执行新搜索/过滤时，重置分页到第一页
    setIsSearchingInput(true); // 显示搜索输入框的加载指示器
    setHasSearched(true); // 标记已执行过搜索操作

    // 模拟 API 调用或耗时过滤的延迟
    setTimeout(() => {
      if (!query) {
        setCurrentTabFilteredData(baseData);
      } else {
        const lowerCaseQuery = query.toLowerCase();
        const filteredResults = baseData.filter(item =>
          item?.symbol?.toLowerCase().includes(lowerCaseQuery) ||
          item?.name?.toLowerCase().includes(lowerCaseQuery)
        );
        setCurrentTabFilteredData(filteredResults);
      }
      setIsSearchingInput(false); // 隐藏搜索输入框的加载指示器
    }, 500); // 模拟 500ms 延迟
  }, []); // useCallback 的依赖为空，表示这个函数只创建一次

  // 防抖搜索效果
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const baseData = getBaseDataForTab(currentTab);

    if (displayedSearchTerm.length > 0) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchTerm, baseData);
      }, 500); // 500ms 防抖延迟
    } else {
      performSearch('', baseData); // 搜索词清空时立即更新
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, currentTab, performSearch, displayedSearchTerm]); // 添加 displayedSearchTerm 作为依赖，确保清空搜索框时能立即触发

  // Tab 切换时的初始加载效果
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const newTabData = getBaseDataForTab(currentTab);
      setCurrentTabFilteredData(newTabData);
      setIsLoading(false);
      setPage(0); // Tab 切换时重置分页
      setSearchTerm(''); // Tab 切换时重置搜索词
      setDisplayedSearchTerm('');
      setHasSearched(false);
      setIsSearchingInput(false);

      // Tab 切换时重置排序到默认
      setOrderBy('volume');
      setOrder('desc');
    }, 400); // 模拟 Tab 数据获取延迟
  }, [currentTab]);

  // --- 排序处理函数 ---
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // 排序后回到第一页
  };

  // 辅助函数：根据字段和排序方向进行稳定排序
  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1]; // 保持原始相对顺序
    });
    return stabilizedThis.map((el) => el[0]);
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };
  // --- 结束排序处理函数 ---

  // --- 分页处理函数 ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // 每页行数改变时，重置到第一页
  };
  // --- 结束分页处理函数 ---

  // 确定表格中显示的数据：在搜索或加载时保持旧数据，完成后显示新数据
  const dataToDisplayInTable = (isSearchingInput && hasSearched) || (searchTerm !== '' && isSearchingInput)
                               ? currentTabFilteredData
                               : currentTabFilteredData;

  // 应用排序
  const sortedAndFilteredData = stableSort(dataToDisplayInTable, getComparator(order, orderBy));

  const renderStockTable = (data) => (
    <Card>
      <CardContent>
        {isLoading || (isSearchingInput && hasSearched) ? (
          // 主表格加载指示器
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading stocks...
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">% Change</TableCell>
                  {/* Volume 列支持排序 */}
                  <TableCell align="right" sortDirection={orderBy === 'volume' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'volume'}
                      direction={orderBy === 'volume' ? order : 'asc'}
                      onClick={() => handleRequestSort('volume')}
                    >
                      Volume
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Market Cap</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data && data.length > 0) ? (
                  // 应用分页
                  data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((stock) => (
                      <TableRow key={stock.symbol} hover sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{stock.symbol}</TableCell>
                        <TableCell>{stock.name}</TableCell>
                        <TableCell align="right">{formatCurrency(stock.price, 'USD')}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: getChangeColor(stock.change), fontWeight: 500 }}
                        >
                          {formatCurrency(stock.change, 'USD')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: getChangeColor(stock.changePercent), fontWeight: 500 }}
                        >
                          {formatPercentage(stock.changePercent)}
                        </TableCell>
                        <TableCell align="right">{formatLargeNumber(stock.volume)}</TableCell>
                        <TableCell align="right">{formatLargeNumber(stock.marketCap)}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3 }}>
                      <Typography color="text.secondary">
                        No stock data found for this category or your search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
      {/* 只有在数据未加载且有数据时才显示分页控件 */}
      {!(isLoading || isSearchingInput) && (data && data.length > 0) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      )}
    </Card>
  );

  // 处理 Tab 改变
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // useEffect 会处理新 Tab 的数据加载和状态重置
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* 调整标题下方的 margin-bottom，让 Tab 离标题更近 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Stocks Market
        </Typography>
        <TextField
          size="small"
          placeholder={`Search ${currentTab === 0 ? 'Most Active' :
                                  currentTab === 1 ? 'Trending Now' :
                                  currentTab === 2 ? 'Top Gainers' :
                                  currentTab === 3 ? 'Top Losers' : ''}...`}
          value={displayedSearchTerm}
          onChange={(e) => {
            setDisplayedSearchTerm(e.target.value);
            setSearchTerm(e.target.value); // searchTerm 触发防抖
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: isSearchingInput && (
              <InputAdornment position="end">
                <CircularProgress size={20} color="inherit" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="stock market categories"
          variant="scrollable" // 允许在小屏幕上滚动
          scrollButtons="auto" // 自动显示/隐藏滚动按钮
        >
          {/* 为每个 Tab 添加 hover 效果，并调整其大小 */}
          <Tab
            label="Most Active"
            icon={<ActiveIcon />}
            iconPosition="start"
            {...a11yProps(0)}
            sx={{
              minHeight: '40px', // 减小最小高度
              padding: '6px 16px', // 减小内边距
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)', // 鼠标悬停时的背景色
              },
              // 可选：调整图标和文本的间距
              '& .MuiTab-wrapper': {
                flexDirection: 'row', // 图标在文本左侧
                justifyContent: 'center',
                alignItems: 'center',
                '& > *:first-of-type': { // 针对图标
                  marginBottom: '0 !important', // 移除默认的底部间距
                  marginRight: '6px', // 添加右侧间距
                }
              }
            }}
          />
          <Tab
            label="Trending Now"
            icon={<TrendingIcon />}
            iconPosition="start"
            {...a11yProps(1)}
            sx={{
              minHeight: '40px',
              padding: '6px 16px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '& .MuiTab-wrapper': {
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                '& > *:first-of-type': {
                  marginBottom: '0 !important',
                  marginRight: '6px',
                }
              }
            }}
          />
          <Tab
            label="Top Gainers"
            icon={<TrendingUpIcon />}
            iconPosition="start"
            {...a11yProps(2)}
            sx={{
              minHeight: '40px',
              padding: '6px 16px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '& .MuiTab-wrapper': {
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                '& > *:first-of-type': {
                  marginBottom: '0 !important',
                  marginRight: '6px',
                }
              }
            }}
          />
          <Tab
            label="Top Losers"
            icon={<TrendingDownIcon />}
            iconPosition="start"
            {...a11yProps(3)}
            sx={{
              minHeight: '40px',
              padding: '6px 16px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '& .MuiTab-wrapper': {
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                '& > *:first-of-type': {
                  marginBottom: '0 !important',
                  marginRight: '6px',
                }
              }
            }}
          />
        </Tabs>
      </Box>

      {/* 渲染当前 Tab 的内容，并应用搜索和分页 */}
      {renderStockTable(sortedAndFilteredData)}
    </Box>
  );
};

export default Stocks;