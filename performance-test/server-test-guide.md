# 🚀 服务器性能测试指南 - 安全版本

## ⚠️ **重要：避免被误判为攻击**

你的担心非常正确！负载测试确实可能被当作攻击。以下是**安全策略**：

## 🛡️ **潜在风险分析**

| 风险类型 | 触发条件 | 后果 | 防护机制 |
|----------|----------|------|----------|
| **DDoS防护** | 高并发请求 | IP被封 | 阿里云盾、腾讯云等 |
| **防火墙拦截** | 频繁请求 | 连接拒绝 | WAF规则 |
| **Rate Limiting** | 超过频率限制 | 429错误 | API网关限制 |
| **反爬虫** | 机器行为特征 | 验证码/封IP | 行为分析 |

## ✅ **安全测试策略**

### 🟢 **低风险测试**（推荐开始）

**使用新的安全测试计划**：
```bash
# 安全版本 - 每个请求间隔2-5秒
java -jar bin\ApacheJMeter.jar -n -t ..\performance-test\portfolio-manager-safe-test.jmx -l safe-test.jtl -e -o safe-report
```

**配置说明**：
- 📊 **2个线程** (模拟2个用户)
- ⏱️ **2-5秒间隔** (避免频率过高)
- 🔄 **少量循环** (5次/3次)
- 📈 **渐进启动** (10秒内逐步启动)

### 🟡 **中等风险测试**（谨慎使用）

```bash
# 降低原计划的并发数
java -jar bin\ApacheJMeter.jar -n -t ..\performance-test\portfolio-manager-test-plan.jmx -JThreads=5 -JLoops=10 -l medium-test.jtl
```

### 🔴 **高风险测试**（不推荐生产环境）

```bash
# 原始高并发计划 - 可能被封
java -jar bin\ApacheJMeter.jar -n -t ..\performance-test\portfolio-manager-test-plan.jmx -l high-risk-test.jtl
```

## 🎯 **推荐测试流程**

### 第1步：**连通性测试**
```bash
# 先确认服务器可访问
curl http://47.243.102.28:5000/api/health
```

### 第2步：**单次测试**
```bash
# 发送单个请求验证
curl -w "@curl-format.txt" http://47.243.102.28:5000/api/portfolio
```

### 第3步：**安全负载测试**
```bash
# 使用安全版本
java -jar bin\ApacheJMeter.jar -n -t ..\performance-test\portfolio-manager-safe-test.jmx -l safe-test.jtl -e -o safe-report
```

### 第4步：**监控观察**
- 🔍 查看服务器日志
- 📊 监控错误率
- ⏱️ 观察响应时间
- 🚨 注意是否有封禁警告

## 📋 **安全测试参数对比**

| 测试版本 | 并发数 | 请求间隔 | 风险等级 | 适用场景 |
|----------|--------|----------|----------|----------|
| **Safe版** | 2 | 2-5秒 | 🟢 极低 | 生产环境首次测试 |
| **原版(修改)** | 5-10 | 1秒 | 🟡 中等 | 内部测试环境 |
| **原版(完整)** | 50 | 无间隔 | 🔴 高 | 专用测试环境 |

## 🛠️ **如何避免被封**

### 1️⃣ **请求频率控制**
```xml
<!-- JMeter中添加延迟 -->
<ConstantTimer>
  <stringProp name="ConstantTimer.delay">2000</stringProp> <!-- 2秒延迟 -->
</ConstantTimer>
```

### 2️⃣ **User-Agent设置**
```xml
<HeaderManager>
  <elementProp name="User-Agent" elementType="Header">
    <stringProp name="Header.value">JMeter-Portfolio-Test/1.0</stringProp>
  </elementProp>
</HeaderManager>
```

### 3️⃣ **渐进式增加负载**
```bash
# 第一次：2个用户
java -jar bin\ApacheJMeter.jar -n -t portfolio-manager-safe-test.jmx -JSERVER_HOST=47.243.102.28

# 观察无异常后，第二次：5个用户
java -jar bin\ApacheJMeter.jar -n -t portfolio-manager-test-plan.jmx -JSERVER_HOST=47.243.102.28 -JThreads=5
```

## 🚨 **紧急停止**

如果测试期间发现：
- ❌ 大量错误（403/429/503）
- ⏱️ 响应时间突然增加
- 🔒 IP被拒绝连接

**立即停止测试**：
```bash
# 停止JMeter进程
Ctrl+C

# 等待10-15分钟后再尝试简单请求
curl http://47.243.102.28:5000/api/health
```

## 💡 **建议方案**

1. **开始使用安全版本**：
   ```bash
   java -jar bin\ApacheJMeter.jar -n -t ..\performance-test\portfolio-manager-safe-test.jmx -l safe-test.jtl -e -o safe-report
   ```

2. **观察结果无异常后**，再考虑逐步增加负载

3. **记录测试日志**，监控服务器反应

4. **准备回退策略**，如有异常立即停止

## 🎉 **现在可以安全测试了！**

使用 `portfolio-manager-safe-test.jmx` 进行安全的服务器测试，避免被误判为攻击！ 