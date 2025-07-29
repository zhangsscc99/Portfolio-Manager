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
import { useQuery } from 'react-query'; // 引入 useQuery

// 确保这里的路径正确，它应该指向你的api.js或类似文件
import { formatCurrency, formatPercentage, getChangeColor, marketAPI } from '../../services/api';
import toast from 'react-hot-toast'; // 引入 toast 用于错误提示

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

const Stock = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState(''); // 实际用于防抖的搜索词
  const [displayedSearchTerm, setDisplayedSearchTerm] = useState(''); // 显示在输入框的搜索词
  const [currentTabFilteredData, setCurrentTabFilteredData] = useState([]); // 当前 Tab 下经过搜索过滤后的数据
  const [isSearchingInput, setIsSearchingInput] = useState(false); // 搜索输入框的加载指示器
  const [hasSearched, setHasSearched] = useState(false); // 是否执行过搜索操作

  const debounceTimerRef = useRef(null); // 防抖计时器引用

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('volume'); // 默认排序字段
  const [order, setOrder] = useState('desc'); // 默认排序方向 ('asc' 或 'desc')

  // --- 使用 react-query 获取数据 ---
  const fetchFunctions = useRef([
    marketAPI.getMostActive,  
    marketAPI.getTrending,    
    marketAPI.getGainers, 
    marketAPI.getLosers,  
  ]);

  // 根据当前 Tab 动态选择查询键和查询函数
  const {
    data: rawData,
    isLoading, // 整体数据加载状态
    isFetching, // 后台重新获取数据状态
    isError,
    error,
    refetch // 重新获取数据函数
  } = useQuery(
    ['stocks', currentTab], // 查询键，当 currentTab 变化时会重新获取数据
    () => fetchFunctions.current[currentTab](), // 调用对应的 API 函数
    {
      staleTime: 5 * 60 * 1000, // 5 分钟内数据被视为“新鲜”，不会重新获取
      refetchOnWindowFocus: false, // 窗口聚焦时不重新获取
      onError: (err) => {
        toast.error(`Failed to load data: ${err.message}`);
        console.error("API Fetch Error:", err);
      },
      // 首次加载成功后，将数据设置到过滤状态中
      onSuccess: (data) => {
        // 当数据成功获取后，将其作为当前 Tab 的基础数据
        // 这将触发 useEffect 中的搜索/过滤逻辑
        // 我们不直接在这里设置 currentTabFilteredData，而是让 useEffect 监听 rawData 变化来处理
      }
    }
  );

  // 格式化大数字的工具函数 (例如 Volume, Market Cap)
  const formatLargeNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    // 确保 num 是一个数字类型，否则尝试转换
    const number = Number(num);
    if (isNaN(number)) return 'N/A';

    if (number >= 1000000000000) return (number / 1000000000000).toFixed(2) + 'T'; // Trillions
    if (number >= 1000000000) return (number / 1000000000).toFixed(2) + 'B'; // Billions
    if (number >= 1000000) return (number / 1000000).toFixed(2) + 'M'; // Millions
    if (number >= 1000) return (number / 1000).toFixed(2) + 'K'; // Thousands
    return number.toString();
  };

  // --- 搜索逻辑 ---
  const performSearch = useCallback((query, baseData) => {
    setPage(0); // 每次执行新搜索/过滤时，重置分页到第一页
    setIsSearchingInput(true); // 显示搜索输入框的加载指示器
    setHasSearched(true); // 标记已执行过搜索操作

    const array = Array.isArray(baseData) ? baseData : baseData.data || [];

    // 实际的过滤逻辑
    if (!query) {
      setCurrentTabFilteredData(array);
      setIsSearchingInput(false);
    } else {
      const lowerCaseQuery = query.toLowerCase();
      const filteredResults = array.filter(item =>
        item?.symbol?.toLowerCase().includes(lowerCaseQuery) ||
        item?.name?.toLowerCase().includes(lowerCaseQuery)
      );
      // 模拟一点延迟，让加载指示器更明显
      setTimeout(() => {
        setCurrentTabFilteredData(filteredResults);
        setIsSearchingInput(false);
      }, 300); // 模拟 300ms 延迟
    }
  }, []);

  // 当 rawData 或 currentTab 变化时，重新应用搜索和过滤
  useEffect(() => {
    if (rawData) {
      // 在这里初始化 currentTabFilteredData 为原始数据
      // 因为 searchTerm 的 useEffect 会立即触发一次 performSearch
      // 所以这里设置 rawData 是作为 performSearch 的 baseData
      setCurrentTabFilteredData(rawData); 
      // 重置搜索和分页状态，确保每次 Tab 切换时都是干净的
      setPage(0);
      setSearchTerm('');
      setDisplayedSearchTerm('');
      setHasSearched(false);
      setIsSearchingInput(false); // 确保在新的Tab数据加载时，搜索指示器是隐藏的
      setOrderBy('volume'); // Tab 切换时重置排序到默认
      setOrder('desc');
    }
  }, [rawData, currentTab]); // rawData 变化意味着新的数据已经从 API 获取

  // 防抖搜索效果
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 只有当 rawData 可用时才进行搜索
    if (rawData) {
      if (displayedSearchTerm.length > 0) {
        debounceTimerRef.current = setTimeout(() => {
          performSearch(searchTerm, rawData); // 对 rawData 进行搜索
        }, 500); // 500ms 防抖延迟
      } else {
        // 搜索词清空时，显示原始数据（不带过滤）
        performSearch('', rawData); 
      }
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, performSearch, rawData, displayedSearchTerm]); // 依赖 rawData 和 displayedSearchTerm

  // --- 排序处理函数 ---
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // 排序后回到第一页
  };

  // 辅助函数：根据字段和排序方向进行稳定排序
  const stableSort = (obj, comparator) => {
    const array = Array.isArray(obj) ? obj : obj.data || [];
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
    // 处理可能存在的 null/undefined 值，将其视为 0 进行比较
    const valA = a[orderBy] === null || a[orderBy] === undefined ? 0 : a[orderBy];
    const valB = b[orderBy] === null || b[orderBy] === undefined ? 0 : b[orderBy];

    if (valB < valA) {
      return -1;
    }
    if (valB > valA) {
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

  // 应用排序
  const sortedAndFilteredData = stableSort(currentTabFilteredData, getComparator(order, orderBy));

  const renderStockTable = (data) => (
    <Card>
      <CardContent>
        {isLoading || isFetching ? ( // 使用 react-query 的 isLoading 和 isFetching
          // 主表格加载指示器
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              Loading stocks...
            </Typography>
          </Box>
        ) : isError ? (
          // 错误提示
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, flexDirection: 'column' }}>
            <Typography variant="h6" color="error.main">
              Error loading stock data.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {error?.message || "Please try again later."}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ensure your backend server is running and accessible.
            </Typography>
          </Box>
        ) : (data && data.length > 0) ? (
          // 显示数据表格
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
                {/* 应用分页 */}
                {data
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
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          // 没有数据时的提示
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">
              No stock data found for this category or your search.
            </Typography>
          </Box>
        )}
      </CardContent>
      {/* 只有在数据未加载、非搜索中且有数据时才显示分页控件 */}
      {!(isLoading || isFetching) && (data && data.length > 0) && (
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
    // useQuery 会在 currentTab 变化时自动重新获取数据
    // useEffect 会在 rawData 变化时自动重置状态并应用搜索
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* 调整标题下方的 margin-bottom，让 Tab 离标题更近 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Stocks
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
          <Tab
            label="Most Active"
            icon={<ActiveIcon />}
            iconPosition="start"
            {...a11yProps(0)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
          <Tab
            label="Trending Now"
            icon={<TrendingIcon />}
            iconPosition="start"
            {...a11yProps(1)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
          <Tab
            label="Top Gainers"
            icon={<TrendingUpIcon />}
            iconPosition="start"
            {...a11yProps(2)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
          <Tab
            label="Top Losers"
            icon={<TrendingDownIcon />}
            iconPosition="start"
            {...a11yProps(3)}
            sx={{
              minHeight: '48px',
              padding: '6px 16px',
              '& .MuiTab-iconWrapper': {
                marginRight: '8px',
              },
            }}
          />
        </Tabs>
      </Box>

      {/* 渲染当前 Tab 的内容，并应用搜索和分页 */}
      {renderStockTable(sortedAndFilteredData)}
    </Box>
  );
};

export default Stock;