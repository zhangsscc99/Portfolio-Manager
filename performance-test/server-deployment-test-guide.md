# 🚀 服务器部署和性能测试指南

## ✅ **配置已修改回localhost**

现在JMeter配置已经改回localhost，可以在服务器上进行本地测试！

## 📦 **部署到服务器的步骤**

### 1️⃣ **上传项目到服务器**
```bash
# 方法1：使用git
git clone https://github.com/your-repo/Portfolio_Manager.git
cd Portfolio_Manager

# 方法2：使用scp上传
scp -r ./Portfolio_Manager root@47.243.102.28:/opt/
```

### 2️⃣ **在服务器上安装依赖**
```bash
# 后端依赖
cd backend
npm install

# 前端构建
cd ../frontend
npm install
npm run build:prod
```

### 3️⃣ **启动应用**
```bash
# 启动后端
cd backend
npm start
# 或者用PM2
pm2 start server.js --name "portfolio-backend"
```

## 🧪 **在服务器上安装JMeter**

### 方法1：使用yum/apt（推荐）
```bash
# CentOS/RHEL
sudo yum install java-1.8.0-openjdk
wget https://downloads.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz
tar -xzf apache-jmeter-5.6.3.tgz

# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-8-jdk
wget https://downloads.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz
tar -xzf apache-jmeter-5.6.3.tgz
```

### 方法2：直接上传JMeter文件夹
```bash
# 从本地上传整个apache-jmeter-5.6.3文件夹
scp -r ./apache-jmeter-5.6.3 root@47.243.102.28:/opt/
scp -r ./performance-test root@47.243.102.28:/opt/
```

## 🎯 **在服务器上运行测试**

### 连接到服务器
```bash
ssh root@47.243.102.28
cd /opt
```

### 运行性能测试
```bash
# 1. 先确认应用运行正常
curl http://localhost:5000/api/health

# 2. 运行安全版本测试
cd apache-jmeter-5.6.3
./bin/jmeter -n -t ../performance-test/portfolio-manager-safe-test.jmx -l safe-test.jtl -e -o safe-report

# 3. 运行完整性能测试
./bin/jmeter -n -t ../performance-test/portfolio-manager-test-plan.jmx -l server-performance.jtl -e -o performance-report
```

### 查看测试结果
```bash
# 在服务器上安装简单的HTTP服务器查看报告
python3 -m http.server 8080

# 然后在浏览器访问：
# http://47.243.102.28:8080/performance-report/
```

## 📊 **预期服务器性能**

| 测试环境 | 预期QPS | 响应时间 | CPU使用率 | 内存使用率 |
|----------|---------|----------|-----------|-----------|
| **服务器本地** | 800-1200 | 30-50ms | <80% | <70% |
| **高负载** | 500-800 | 50-100ms | <90% | <80% |

## 🔍 **监控服务器资源**

在测试期间，另开一个终端监控：
```bash
# 监控CPU和内存
top

# 监控网络连接
netstat -an | grep :5000

# 监控磁盘IO
iostat 1

# 实时查看应用日志
tail -f backend/logs/app.log  # 如果有日志文件
```

## 📋 **服务器测试命令汇总**

```bash
# === 完整的服务器测试流程 ===

# 1. 确认应用状态
curl http://localhost:5000/api/health

# 2. 安全测试（低压力）
cd apache-jmeter-5.6.3
./bin/jmeter -n -t ../performance-test/portfolio-manager-safe-test.jmx -l safe.jtl -e -o safe-report

# 3. 性能测试（标准压力）
./bin/jmeter -n -t ../performance-test/portfolio-manager-test-plan.jmx -l perf.jtl -e -o perf-report

# 4. 查看结果
python3 -m http.server 8080
# 浏览器打开: http://47.243.102.28:8080/perf-report/
```

## 🎉 **优势**

在服务器本地测试的好处：
- ✅ **无网络延迟** - 真实的应用性能
- ✅ **无防火墙限制** - 不会被拦截
- ✅ **资源监控** - 直接看CPU/内存使用
- ✅ **真实环境** - 生产环境的真实性能
- ✅ **无并发限制** - 可以测试极限性能

## 🚀 **现在你可以**：

1. **git push** 你的代码到服务器
2. 在服务器上**npm install && npm start**
3. 上传JMeter文件到服务器
4. 在服务器上运行**本地性能测试**

这样就能得到最准确的性能数据了！ 🎯 