# 🏢 Yahoo Finance API 接口说明

## 🎯 已配置的功能

### ✅ **核心服务**
- **实时股票价格获取** - 通过Yahoo Finance API
- **智能缓存机制** - 1分钟缓存，减少API调用
- **定时价格更新** - 每5分钟自动更新投资组合价格
- **批量数据获取** - 支持多个股票同时查询
- **股票搜索功能** - 根据代码或公司名称搜索
- **股票新闻获取** - 获取相关股票新闻

## 📊 API 接口列表

### 1. **获取单个股票报价**
```http
GET /api/market/quote/:symbol
```
**示例**: 
- `GET /api/market/quote/AAPL`
- `GET /api/market/quote/MSFT`

**返回数据**:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 175.25,
    "change": 2.15,
    "changePercent": 1.24,
    "dayHigh": 176.80,
    "dayLow": 173.50,
    "open": 174.00,
    "previousClose": 173.10,
    "volume": 52847392,
    "marketCap": 2745678123456,
    "lastUpdated": "2025-01-28T10:30:00.000Z"
  }
}
```

### 2. **批量获取股票报价**
```http
GET /api/market/quotes?symbols=AAPL,MSFT,GOOGL
```
**参数**: 
- `symbols` - 用逗号分隔的股票代码列表

**示例**: 
- `GET /api/market/quotes?symbols=AAPL,MSFT,GOOGL,TSLA`

### 3. **搜索股票**
```http
GET /api/market/search/:query
```
**示例**: 
- `GET /api/market/search/apple`
- `GET /api/market/search/AAPL`

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ",
      "type": "EQUITY"
    }
  ]
}
```

### 4. **获取股票新闻**
```http
GET /api/market/news/:symbol?count=5
```
**示例**: 
- `GET /api/market/news/AAPL`
- `GET /api/market/news/TSLA?count=10`

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "title": "Apple Reports Strong Q4 Earnings",
      "summary": "Apple Inc. reported better-than-expected...",
      "url": "https://finance.yahoo.com/...",
      "publishTime": "2025-01-28T08:00:00.000Z",
      "source": "Yahoo Finance"
    }
  ]
}
```

### 5. **获取热门股票**
```http
GET /api/market/trending
```
**功能**: 获取当前热门股票，按涨跌幅排序

### 6. **获取涨幅榜**
```http
GET /api/market/gainers?limit=5
```
**参数**: 
- `limit` - 返回数量限制 (默认5)

### 7. **获取跌幅榜**
```http
GET /api/market/losers?limit=5
```

### 8. **获取主要指数**
```http
GET /api/market/indices
```
**包含指数**: S&P 500, 道琼斯, 纳斯达克, 罗素2000

### 9. **手动更新投资组合价格**
```http
POST /api/market/update-holdings
```
**功能**: 立即更新数据库中所有持仓的最新价格

**返回数据**:
```json
{
  "success": true,
  "message": "价格更新完成: 成功5个，失败0个",
  "data": {
    "totalSymbols": 5,
    "updatedSuccessfully": 5,
    "updateFailed": 0,
    "prices": [...]
  }
}
```

### 10. **缓存管理**

#### 查看缓存统计
```http
GET /api/market/cache-stats
```

#### 清除缓存
```http
DELETE /api/market/cache
```

## ⏰ **自动化功能**

### 定时价格更新
- **频率**: 每5分钟执行一次
- **功能**: 自动获取投资组合中所有股票的最新价格
- **更新目标**: 数据库中的 `holdings` 表的 `current_price` 字段

### 智能缓存
- **缓存时间**: 1分钟
- **缓存策略**: 股票代码为键，价格数据为值
- **缓存命中**: 减少API调用，提高响应速度

## 🔧 **技术特性**

### 错误处理
- **API失败**: 返回默认数据，避免系统崩溃
- **网络错误**: 自动重试机制
- **数据验证**: 确保返回数据的完整性

### 性能优化
- **批量请求**: 使用 `Promise.allSettled` 并发处理
- **缓存机制**: 减少重复API调用
- **错误隔离**: 单个股票失败不影响其他股票数据

### 数据格式标准化
- **价格精度**: 保留2位小数
- **百分比**: 统一格式化
- **时间戳**: ISO 8601 格式

## 📈 **使用示例**

### 前端调用示例
```javascript
// 获取苹果股票价格
const response = await fetch('/api/market/quote/AAPL');
const data = await response.json();
console.log(data.data.price); // 175.25

// 批量获取多个股票
const quotes = await fetch('/api/market/quotes?symbols=AAPL,MSFT,GOOGL');
const quotesData = await quotes.json();

// 搜索股票
const search = await fetch('/api/market/search/apple');
const searchResults = await search.json();

// 手动更新价格
const update = await fetch('/api/market/update-holdings', {
  method: 'POST'
});
const updateResult = await update.json();
```

### cURL 示例
```bash
# 获取单个股票
curl http://localhost:5000/api/market/quote/AAPL

# 批量获取
curl "http://localhost:5000/api/market/quotes?symbols=AAPL,MSFT,GOOGL"

# 搜索股票
curl http://localhost:5000/api/market/search/apple

# 更新投资组合价格
curl -X POST http://localhost:5000/api/market/update-holdings
```

## 🚨 **注意事项**

1. **API限制**: Yahoo Finance可能有调用频率限制
2. **数据延迟**: 实时数据可能有15-20分钟延迟
3. **错误处理**: 确保前端有适当的错误处理逻辑
4. **缓存策略**: 生产环境建议调整缓存时间

## 🔍 **调试功能**

### 查看系统日志
- 股票价格获取日志
- 缓存命中/未命中日志
- 定时任务执行日志
- 错误和异常日志

### 监控API状态
```bash
# 查看缓存状态
curl http://localhost:5000/api/market/cache-stats

# 清除缓存重新开始
curl -X DELETE http://localhost:5000/api/market/cache
```

这样配置后，你的Portfolio Manager就有了完整的实时股票数据支持！🎉 