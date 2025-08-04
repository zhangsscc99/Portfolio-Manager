const axios = require('axios');
const rocketMQConfig = require('../../config/rocketmq');

class MessageConsumer {
  constructor() {
    this.consumers = new Map();
    this.messageHandlers = new Map();
    this.isInitialized = false;
    this.mode = rocketMQConfig.mode || 'http';
    this.pollingIntervals = new Map(); // 用于HTTP模式的轮询间隔
    this.isPolling = false;
  }

  /**
   * 注册消息处理器
   * @param {string} topic - 主题
   * @param {string} tag - 标签
   * @param {function} handler - 处理函数
   */
  registerHandler(topic, tag, handler) {
    const key = `${topic}:${tag}`;
    this.messageHandlers.set(key, handler);
    console.log(`📝 Registered message handler for ${key}`);
  }

  /**
   * 初始化消费者
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('🚀 RocketMQ Consumers already initialized');
        return;
      }

      // 注册所有消息处理器
      this.registerAllHandlers();

      if (this.mode === 'native') {
        await this.initializeNativeConsumers();
      } else {
        await this.initializeHttpConsumers();
      }

      this.isInitialized = true;
      console.log(`✅ RocketMQ Consumers initialized successfully in ${this.mode} mode`);
    } catch (error) {
      console.error('❌ Failed to initialize RocketMQ Consumers:', error);
      // 不抛出错误，允许系统继续运行
    }
  }

  /**
   * 初始化原生消费者
   */
  async initializeNativeConsumers() {
    try {
      // 为主要主题创建消费者
      const mainTopics = [
        rocketMQConfig.topics.AI_ANALYSIS_REQUEST,
        rocketMQConfig.topics.AI_ANALYSIS_RESULT,
        rocketMQConfig.topics.MARKET_DATA_UPDATE
      ];
      
      for (const topic of mainTopics) {
        try {
          await this.createNativeConsumerForTopic(topic);
        } catch (error) {
          console.warn(`⚠️ Failed to create native consumer for ${topic}, falling back to HTTP mode`);
          this.mode = 'http';
          await this.initializeHttpConsumers();
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ Native consumers failed, falling back to HTTP mode');
      this.mode = 'http';
      await this.initializeHttpConsumers();
    }
  }

  /**
   * 初始化HTTP消费者
   */
  async initializeHttpConsumers() {
    if (!rocketMQConfig.connection.httpEndpoint) {
      console.warn('⚠️ HTTP endpoint not configured, consumer will be disabled');
      return;
    }

    // 启动HTTP轮询
    this.startHttpPolling();
    console.log('✅ HTTP consumers initialized with polling');
  }

  /**
   * 为特定主题创建原生消费者
   * @param {string} topic - 主题名称
   */
  async createNativeConsumerForTopic(topic) {
    try {
      // 检查是否安装了原生客户端
      try {
        require.resolve('apache-rocketmq');
      } catch (resolveError) {
        throw new Error('apache-rocketmq package not found');
      }
      
      const { PushConsumer } = require('apache-rocketmq');
      
      const consumer = new PushConsumer(
        `${rocketMQConfig.consumer.groupName}_${topic}`,
        `${rocketMQConfig.consumer.instanceName}_${topic}`,
        {
          nameServer: rocketMQConfig.connection.nameServer,
          threadCount: 3
        }
      );

      // 订阅主题
      consumer.subscribe(topic, '*');

      // 添加消息监听器
      consumer.on('message', async (msg, ack) => {
        try {
          const result = await this.handleMessage(msg);
          if (result === 'CONSUME_SUCCESS' || result === true) {
            ack.done();
          } else {
            ack.done(false);
          }
        } catch (error) {
          console.error('❌ Error in message handler:', error);
          ack.done(false);
        }
      });

      // 使用 Promise 包装回调
      await new Promise((resolve, reject) => {
        consumer.start((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.consumers.set(topic, consumer);
      console.log(`✅ Native consumer for topic ${topic} started successfully`);
    } catch (error) {
      console.error(`❌ Failed to create native consumer for topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * 启动HTTP轮询
   */
  startHttpPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    const topics = [
      rocketMQConfig.topics.AI_ANALYSIS_REQUEST,
      rocketMQConfig.topics.AI_ANALYSIS_RESULT,
      rocketMQConfig.topics.MARKET_DATA_UPDATE
    ];

    // 为每个主题启动轮询
    topics.forEach(topic => {
      const intervalId = setInterval(() => {
        this.pollMessagesForTopic(topic).catch(error => {
          console.error(`❌ Error polling messages for ${topic}:`, error);
        });
      }, 5000); // 每5秒轮询一次
      
      this.pollingIntervals.set(topic, intervalId);
      console.log(`🔄 Started polling for topic: ${topic}`);
    });
  }

  /**
   * 轮询特定主题的消息
   * @param {string} topic - 主题名称
   */
  async pollMessagesForTopic(topic) {
    try {
      const response = await axios.get(
        `${rocketMQConfig.connection.httpEndpoint}/message/poll`,
        {
          params: {
            topic,
            consumerGroup: `${rocketMQConfig.consumer.groupName}_${topic}`,
            maxNumOfMessages: 10
          },
          headers: {
            ...(rocketMQConfig.connection.accessKey && {
              'Access-Key': rocketMQConfig.connection.accessKey,
              'Secret-Key': rocketMQConfig.connection.secretKey
            })
          },
          timeout: 10000
        }
      );

      const messages = response.data.messages || [];
      
      for (const message of messages) {
        try {
          // 转换为标准消息格式
          const standardMessage = {
            topic: message.topic || topic,
            tags: message.tag || '*',
            body: message.body || message.messageBody,
            msgId: message.messageId || message.msgId,
            keys: message.key || message.keys
          };

          const result = await this.handleMessage(standardMessage);
          
          // 确认消息消费
          if (result === 'CONSUME_SUCCESS' || result === true) {
            await this.acknowledgeMessage(message.messageId || message.receiptHandle, topic);
          }
        } catch (error) {
          console.error('❌ Error processing polled message:', error);
        }
      }

      if (messages.length > 0) {
        console.log(`📥 Polled ${messages.length} messages from ${topic}`);
      }
    } catch (error) {
      // 静默处理轮询错误，避免日志污染
      if (error.code !== 'ECONNREFUSED' && error.code !== 'ETIMEDOUT') {
        console.warn(`⚠️ Failed to poll messages for ${topic}:`, error.message);
      }
    }
  }

  /**
   * 确认消息消费（HTTP模式）
   * @param {string} messageId - 消息ID
   * @param {string} topic - 主题
   */
  async acknowledgeMessage(messageId, topic) {
    try {
      await axios.post(
        `${rocketMQConfig.connection.httpEndpoint}/message/ack`,
        {
          messageId,
          topic,
          consumerGroup: `${rocketMQConfig.consumer.groupName}_${topic}`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(rocketMQConfig.connection.accessKey && {
              'Access-Key': rocketMQConfig.connection.accessKey,
              'Secret-Key': rocketMQConfig.connection.secretKey
            })
          },
          timeout: 5000
        }
      );
    } catch (error) {
      console.warn(`⚠️ Failed to acknowledge message ${messageId}:`, error.message);
    }
  }

  /**
   * 处理接收到的消息
   * @param {object} msg - 消息对象
   */
  async handleMessage(msg) {
    try {
      const { topic, tags, body, msgId, keys } = msg;
      const handlerKey = `${topic}:${tags}`;
      
      console.log(`📥 Received message (${this.mode}):`, {
        topic,
        tags,
        msgId,
        keys,
        bodyLength: body ? body.length : 0
      });

      // 解析消息体
      let messageData;
      try {
        messageData = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (parseError) {
        console.error('❌ Failed to parse message body:', parseError);
        return 'CONSUME_SUCCESS'; // 消费成功，避免重复消费
      }

      // 查找对应的处理器
      const handler = this.messageHandlers.get(handlerKey);
      if (!handler) {
        console.warn(`⚠️ No handler found for ${handlerKey}`);
        return 'CONSUME_SUCCESS';
      }

      // 执行处理器
      const result = await handler(messageData, msg);
      
      if (result === false) {
        console.error(`❌ Handler failed for ${handlerKey}`);
        return 'RECONSUME_LATER'; // 重新消费
      }

      console.log(`✅ Message processed successfully: ${handlerKey}`);
      return 'CONSUME_SUCCESS';
    } catch (error) {
      console.error('❌ Error handling message:', error);
      return 'RECONSUME_LATER';
    }
  }

  /**
   * 注册所有消息处理器
   */
  registerAllHandlers() {
    // AI分析请求处理器
    this.registerHandler(
      rocketMQConfig.topics.AI_ANALYSIS_REQUEST,
      rocketMQConfig.tags.AI_PORTFOLIO_ANALYSIS,
      this.handleAIAnalysisRequest.bind(this)
    );

    // AI分析结果处理器
    this.registerHandler(
      rocketMQConfig.topics.AI_ANALYSIS_RESULT,
      rocketMQConfig.tags.AI_PORTFOLIO_ANALYSIS,
      this.handleAIAnalysisResult.bind(this)
    );

    // 市场数据更新处理器
    this.registerHandler(
      rocketMQConfig.topics.MARKET_DATA_UPDATE,
      rocketMQConfig.tags.STOCK_PRICE_UPDATE,
      this.handleMarketDataUpdate.bind(this)
    );

    this.registerHandler(
      rocketMQConfig.topics.MARKET_DATA_UPDATE,
      rocketMQConfig.tags.CRYPTO_PRICE_UPDATE,
      this.handleMarketDataUpdate.bind(this)
    );
  }

  /**
   * 处理AI分析请求
   * @param {object} messageData - 消息数据
   * @param {object} msg - 原始消息
   */
  async handleAIAnalysisRequest(messageData, msg) {
    try {
      console.log(`🤖 Processing AI analysis request: ${messageData.requestId}`);
      
      // 导入AI分析服务
      const aiAnalysisService = require('../aiAnalysisService-improved');
      const messageProducer = require('./messageProducer');
      
      // 执行AI分析
      const analysisResult = await aiAnalysisService.analyzePortfolio(messageData.portfolioData);
      
      if (analysisResult.success) {
        // 发送分析结果
        await messageProducer.sendAIAnalysisResult({
          requestId: messageData.requestId,
          portfolioId: messageData.portfolioId,
          analysisData: analysisResult.data,
          reportId: analysisResult.data.id
        });
        
        console.log(`✅ AI analysis completed for request: ${messageData.requestId}`);
      } else {
        // 发送错误信息
        await messageProducer.sendAIAnalysisError({
          requestId: messageData.requestId,
          portfolioId: messageData.portfolioId,
          error: analysisResult.error
        });
        
        console.error(`❌ AI analysis failed for request: ${messageData.requestId}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error processing AI analysis request:', error);
      return false;
    }
  }

  /**
   * 处理AI分析结果
   * @param {object} messageData - 消息数据
   * @param {object} msg - 原始消息
   */
  async handleAIAnalysisResult(messageData, msg) {
    try {
      console.log(`📊 Processing AI analysis result: ${messageData.requestId}`);
      
      // 保存分析结果到数据库
      const aiAnalysisHistoryService = require('../aiAnalysisHistoryService');
      const saveResult = await aiAnalysisHistoryService.saveAnalysisReport(
        messageData.portfolioId,
        messageData.analysisData,
        { totalValue: messageData.analysisData.portfolioSnapshot?.totalValue || 0 }
      );
      
      if (saveResult.success) {
        console.log(`✅ AI analysis result saved: ${messageData.requestId}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error processing AI analysis result:', error);
      return false;
    }
  }

  /**
   * 处理市场数据更新
   * @param {object} messageData - 消息数据
   * @param {object} msg - 原始消息
   */
  async handleMarketDataUpdate(messageData, msg) {
    try {
      console.log(`📈 Processing market data update: ${messageData.symbol}`);
      
      // 这里可以添加市场数据处理逻辑
      // 例如：更新缓存、触发价格警报检查、更新投资组合价值等
      // TODO: 实现价格警报检查逻辑
      
      return true;
    } catch (error) {
      console.error('❌ Error processing market data update:', error);
      return false;
    }
  }

  /**
   * 关闭所有消费者
   */
  async shutdown() {
    try {
      // 停止轮询
      if (this.isPolling) {
        this.pollingIntervals.forEach((intervalId, topic) => {
          clearInterval(intervalId);
          console.log(`🛑 Stopped polling for topic: ${topic}`);
        });
        this.pollingIntervals.clear();
        this.isPolling = false;
      }

      // 关闭原生消费者
      if (this.mode === 'native') {
        for (const [topic, consumer] of this.consumers) {
          try {
            // 使用 Promise 包装回调
            await new Promise((resolve, reject) => {
              consumer.shutdown((err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
            console.log(`✅ Native consumer for topic ${topic} shutdown successfully`);
          } catch (error) {
            console.warn(`⚠️ Failed to shutdown native consumer for ${topic}:`, error.message);
          }
        }
      }

      this.consumers.clear();
      this.isInitialized = false;
      console.log('✅ RocketMQ Consumers shutdown successfully');
    } catch (error) {
      console.error('❌ Failed to shutdown RocketMQ Consumers:', error);
    }
  }

  /**
   * 检查消费者状态
   */
  isHealthy() {
    if (this.mode === 'http') {
      return this.isInitialized && this.isPolling;
    } else {
      return this.isInitialized && this.consumers.size > 0;
    }
  }

  /**
   * 获取当前模式
   */
  getMode() {
    return this.mode;
  }
}

// 创建单例实例
const messageConsumerInstance = new MessageConsumer();

module.exports = messageConsumerInstance; 