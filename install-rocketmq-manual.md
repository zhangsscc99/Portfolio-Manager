# 手动安装 RocketMQ（不使用 Docker）

## Windows 安装

### 1. 下载 RocketMQ
```bash
# 下载地址
https://rocketmq.apache.org/download/

# 或者直接下载
wget https://archive.apache.org/dist/rocketmq/4.9.4/rocketmq-all-4.9.4-bin-release.zip
```

### 2. 解压并配置
```bash
# 解压到 C:\rocketmq
unzip rocketmq-all-4.9.4-bin-release.zip
cd rocketmq-all-4.9.4-bin-release
```

### 3. 启动 NameServer
```bash
# Windows
cd bin
start mqnamesrv.cmd

# 或者在 PowerShell 中
.\mqnamesrv.cmd
```

### 4. 启动 Broker
```bash
# Windows  
start mqbroker.cmd -n localhost:9876 autoCreateTopicEnable=true

# 或者在 PowerShell 中
.\mqbroker.cmd -n localhost:9876 autoCreateTopicEnable=true
```

### 5. 验证安装
```bash
# 检查端口是否正常
netstat -an | findstr 9876    # NameServer
netstat -an | findstr 10911   # Broker
```

## Linux/macOS 安装

### 1. 下载和解压
```bash
wget https://archive.apache.org/dist/rocketmq/4.9.4/rocketmq-all-4.9.4-bin-release.zip
unzip rocketmq-all-4.9.4-bin-release.zip
cd rocketmq-all-4.9.4-bin-release
```

### 2. 设置环境变量
```bash
export NAMESRV_ADDR=localhost:9876
```

### 3. 启动 NameServer
```bash
nohup sh bin/mqnamesrv &
tail -f ~/logs/rocketmqlogs/namesrv.log
```

### 4. 启动 Broker
```bash
nohup sh bin/mqbroker -n localhost:9876 &
tail -f ~/logs/rocketmqlogs/broker.log
```

## 🎯 安装后的连接配置

无论用哪种方式安装，你的应用配置都是：

```javascript
// backend/config/rocketmq.js
const rocketMQConfig = {
  mode: 'native',  // 使用原生模式
  connection: {
    nameServer: 'localhost:9876',  // NameServer 地址
    // httpEndpoint 在原生模式下不需要
  }
}
```

## 🔧 检查是否安装成功

```bash
# 测试发送消息
sh mqadmin sendMessage -n localhost:9876 -t TestTopic -p "Hello RocketMQ"

# 查看主题
sh mqadmin topicList -n localhost:9876
``` 