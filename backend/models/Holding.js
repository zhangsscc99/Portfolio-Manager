const { v4: uuidv4 } = require('uuid');

class Holding {
  constructor({
    symbol,
    name,
    type = 'stock', // stock, bond, etf, crypto, cash
    quantity,
    avgPrice,
    currentPrice = null
  }) {
    this.id = uuidv4();
    this.symbol = symbol.toUpperCase();
    this.name = name;
    this.type = type;
    this.quantity = parseFloat(quantity);
    this.avgPrice = parseFloat(avgPrice);
    this.currentPrice = currentPrice ? parseFloat(currentPrice) : parseFloat(avgPrice);
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  getCurrentValue() {
    return this.currentPrice * this.quantity;
  }

  getCostBasis() {
    return this.avgPrice * this.quantity;
  }

  getGainLoss() {
    return this.getCurrentValue() - this.getCostBasis();
  }

  getGainLossPercent() {
    const costBasis = this.getCostBasis();
    return costBasis > 0 ? (this.getGainLoss() / costBasis) * 100 : 0;
  }

  getDayChange() {
    // This would typically come from market data API
    return (Math.random() - 0.5) * this.currentPrice * 0.05; // Mock day change
  }

  getDayChangePercent() {
    const dayChange = this.getDayChange();
    return this.currentPrice > 0 ? (dayChange / this.currentPrice) * 100 : 0;
  }

  updatePrice(newPrice) {
    this.currentPrice = parseFloat(newPrice);
    this.updatedAt = new Date().toISOString();
  }

  addShares(quantity, price) {
    const currentValue = this.getCostBasis();
    const newValue = quantity * price;
    this.quantity += quantity;
    this.avgPrice = (currentValue + newValue) / this.quantity;
    this.updatedAt = new Date().toISOString();
  }

  removeShares(quantity) {
    if (quantity >= this.quantity) {
      this.quantity = 0;
    } else {
      this.quantity -= quantity;
    }
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      symbol: this.symbol,
      name: this.name,
      type: this.type,
      quantity: this.quantity,
      avgPrice: this.avgPrice,
      currentPrice: this.currentPrice,
      currentValue: this.getCurrentValue(),
      costBasis: this.getCostBasis(),
      gainLoss: this.getGainLoss(),
      gainLossPercent: this.getGainLossPercent(),
      dayChange: this.getDayChange(),
      dayChangePercent: this.getDayChangePercent(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Holding; 