# 📚 Portfolio Manager API 文档

## 🎯 概述

Portfolio Manager API 是一个完整的投资组合管理系统的后端接口，提供投资组合管理、市场数据获取、资产跟踪等功能。

## 📖 API 文档访问

### 在线文档
- **开发环境**: http://localhost:5000/api-docs
- **生产环境**: http://47.243.102.28:5000/api-docs

### 文档特性
- ✅ 交互式API测试
- ✅ 完整的请求/响应示例
- ✅ 自动生成代码示例
- ✅ 实时API验证

## 🏗️ API 架构

### 基础URL
```
开发环境: http://localhost:5000/api
生产环境: http://47.243.102.28:5000/api
```

### 认证
目前API使用无认证模式，所有端点都是公开的。

### 响应格式
所有API响应都遵循统一的JSON格式：

```json
{
  "success": true,
  "data": { ... },
  "error": "错误信息（如果失败）"
}
```

## 📊 API 端点分类

### 1. Portfolio 管理
**基础路径**: `/portfolio`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/portfolio` | 获取所有投资组合 |
| GET | `/portfolio/current` | 获取当前投资组合 |
| GET | `/portfolio/{id}` | 获取指定投资组合 |
| POST | `/portfolio` | 创建新投资组合 |
| PUT | `/portfolio/{id}` | 更新投资组合 |

### 2. Holdings 管理
**基础路径**: `/holdings`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/holdings` | 获取所有持仓 |
| GET | `/holdings/{id}` | 获取指定持仓 |
| POST | `/holdings` | 添加新持仓 |
| PUT | `/holdings/{id}` | 更新持仓 |
| DELETE | `/holdings/{id}` | 删除持仓 |

### 3. Assets 管理
**基础路径**: `/assets`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/assets/portfolio/{id}` | 获取投资组合资产 |
| GET | `/assets/{id}` | 获取指定资产 |
| POST | `/assets` | 添加新资产 |
| PUT | `/assets/{id}` | 更新资产 |
| DELETE | `/assets/{id}` | 删除资产 |

### 4. Market Data
**基础路径**: `/market`

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/market/quote/{symbol}` | 获取股票报价 |
| GET | `/market/quotes` | 批量获取股票报价 |
| GET | `/market/search` | 搜索股票 |
| GET | `/market/gainers` | 获取涨幅榜 |
| GET | `/market/losers` | 获取跌幅榜 |
| GET | `/market/trending` | 获取热门股票 |
| GET | `/market/indices` | 获取市场指数 |

## 🔧 数据模型

### Portfolio（投资组合）
```json
{
  "id": 1,
  "name": "My Investment Portfolio",
  "description": "Main investment portfolio",
  "total_value": 50000.00,
  "cash": 25000.00,
  "day_change": 1250.50,
  "day_change_percent": 2.5,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Holding（持仓）
```json
{
  "id": 1,
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "type": "stock",
  "quantity": 10.0,
  "avg_price": 150.00,
  "current_price": 175.25,
  "portfolio_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Asset（资产）
```json
{
  "id": 1,
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "asset_type": "stock",
  "quantity": 10.0,
  "avg_cost": 150.00,
  "current_price": 175.25,
  "currency": "USD",
  "portfolio_id": 1,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### StockQuote（股票报价）
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 175.25,
  "change": 2.50,
  "changePercent": 1.45,
  "volume": 50000000,
  "marketCap": 2750000000000,
  "peRatio": 28.5,
  "dividendYield": 0.65,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🚀 使用示例

### 1. 获取当前投资组合
```bash
curl -X GET "http://localhost:5000/api/portfolio/current"
```

### 2. 添加新持仓
```bash
curl -X POST "http://localhost:5000/api/holdings" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "quantity": 10,
    "avgPrice": 150.00,
    "currentPrice": 175.25
  }'
```

### 3. 获取股票报价
```bash
curl -X GET "http://localhost:5000/api/market/quote/AAPL"
```

### 4. 搜索股票
```bash
curl -X GET "http://localhost:5000/api/market/search?q=Apple"
```

### 5. 获取投资组合资产
```bash
curl -X GET "http://localhost:5000/api/assets/portfolio/1"
```

## 🔍 错误处理

### 错误响应格式
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见HTTP状态码
- **200**: 请求成功
- **201**: 资源创建成功
- **400**: 请求参数错误
- **404**: 资源未找到
- **500**: 服务器内部错误

## 📝 开发指南

### 本地开发
```bash
# 启动后端服务器
cd backend
npm install
npm start

# 访问API文档
open http://localhost:5000/api-docs
```

### 测试API
1. 访问 http://localhost:5000/api-docs
2. 选择要测试的API端点
3. 点击 "Try it out" 按钮
4. 填写请求参数
5. 点击 "Execute" 执行请求

### 代码生成
Swagger UI 支持自动生成多种语言的客户端代码：
- JavaScript/TypeScript
- Python
- Java
- C#
- PHP
- Go
- Ruby

## 🔒 安全考虑

### 当前状态
- API 目前为公开访问
- 无认证机制
- 适合开发和测试环境

### 生产环境建议
- 添加 JWT 认证
- 实现 API 限流
- 添加 CORS 配置
- 使用 HTTPS
- 添加请求日志记录

## 📈 性能优化

### 缓存策略
- 市场数据缓存 30 秒
- 投资组合数据实时更新
- 静态资源缓存

### 数据库优化
- 使用连接池
- 索引优化
- 查询优化

## 🐛 故障排除

### 常见问题

1. **API 无响应**
   - 检查服务器是否启动
   - 确认端口 5000 是否被占用
   - 检查防火墙设置

2. **数据库连接失败**
   - 确认 MySQL 服务运行
   - 检查数据库配置
   - 验证数据库权限

3. **市场数据获取失败**
   - 检查网络连接
   - 确认 Yahoo Finance API 可用
   - 查看服务器日志

### 日志查看
```bash
# 查看 PM2 日志
pm2 logs portfolio-backend

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
```

## 📞 支持

如有问题或建议，请：
1. 查看 API 文档
2. 检查服务器日志
3. 联系开发团队

---

**最后更新**: 2024年1月
**版本**: 1.0.0 