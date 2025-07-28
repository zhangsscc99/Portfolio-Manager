# 📚 JavaScript操作MySQL的框架原理详解

## 🎯 整体架构

```
前端 React → HTTP请求 → 后端 Express → Sequelize ORM → MySQL数据库
```

## 🔧 核心技术栈

### 1. **MySQL驱动 (mysql2)**
- **作用**: 提供底层TCP连接到MySQL服务器
- **原理**: 实现MySQL通信协议，处理二进制数据包
- **连接池**: 管理多个数据库连接，提高性能

```javascript
// 原生MySQL查询示例
const mysql = require('mysql2/promise');
const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: 'your_password',
  database: 'portfolio_manager'
});

// 执行原生SQL
const [rows] = await connection.execute('SELECT * FROM portfolios WHERE user_id = ?', [1]);
```

### 2. **ORM框架 (Sequelize)**
- **ORM全称**: Object-Relational Mapping (对象关系映射)
- **核心思想**: 将数据库表映射为JavaScript对象
- **优势**: 
  - 类型安全
  - 自动生成SQL
  - 跨数据库兼容
  - 防止SQL注入

```javascript
// Sequelize模型定义
const Portfolio = sequelize.define('Portfolio', {
  name: DataTypes.STRING,
  total_value: DataTypes.DECIMAL(15, 2)
});

// JS对象操作 → 自动转换为SQL
const portfolio = await Portfolio.create({
  name: 'My Portfolio',
  total_value: 10000.00
});
// 生成SQL: INSERT INTO portfolios (name, total_value) VALUES (?, ?)
```

## 🏗️ 数据流程

### 1. **模型定义阶段**
```javascript
// 定义表结构
const Portfolio = sequelize.define('Portfolio', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  name: DataTypes.STRING,
  total_value: DataTypes.DECIMAL(15, 2)
});
```

### 2. **关联关系定义**
```javascript
// 一对多关系
User.hasMany(Portfolio, { foreignKey: 'user_id' });
Portfolio.belongsTo(User, { foreignKey: 'user_id' });
```

### 3. **数据库同步**
```javascript
// 自动创建表结构
await sequelize.sync({ force: true });
// 生成CREATE TABLE SQL语句
```

### 4. **CRUD操作**

#### 📝 **创建 (Create)**
```javascript
// JavaScript代码
const portfolio = await Portfolio.create({
  name: 'Tech Portfolio',
  total_value: 50000.00,
  user_id: 1
});

// 自动生成的SQL
// INSERT INTO portfolios (name, total_value, user_id, created_at, updated_at) 
// VALUES ('Tech Portfolio', 50000.00, 1, NOW(), NOW())
```

#### 📖 **查询 (Read)**
```javascript
// JavaScript代码
const portfolios = await Portfolio.findAll({
  where: { user_id: 1 },
  include: ['holdings']
});

// 自动生成的SQL
// SELECT p.*, h.* FROM portfolios p 
// LEFT JOIN holdings h ON p.id = h.portfolio_id 
// WHERE p.user_id = 1
```

#### ✏️ **更新 (Update)**
```javascript
// JavaScript代码
await portfolio.update({ total_value: 55000.00 });

// 自动生成的SQL
// UPDATE portfolios SET total_value = 55000.00, updated_at = NOW() 
// WHERE id = ?
```

#### 🗑️ **删除 (Delete)**
```javascript
// JavaScript代码
await portfolio.destroy();

// 自动生成的SQL
// DELETE FROM portfolios WHERE id = ?
```

## 🔒 安全特性

### 1. **参数化查询**
```javascript
// ✅ 安全 - 防止SQL注入
const user = await User.findOne({
  where: { email: userInput } // 自动转义
});

// ❌ 危险 - 容易SQL注入
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

### 2. **数据验证**
```javascript
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true,  // 自动验证邮箱格式
      notEmpty: true
    }
  }
});
```

## 📊 连接池管理

```javascript
const sequelize = new Sequelize(database, username, password, {
  pool: {
    max: 5,        // 最大连接数
    min: 0,        // 最小连接数
    acquire: 30000, // 获取连接超时
    idle: 10000    // 连接空闲超时
  }
});
```

**连接池原理**:
1. 预先创建多个数据库连接
2. 请求时从池中获取可用连接
3. 使用完毕后归还到池中
4. 避免频繁创建/销毁连接的开销

## 🎯 最佳实践

### 1. **模型文件组织**
```
models/
├── index.js      # 模型关联和导出
├── User.js       # 用户模型
├── Portfolio.js  # 投资组合模型
└── Holding.js    # 持仓模型
```

### 2. **事务处理**
```javascript
const transaction = await sequelize.transaction();
try {
  await Portfolio.create(portfolioData, { transaction });
  await Holding.bulkCreate(holdingsData, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### 3. **性能优化**
```javascript
// 使用索引
name: {
  type: DataTypes.STRING,
  unique: true  // 自动创建唯一索引
}

// 预加载关联数据
const portfolios = await Portfolio.findAll({
  include: ['holdings', 'user']  // 避免N+1查询
});
```

## 🚀 部署配置

### 开发环境
```javascript
{
  dialect: 'mysql',
  logging: console.log,  // 显示SQL日志
  host: 'localhost'
}
```

### 生产环境
```javascript
{
  dialect: 'mysql',
  logging: false,        // 关闭SQL日志
  host: process.env.DB_HOST,
  ssl: true,            // 启用SSL
  pool: { max: 20 }     // 增加连接池大小
}
```

## 🔍 调试技巧

1. **开启SQL日志**: `logging: console.log`
2. **使用事务**: 确保数据一致性
3. **索引优化**: 为常查询字段添加索引
4. **连接池监控**: 监控连接池使用情况

这就是JavaScript通过ORM框架操作MySQL的完整原理！ 🎉 