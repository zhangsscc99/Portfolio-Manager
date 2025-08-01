const dotenv = require('dotenv');
dotenv.config();

// RocketMQ 配置
const rocketMQConfig = {
  // 客户端模式：'native' (原生客户端) 或 'http' (HTTP API)
  // Windows 使用 HTTP 模式避免编译问题
  mode: process.env.ROCKETMQ_MODE || 'http',
  
  // 连接配置
  connection: {
    // NameServer地址，支持多个
    nameServer: process.env.ROCKETMQ_NAME_SERVER || 'localhost:9876',
    // HTTP API 端点（RocketMQ Console 或者自定义代理）
    httpEndpoint: process.env.ROCKETMQ_HTTP_ENDPOINT || 'http://localhost:8080',
    // 访问密钥（如果启用了认证）
    accessKey: process.env.ROCKETMQ_ACCESS_KEY || '',
    secretKey: process.env.ROCKETMQ_SECRET_KEY || '',
    // 安全令牌（如果使用云服务）
    securityToken: process.env.ROCKETMQ_SECURITY_TOKEN || '',
  },

  // 生产者配置
  producer: {
    groupName: 'portfolio_producer_group',
    instanceName: 'portfolio_producer',
    // 发送超时时间（毫秒）
    sendMsgTimeout: 3000,
    // 重试次数
    retryTimesWhenSendFailed: 2,
    // 压缩消息体阈值（字节）
    compressMsgBodyOverHowmuch: 4096,
    // 最大消息大小（字节）
    maxMessageSize: 1024 * 1024 * 4, // 4MB
  },

  // 消费者配置
  consumer: {
    groupName: 'portfolio_consumer_group',
    instanceName: 'portfolio_consumer',
    // 消费模式：CLUSTERING（集群模式）或 BROADCASTING（广播模式）
    messageModel: 'CLUSTERING',
    // 消费起点：CONSUME_FROM_LAST_OFFSET, CONSUME_FROM_FIRST_OFFSET, CONSUME_FROM_TIMESTAMP
    consumeFromWhere: 'CONSUME_FROM_LAST_OFFSET',
    // 最大重试次数
    maxReconsumeTimes: 3,
    // 消费超时时间（分钟）
    consumeTimeout: 15,
    // 拉取消息批次大小
    pullBatchSize: 32,
  },

  // 主题定义
  topics: {
    // AI分析相关
    AI_ANALYSIS_REQUEST: 'PORTFOLIO_AI_ANALYSIS_REQUEST',      // AI分析请求
    AI_ANALYSIS_RESULT: 'PORTFOLIO_AI_ANALYSIS_RESULT',        // AI分析结果
    AI_ANALYSIS_ERROR: 'PORTFOLIO_AI_ANALYSIS_ERROR',          // AI分析错误
    
    // 市场数据相关
    MARKET_DATA_UPDATE: 'PORTFOLIO_MARKET_DATA_UPDATE',        // 市场数据更新
    PRICE_ALERT: 'PORTFOLIO_PRICE_ALERT',                      // 价格警报
    
    // 投资组合相关
    PORTFOLIO_CHANGE: 'PORTFOLIO_PORTFOLIO_CHANGE',            // 投资组合变动
    HOLDING_UPDATE: 'PORTFOLIO_HOLDING_UPDATE',                // 持仓更新
    
    // 通知相关
    USER_NOTIFICATION: 'PORTFOLIO_USER_NOTIFICATION',          // 用户通知
    SYSTEM_ALERT: 'PORTFOLIO_SYSTEM_ALERT',                    // 系统警报
    
    // 数据同步相关
    DATA_SYNC: 'PORTFOLIO_DATA_SYNC',                          // 数据同步
    CACHE_REFRESH: 'PORTFOLIO_CACHE_REFRESH',                  // 缓存刷新
  },

  // 标签定义
  tags: {
    // AI分析标签
    AI_PORTFOLIO_ANALYSIS: 'AI_PORTFOLIO_ANALYSIS',
    AI_STOCK_ANALYSIS: 'AI_STOCK_ANALYSIS',
    AI_RISK_ANALYSIS: 'AI_RISK_ANALYSIS',
    
    // 市场数据标签
    STOCK_PRICE_UPDATE: 'STOCK_PRICE_UPDATE',
    CRYPTO_PRICE_UPDATE: 'CRYPTO_PRICE_UPDATE',
    INDEX_UPDATE: 'INDEX_UPDATE',
    
    // 投资组合标签
    PORTFOLIO_CREATE: 'PORTFOLIO_CREATE',
    PORTFOLIO_UPDATE: 'PORTFOLIO_UPDATE',
    PORTFOLIO_DELETE: 'PORTFOLIO_DELETE',
    HOLDING_ADD: 'HOLDING_ADD',
    HOLDING_REMOVE: 'HOLDING_REMOVE',
    
    // 通知标签
    ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',
    PRICE_TARGET_HIT: 'PRICE_TARGET_HIT',
    RISK_WARNING: 'RISK_WARNING',
  },

  // 消息属性
  messageProperties: {
    // 延迟消息级别（1-18，对应不同延迟时间）
    delayLevels: {
      '1s': 1,    // 1秒
      '5s': 2,    // 5秒
      '10s': 3,   // 10秒
      '30s': 4,   // 30秒
      '1m': 5,    // 1分钟
      '2m': 6,    // 2分钟
      '3m': 7,    // 3分钟
      '4m': 8,    // 4分钟
      '5m': 9,    // 5分钟
      '6m': 10,   // 6分钟
      '7m': 11,   // 7分钟
      '8m': 12,   // 8分钟
      '9m': 13,   // 9分钟
      '10m': 14,  // 10分钟
      '20m': 15,  // 20分钟
      '30m': 16,  // 30分钟
      '1h': 17,   // 1小时
      '2h': 18,   // 2小时
    }
  }
};

module.exports = rocketMQConfig; 