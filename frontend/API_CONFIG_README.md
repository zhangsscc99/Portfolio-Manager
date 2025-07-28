# API配置说明

## 概述
前端项目已经完成API接口的baseURL解耦，现在使用统一的配置管理所有后端接口调用。

## 配置文件
- **位置**: `src/config/api.js`
- **环境变量**: `REACT_APP_API_URL`
- **当前默认地址**: `http://47.243.102.28:5000/api`

## 环境变量设置

### 1. 创建 `.env` 文件
在 `frontend/` 目录下创建 `.env` 文件：
```bash
# 前端端口设置
PORT=3050

# API配置
REACT_APP_API_URL=http://47.243.102.28:5000/api
```

### 2. 不同环境配置
- **生产环境**: `http://47.243.102.28:5000/api`
- **开发环境**: `http://localhost:5000/api`
- **测试环境**: 根据需要设置

## 使用方式

### 1. 使用现有API服务（推荐）
```javascript
import { portfolioAPI, marketAPI, holdingsAPI } from '../services/api';

// 获取投资组合数据
const data = await portfolioAPI.getCurrentPortfolio();

// 获取市场数据
const gainers = await marketAPI.getGainers(10);
```

### 2. 使用配置文件直接构建URL
```javascript
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

// 构建完整URL
const url = buildApiUrl(API_ENDPOINTS.assets.portfolio(1));
const response = await fetch(url);
```

## 已修复的文件
1. ✅ `src/services/api.js` - 使用统一配置
2. ✅ `src/pages/Portfolio.js` - 修复直接fetch调用
3. ✅ `src/config/api.js` - 新增配置文件
4. ✅ `.env.example` - 环境变量示例

## 端口配置
前端运行在 3050 端口，通过 `.env` 文件中的 `PORT=3050` 设置。

## 修改配置
### 修改API服务器地址：
1. 更新 `.env` 文件中的 `REACT_APP_API_URL` 变量
2. 重启开发服务器

### 修改前端端口：
1. 更新 `.env` 文件中的 `PORT` 变量
2. 重启开发服务器

## 注意事项
- 环境变量必须以 `REACT_APP_` 开头才能在React中使用
- 修改环境变量后需要重启开发服务器
- 生产环境部署时确保设置正确的环境变量 