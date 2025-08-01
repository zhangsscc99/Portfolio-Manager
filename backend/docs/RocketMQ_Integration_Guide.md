# RocketMQ 集成指南

## 概述

Portfolio Manager 现已集成 RocketMQ 消息队列，用于优化以下功能：
- **AI 分析异步处理** - 提高用户体验，避免长时间等待
- **市场数据实时分发** - 高效的价格更新通知
- **投资组合变动通知** - 解耦业务逻辑
- **用户通知系统** - 统一的消息推送机制

## 架构说明

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   RocketMQ      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │AI分析请求   │◄┼────┼─│异步分析接口  │ │    │ │ Producer    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │结果轮询     │◄┼────┼─│状态查询接口  │◄┼────┼─│ Consumer    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 安装配置

### 1. 安装 RocketMQ 依赖

```bash
cd backend
npm install @alibaba-cloud/rocketmq rocketmq-client-nodejs
```

### 2. 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# RocketMQ 配置
ROCKETMQ_NAME_SERVER=localhost:9876
ROCKETMQ_ACCESS_KEY=
ROCKETMQ_SECRET_KEY=
ROCKETMQ_SECURITY_TOKEN=
```

### 3. 启动 RocketMQ Server

#### 本地开发环境

下载并启动 RocketMQ：

```bash
# 下载 RocketMQ
wget https://dist.apache.org/repos/dist/release/rocketmq/4.9.4/rocketmq-all-4.9.4-bin-release.zip
unzip rocketmq-all-4.9.4-bin-release.zip
cd rocketmq-all-4.9.4-bin-release

# 启动 NameServer
nohup sh bin/mqnamesrv &

# 启动 Broker
nohup sh bin/mqbroker -n localhost:9876 &
```

#### 生产环境

使用阿里云 RocketMQ 服务或自建集群。

## 主要功能

### 1. 异步 AI 分析

#### 发起异步分析

```javascript
POST /api/ai-analysis/async
{
  "portfolioId": 1,
  "analysisType": "full",
  "userId": "user123"
}
```

响应：
```javascript
{
  "success": true,
  "mode": "asynchronous",
  "requestId": "ai_1703123456789_abcd1234",
  "messageId": "AC1100012C5F18B4AAC27A1F2E000001",
  "message": "AI analysis request submitted successfully. You will be notified when complete.",
  "estimatedTime": "1-3 minutes"
}
```

#### 查询分析状态

```javascript
GET /api/ai-analysis/status/ai_1703123456789_abcd1234
```

响应：
```javascript
{
  "success": true,
  "status": "completed",
  "data": {
    "requestId": "ai_1703123456789_abcd1234",
    "reportId": 123,
    "completedAt": "2023-12-21T10:30:00Z",
    "analysisData": { /* 分析结果 */ }
  }
}
```

### 2. 市场数据实时更新

系统会自动将市场数据更新发送到消息队列：

```javascript
// 股票价格更新消息
{
  "symbol": "AAPL",
  "price": 175.23,
  "change": 2.45,
  "changePercent": 1.42,
  "volume": 50123456,
  "type": "stock",
  "timestamp": "2023-12-21T15:30:00Z"
}

// 加密货币价格更新消息
{
  "symbol": "BTC",
  "price": 42156.78,
  "change": -123.45,
  "changePercent": -0.29,
  "volume": 1234567890,
  "type": "crypto",
  "timestamp": "2023-12-21T15:30:00Z"
}
```

### 3. 投资组合变动通知

```javascript
// 投资组合变动消息
{
  "portfolioId": 1,
  "changeType": "update",
  "changes": {
    "action": "add_holding",
    "symbol": "AAPL",
    "quantity": 10
  },
  "timestamp": "2023-12-21T15:30:00Z",
  "userId": "user123"
}
```

### 4. 用户通知

```javascript
// 用户通知消息
{
  "userId": "user123",
  "title": "投资组合分析完成",
  "message": "您的投资组合AI分析报告已生成完成",
  "type": "success",
  "data": {
    "requestId": "ai_1703123456789_abcd1234",
    "reportId": 123,
    "portfolioId": 1
  },
  "timestamp": "2023-12-21T15:30:00Z"
}
```

## 消息主题和标签

### 主题定义

| 主题 | 描述 | 用途 |
|------|------|------|
| `PORTFOLIO_AI_ANALYSIS_REQUEST` | AI分析请求 | 异步AI分析 |
| `PORTFOLIO_AI_ANALYSIS_RESULT` | AI分析结果 | 分析完成通知 |
| `PORTFOLIO_AI_ANALYSIS_ERROR` | AI分析错误 | 错误处理 |
| `PORTFOLIO_MARKET_DATA_UPDATE` | 市场数据更新 | 价格变动通知 |
| `PORTFOLIO_PRICE_ALERT` | 价格警报 | 价格监控 |
| `PORTFOLIO_PORTFOLIO_CHANGE` | 投资组合变动 | 业务事件 |
| `PORTFOLIO_HOLDING_UPDATE` | 持仓更新 | 交易事件 |
| `PORTFOLIO_USER_NOTIFICATION` | 用户通知 | 消息推送 |

### 标签定义

| 标签 | 描述 |
|------|------|
| `AI_PORTFOLIO_ANALYSIS` | 投资组合AI分析 |
| `AI_STOCK_ANALYSIS` | 个股AI分析 |
| `STOCK_PRICE_UPDATE` | 股票价格更新 |
| `CRYPTO_PRICE_UPDATE` | 加密货币价格更新 |
| `PORTFOLIO_UPDATE` | 投资组合更新 |
| `HOLDING_ADD` | 添加持仓 |
| `HOLDING_REMOVE` | 移除持仓 |
| `ANALYSIS_COMPLETE` | 分析完成 |
| `PRICE_TARGET_HIT` | 价格目标达成 |

## 错误处理和容错

### 1. 回退机制

当 RocketMQ 不可用时，系统会自动回退到同步模式：

```javascript
// AI 分析回退
if (!messageManager.isHealthy()) {
  console.warn('⚠️ RocketMQ not available, falling back to synchronous analysis');
  // 执行同步分析
}
```

### 2. 重试机制

消息发送失败时会自动重试：

```javascript
const retryResult = await messageManager.retryOperation(
  () => messageManager.publishMarketDataUpdate(data),
  3,  // 最大重试次数
  1000 // 重试间隔(ms)
);
```

### 3. 消息持久化

所有重要消息都会持久化到数据库，即使消息队列失败也不会丢失数据。

## 监控和调试

### 1. 健康检查

```javascript
GET /api/health
```

响应包含 RocketMQ 状态：
```javascript
{
  "status": "OK",
  "rocketmq": {
    "status": "✅ 已连接",
    "producer": "healthy",
    "consumer": "healthy"
  }
}
```

### 2. 日志监控

系统会记录详细的消息队列日志：

```
📤 Message sent successfully: topic=PORTFOLIO_AI_ANALYSIS_REQUEST, messageId=AC1100012C5F18B4AAC27A1F2E000001
📥 Received message: topic=PORTFOLIO_AI_ANALYSIS_REQUEST, tags=AI_PORTFOLIO_ANALYSIS
🤖 Processing AI analysis request: ai_1703123456789_abcd1234
✅ AI analysis completed for request: ai_1703123456789_abcd1234
```

### 3. 性能指标

监控以下指标：
- 消息发送成功率
- 消息处理延迟
- 队列积压数量
- 错误率和重试次数

## 最佳实践

### 1. 消息设计

- 使用结构化的消息格式
- 包含时间戳和唯一标识
- 避免消息体过大（建议 < 4MB）

### 2. 错误处理

- 实现幂等性处理
- 设置合理的重试次数
- 记录失败消息用于排查

### 3. 性能优化

- 批量发送消息
- 合理设置消费者数量
- 使用延迟消息减少系统压力

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 NameServer 地址是否正确
   - 确认网络连通性
   - 验证访问密钥配置

2. **消息发送失败**
   - 检查主题是否存在
   - 验证消息格式
   - 查看 Broker 状态

3. **消费延迟**
   - 增加消费者实例
   - 优化消息处理逻辑
   - 检查网络延迟

### 调试命令

```bash
# 查看主题信息
sh mqadmin topicList -n localhost:9876

# 查看消费者状态
sh mqadmin consumerProgress -n localhost:9876 -g portfolio_consumer_group

# 查看消息轨迹
sh mqadmin queryMsgTraceById -n localhost:9876 -i messageId
```

## 升级和迁移

当需要升级 RocketMQ 版本或迁移时：

1. 备份现有配置和数据
2. 部署新版本的 RocketMQ
3. 更新应用程序依赖
4. 逐步迁移主题和消费者
5. 验证功能完整性

## 总结

RocketMQ 的集成大大提升了 Portfolio Manager 的性能和可扩展性：

- ✅ **提升用户体验** - AI 分析异步处理
- ✅ **增强系统可靠性** - 消息持久化和重试机制
- ✅ **改善系统架构** - 服务解耦和事件驱动
- ✅ **支持水平扩展** - 多实例消费者支持
- ✅ **实时数据处理** - 高效的市场数据分发



✅ Enhance User Experience - AI analysis with asynchronous processing

✅ Strengthen System Reliability - Message persistence and retry mechanisms

✅ Improve System Architecture - Service decoupling and event-driven architecture

✅ Support Horizontal Scaling - Multi-instance consumer support

✅ Real-time Data Processing - Efficient market data distribution

通过合理的配置和使用，RocketMQ 将为 Portfolio Manager 提供强大的消息处理能力。 