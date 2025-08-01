const messageProducer = require('./messageProducer');
const messageConsumer = require('./messageConsumer');

class MessageManager {
  constructor() {
    this.isInitialized = false;
    this.producer = messageProducer;
    this.consumer = messageConsumer;
  }

  /**
   * 初始化消息管理器
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('🚀 RocketMQ MessageManager already initialized');
        return;
      }

      console.log('🚀 Initializing RocketMQ MessageManager...');

      // 初始化生产者
      await this.producer.initialize();
      
      // 初始化消费者
      await this.consumer.initialize();

      this.isInitialized = true;
      console.log('✅ RocketMQ MessageManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RocketMQ MessageManager:', error);
      throw error;
    }
  }

  /**
   * 关闭消息管理器
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down RocketMQ MessageManager...');

      // 关闭消费者
      await this.consumer.shutdown();
      
      // 关闭生产者
      await this.producer.shutdown();

      this.isInitialized = false;
      console.log('✅ RocketMQ MessageManager shutdown successfully');
    } catch (error) {
      console.error('❌ Failed to shutdown RocketMQ MessageManager:', error);
    }
  }

  /**
   * 获取生产者实例
   */
  getProducer() {
    return this.producer;
  }

  /**
   * 获取消费者实例
   */
  getConsumer() {
    return this.consumer;
  }

  /**
   * 检查连接状态
   */
  isHealthy() {
    return this.isInitialized && 
           this.producer.isHealthy() && 
           this.consumer.isHealthy();
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      producer: {
        healthy: this.producer.isHealthy(),
        connected: this.producer.isConnected,
        initialized: this.producer.isInitialized
      },
      consumer: {
        healthy: this.consumer.isHealthy(),
        initialized: this.consumer.isInitialized,
        consumersCount: this.consumer.consumers.size
      }
    };
  }

  /**
   * 异步发送AI分析请求
   * @param {object} analysisRequest - 分析请求参数
   * @returns {Promise<object>} 请求结果
   */
  async requestAIAnalysisAsync(analysisRequest) {
    try {
      if (!this.isInitialized) {
        throw new Error('MessageManager not initialized');
      }

      // 生成唯一请求ID
      const requestId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 发送AI分析请求消息
      const result = await this.producer.sendAIAnalysisRequest({
        requestId,
        portfolioId: analysisRequest.portfolioId,
        portfolioData: analysisRequest.portfolioData,
        analysisType: analysisRequest.analysisType || 'full',
        userId: analysisRequest.userId
      });

      if (result.success) {
        return {
          success: true,
          requestId,
          messageId: result.messageId,
          message: 'AI analysis request submitted successfully. You will be notified when complete.'
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to request AI analysis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送市场数据更新
   * @param {object} marketData - 市场数据
   */
  async publishMarketDataUpdate(marketData) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ MessageManager not initialized, skipping market data update');
        return { success: false, error: 'MessageManager not initialized' };
      }

      return await this.producer.sendMarketDataUpdate(marketData);
    } catch (error) {
      console.error('❌ Failed to publish market data update:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送投资组合变动通知
   * @param {object} portfolioChange - 投资组合变动数据
   */
  async publishPortfolioChange(portfolioChange) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ MessageManager not initialized, skipping portfolio change');
        return { success: false, error: 'MessageManager not initialized' };
      }

      return await this.producer.sendPortfolioChange(portfolioChange);
    } catch (error) {
      console.error('❌ Failed to publish portfolio change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送持仓更新通知
   * @param {object} holdingUpdate - 持仓更新数据
   */
  async publishHoldingUpdate(holdingUpdate) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ MessageManager not initialized, skipping holding update');
        return { success: false, error: 'MessageManager not initialized' };
      }

      return await this.producer.sendHoldingUpdate(holdingUpdate);
    } catch (error) {
      console.error('❌ Failed to publish holding update:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送用户通知
   * @param {object} notification - 通知数据
   */
  async publishUserNotification(notification) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ MessageManager not initialized, skipping user notification');
        return { success: false, error: 'MessageManager not initialized' };
      }

      return await this.producer.sendUserNotification(notification);
    } catch (error) {
      console.error('❌ Failed to publish user notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送价格警报
   * @param {object} priceAlert - 价格警报数据
   */
  async publishPriceAlert(priceAlert) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ MessageManager not initialized, skipping price alert');
        return { success: false, error: 'MessageManager not initialized' };
      }

      return await this.producer.sendPriceAlert(priceAlert);
    } catch (error) {
      console.error('❌ Failed to publish price alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量发送消息
   * @param {Array} messages - 消息数组
   */
  async publishBatch(messages) {
    try {
      if (!this.isInitialized) {
        throw new Error('MessageManager not initialized');
      }

      const results = [];
      for (const message of messages) {
        const { type, data } = message;
        
        let result;
        switch (type) {
          case 'market_data':
            result = await this.publishMarketDataUpdate(data);
            break;
          case 'portfolio_change':
            result = await this.publishPortfolioChange(data);
            break;
          case 'holding_update':
            result = await this.publishHoldingUpdate(data);
            break;
          case 'user_notification':
            result = await this.publishUserNotification(data);
            break;
          case 'price_alert':
            result = await this.publishPriceAlert(data);
            break;
          default:
            result = { success: false, error: `Unknown message type: ${type}` };
        }
        
        results.push({ type, success: result.success, error: result.error });
      }

      return {
        success: true,
        results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('❌ Failed to publish batch messages:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 重试失败的操作
   * @param {function} operation - 要重试的操作
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delayMs - 重试间隔（毫秒）
   */
  async retryOperation(operation, maxRetries = 3, delayMs = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    
    throw lastError;
  }
}

// 创建单例实例
const messageManagerInstance = new MessageManager();

module.exports = messageManagerInstance; 