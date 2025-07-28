const { v4: uuidv4 } = require('uuid');

class Portfolio {
  constructor(name = 'My Portfolio', description = '') {
    this.id = uuidv4();
    this.name = name;
    this.description = description;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.totalValue = 0;
    this.cash = 0;
    this.dayChange = 0;
    this.dayChangePercent = 0;
    this.holdings = [];
  }

  addHolding(holding) {
    this.holdings.push(holding);
    this.updateTotalValue();
    this.updatedAt = new Date().toISOString();
  }

  removeHolding(holdingId) {
    this.holdings = this.holdings.filter(h => h.id !== holdingId);
    this.updateTotalValue();
    this.updatedAt = new Date().toISOString();
  }

  updateHolding(holdingId, updates) {
    const holdingIndex = this.holdings.findIndex(h => h.id === holdingId);
    if (holdingIndex !== -1) {
      this.holdings[holdingIndex] = { ...this.holdings[holdingIndex], ...updates };
      this.updateTotalValue();
      this.updatedAt = new Date().toISOString();
    }
  }

  updateTotalValue() {
    this.totalValue = this.cash + this.holdings.reduce((total, holding) => {
      return total + (holding.currentPrice * holding.quantity);
    }, 0);
  }

  getPerformance() {
    const totalCost = this.holdings.reduce((total, holding) => {
      return total + (holding.avgPrice * holding.quantity);
    }, 0);
    
    const totalGainLoss = this.totalValue - this.cash - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      totalValue: this.totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      cash: this.cash
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      totalValue: this.totalValue,
      cash: this.cash,
      dayChange: this.dayChange,
      dayChangePercent: this.dayChangePercent,
      holdings: this.holdings,
      performance: this.getPerformance()
    };
  }
}

module.exports = Portfolio; 