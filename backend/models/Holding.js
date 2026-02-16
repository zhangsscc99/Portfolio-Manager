const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 🏢 定义Holding表 - 持仓数据
const Holding = sequelize.define('Holding', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  symbol: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: '股票代码 (如: AAPL, MSFT)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '股票名称'
  },
  type: {
    type: DataTypes.ENUM('stock', 'bond', 'etf', 'crypto', 'cash'),
    defaultValue: 'stock',
    comment: '投资类型'
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 8),
    allowNull: false,
    comment: '持仓数量'
  },
  avg_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '平均买入价格'
  },
  current_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '当前市场价格'
  },
  portfolio_id: {
    type: DataTypes.INTEGER,
    allowNull: false, // 必须属于某个投资组合
    references: {
      model: 'portfolios',  // 外键关联到portfolios表
      key: 'id'
    },
    onDelete: 'CASCADE',  // 删除投资组合时自动删除持仓
    comment: '所属投资组合ID'
  }
}, {
  tableName: 'holdings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 💡 业务逻辑方法 - 展示如何在JS中计算金融数据
Holding.prototype.getCurrentValue = function() {
  return parseFloat(this.current_price) * parseFloat(this.quantity);
};

Holding.prototype.getCostBasis = function() {
  return parseFloat(this.avg_price) * parseFloat(this.quantity);
};

// Keep backward compatibility with service layer naming.
Holding.prototype.getTotalCost = function() {
  return this.getCostBasis();
};

Holding.prototype.getGainLoss = function() {
  return this.getCurrentValue() - this.getCostBasis();
};

Holding.prototype.getGainLossPercent = function() {
  const costBasis = this.getCostBasis();
  return costBasis > 0 ? (this.getGainLoss() / costBasis) * 100 : 0;
};

Holding.prototype.getPriceChange = function() {
  return parseFloat(this.current_price) - parseFloat(this.avg_price);
};

Holding.prototype.updatePrice = async function(newPrice) {
  this.current_price = parseFloat(newPrice);
  await this.save();
};

module.exports = Holding; 
