# Portfolio Manager 性能测试指南

## 🎯 测试目标

测试 Portfolio Manager 各个 API 接口的性能指标：
- **QPS** (每秒查询数)
- **响应时间** (平均/最大/P95/P99)
- **错误率**
- **并发处理能力**

## 📊 测试计划概览

| 测试组 | 接口 | 并发用户 | 循环次数 | 预期 QPS |
|--------|------|----------|----------|----------|
| Health Check | `/api/health` | 50 | 100 | 1000+ |
| Portfolio API | `/api/portfolio` | 20 | 50 | 200+ |
| Portfolio API | `/api/portfolio/current` | 20 | 50 | 200+ |
| Market Data | `/api/market/quote/AAPL` | 10 | 30 | 100+ |

## 🚀 快速开始

### 方法1：使用 JMeter GUI
```bash
# 1. 下载并安装 JMeter
# https://jmeter.apache.org/download_jmeter.cgi

# 2. 启动 JMeter
jmeter

# 3. 打开测试计划文件
# File -> Open -> portfolio-manager-test-plan.jmx

# 4. 点击绿色的 Start 按钮开始测试
```

### 方法2：命令行测试 (推荐)
```bash
# 确保你的应用正在运行
# http://localhost:5000

# 运行测试并生成报告
jmeter -n -t portfolio-manager-test-plan.jmx -l results.jtl -e -o report/

# 查看HTML报告
open report/index.html
```

## 📈 关键性能指标解读

### QPS (每秒查询数)
```
QPS = 总请求数 / 测试时间(秒)

示例：
- 1000 个请求在 10 秒内完成 = 100 QPS
- 5000 个请求在 20 秒内完成 = 250 QPS
```

### 响应时间分布
```
- 平均响应时间：所有请求的平均值
- P95：95% 的请求在此时间内完成
- P99：99% 的请求在此时间内完成
- 最大响应时间：最慢的那个请求
```

### 性能等级参考
```
优秀：   P95 < 100ms,  QPS > 500
良好：   P95 < 200ms,  QPS > 200  
一般：   P95 < 500ms,  QPS > 100
需优化： P95 > 500ms,  QPS < 100
```

## 🔧 自定义测试场景

### 高并发测试
修改线程组参数：
```
线程数：100
启动时间：30秒
循环次数：10
```

### 持续压力测试
```
线程数：30
启动时间：10秒
持续时间：300秒（5分钟）
```

### 峰值测试
```
线程数：200
启动时间：5秒
循环次数：5
```

## 📋 测试检查清单

### 测试前
- [ ] 确保应用正常运行
- [ ] 确保数据库连接正常
- [ ] 确保没有其他高负载程序
- [ ] 记录系统基础资源使用情况

### 测试中
- [ ] 监控CPU使用率
- [ ] 监控内存使用率
- [ ] 监控数据库连接数
- [ ] 观察应用日志

### 测试后
- [ ] 分析响应时间分布
- [ ] 检查错误率
- [ ] 对比不同负载下的性能
- [ ] 记录性能瓶颈

## 🎯 性能优化建议

### 后端优化
```javascript
// 1. 数据库连接池优化
const sequelize = new Sequelize(database, username, password, {
  pool: {
    max: 20,        // 最大连接数
    min: 5,         // 最小连接数
    acquire: 30000, // 获取连接超时
    idle: 10000     // 空闲超时
  }
});

// 2. 缓存优化
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5分钟缓存

// 3. 异步处理
const cluster = require('cluster');
if (cluster.isMaster) {
  // 创建工作进程
  for (let i = 0; i < require('os').cpus().length; i++) {
    cluster.fork();
  }
}
```

### 常见性能瓶颈
1. **数据库查询慢**
   - 添加索引
   - 优化 SQL 查询
   - 使用连接池

2. **JSON 序列化慢**
   - 减少响应数据量
   - 使用流式处理

3. **外部API调用慢**
   - 增加超时设置
   - 实现缓存机制
   - 使用异步处理

## 📊 监控工具推荐

### 系统监控
```bash
# CPU 和内存监控
htop

# 网络监控
netstat -tulpn

# 数据库监控
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
```

### 应用监控
```javascript
// 添加性能监控中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});
```

## 🎨 JMeter 报告解读

### Summary Report
- **Samples**: 总请求数
- **Average**: 平均响应时间
- **Min/Max**: 最小/最大响应时间
- **Std. Dev**: 标准差
- **Error %**: 错误率
- **Throughput**: 吞吐量 (QPS)

### Graph Results
- 实时响应时间图表
- 可以看到性能趋势
- 识别性能抖动

## 🚨 注意事项

1. **测试环境**：确保测试环境与生产环境配置接近
2. **数据准备**：使用真实数据量进行测试
3. **网络影响**：本地测试消除网络延迟影响
4. **资源监控**：测试时监控系统资源使用情况
5. **多次测试**：进行多轮测试取平均值

## 📈 预期性能基准

基于 Node.js + MySQL 架构的预期性能：

| 接口类型 | 预期 QPS | 预期响应时间 (P95) |
|----------|----------|-------------------|
| 简单查询 | 500-1000 | < 50ms |
| 复杂查询 | 100-300  | < 200ms |
| 写入操作 | 200-500  | < 100ms |
| 外部API  | 50-100   | < 500ms |

**记住：性能测试的目标是找到瓶颈，而不是证明系统很快！** 🎯 