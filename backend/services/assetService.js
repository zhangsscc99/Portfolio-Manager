const { Asset, Portfolio } = require('../models/index');
const yahooFinanceService = require('./yahooFinance');
const cryptoService = require('./cryptoService');

// 🎯 支持的资产类型配置
const ASSET_TYPES = {
  stock: { name: '股票', icon: '📈', priceSource: 'yahoo_finance' },
  crypto: { name: '加密货币', icon: '₿', priceSource: 'coingecko' },
  etf: { name: 'ETF基金', icon: '🏛️', priceSource: 'yahoo_finance' },
  bond: { name: '债券', icon: '📜', priceSource: 'manual' },
  cash: { name: '现金', icon: '💰', priceSource: 'manual' },
  commodity: { name: '商品', icon: '🥇', priceSource: 'manual' }
};

class AssetService {
  /**
   * 获取投资组合的分类资产
   * @param {number} portfolioId - 投资组合ID
   * @returns {Object} 分类后的资产数据
   */
  async getPortfolioAssets(portfolioId) {
    try {
      // 验证投资组合是否存在
      const portfolio = await Portfolio.findByPk(portfolioId);
      if (!portfolio) {
        throw new Error('投资组合不存在');
      }

      // 获取所有资产
      const assets = await Asset.findAll({
        where: { 
          portfolio_id: portfolioId,
          is_active: true 
        },
        order: [['asset_type', 'ASC'], ['symbol', 'ASC']]
      });
      
      // 按资产类型分组
      const assetsByType = {};
      let totalValue = 0;
      
      Object.keys(ASSET_TYPES).forEach(type => {
        assetsByType[type] = {
          ...ASSET_TYPES[type],
          assets: [],
          totalValue: 0,
          totalGainLoss: 0,
          count: 0
        };
      });
      
      assets.forEach(asset => {
        const currentValue = asset.getCurrentValue();
        const gainLoss = asset.getGainLoss();
        
        // 🔄 获取日变化数据（如果可用）
        let dailyChange = 0;
        let dailyChangePercent = 0;
        
        // 对于股票和ETF，尝试从缓存或最近的API调用中获取日变化
        if ((asset.asset_type === 'stock' || asset.asset_type === 'etf') && asset.price_source === 'yahoo_finance') {
          // 尝试从Yahoo Finance缓存中获取日变化数据
          const cachedData = yahooFinanceService.getCachedData(asset.source_symbol || asset.symbol);
          if (cachedData && cachedData.change !== undefined) {
            dailyChange = parseFloat(cachedData.change) || 0;
            dailyChangePercent = parseFloat(cachedData.changePercent) || 0;
            console.log(`📊 ${asset.symbol}: 使用缓存数据 change=${dailyChange}, changePercent=${dailyChangePercent}%`);
          } else {
            console.log(`⚠️ ${asset.symbol}: 没有缓存的日变化数据`);
          }
        }
        // 对于加密货币，尝试从CoinGecko获取日变化
        else if (asset.asset_type === 'crypto' && asset.price_source === 'coingecko') {
          const cachedData = cryptoService.getCachedData(asset.source_symbol);
          if (cachedData && cachedData.change !== undefined) {
            dailyChange = cachedData.change;
            dailyChangePercent = cachedData.changePercent;
          }
        }
        
        assetsByType[asset.asset_type].assets.push({
          ...asset.toJSON(),
          currentValue,
          gainLoss,
          gainLossPercent: asset.getGainLossPercent(),
          dailyChange: dailyChange,
          changePercent: dailyChangePercent
        });
        
        assetsByType[asset.asset_type].totalValue += currentValue;
        assetsByType[asset.asset_type].totalGainLoss += gainLoss;
        assetsByType[asset.asset_type].count++;
        
        totalValue += currentValue;
      });
      
      return {
        assetsByType,
        totalValue,
        totalAssets: assets.length,
        summary: Object.keys(assetsByType).map(type => ({
          type,
          ...assetsByType[type],
          assets: undefined // 不在摘要中包含详细资产
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 创建新资产
   * @param {Object} assetData - 资产数据
   * @returns {Object} 创建的资产
   */
  async createAsset(assetData) {
    try {
      const {
        symbol,
        name,
        asset_type,
        quantity,
        avg_cost,
        current_price,
        historical_avg_price,
        currency = 'USD',
        exchange,
        portfolio_id,
        purchase_date,
        notes
      } = assetData;

      // 业务验证
      if (!symbol || !name || !asset_type || !quantity || !avg_cost || !portfolio_id) {
        throw new Error('缺少必填字段：symbol, name, asset_type, quantity, avg_cost, portfolio_id');
      }

      // 验证资产类型
      if (!ASSET_TYPES[asset_type]) {
        throw new Error(`不支持的资产类型: ${asset_type}`);
      }

      // 验证投资组合是否存在
      const portfolio = await Portfolio.findByPk(portfolio_id);
      if (!portfolio) {
        throw new Error('投资组合不存在');
      }

      // 检查是否已存在相同资产
      const existingAsset = await Asset.findOne({
        where: {
          symbol: symbol.toUpperCase(),
          asset_type,
          portfolio_id,
          is_active: true
        }
      });

      if (existingAsset) {
        // 如果资产已存在，则累加数量并重新计算平均成本
        console.log(`📈 资产 ${symbol} 已存在，累加数量并重新计算平均成本...`);
        
        const originalQuantity = parseFloat(existingAsset.quantity);
        const originalAvgCost = parseFloat(existingAsset.avg_cost);
        const newQuantity = parseFloat(quantity);
        const newAvgCost = parseFloat(avg_cost);
        
        // 计算总数量
        const totalQuantity = originalQuantity + newQuantity;
        
        // 计算新的加权平均成本
        const originalTotalValue = originalQuantity * originalAvgCost;
        const newTotalValue = newQuantity * newAvgCost;
        const combinedTotalValue = originalTotalValue + newTotalValue;
        const weightedAvgCost = combinedTotalValue / totalQuantity;
        
        // 更新现有资产
        await existingAsset.update({
          quantity: totalQuantity,
          avg_cost: weightedAvgCost,
          // 如果提供了新的当前价格，也更新它
          current_price: current_price ? parseFloat(current_price) : existingAsset.current_price,
          // 如果提供了新的历史平均价格，也更新它
          historical_avg_price: historical_avg_price ? parseFloat(historical_avg_price) : existingAsset.historical_avg_price,
          // 更新购买日期为最新的购买日期
          purchase_date: purchase_date || existingAsset.purchase_date,
          // 合并备注信息
          notes: notes ? `${existingAsset.notes || ''}\n${new Date().toLocaleDateString()}: +${newQuantity} @ $${newAvgCost}${notes ? ` (${notes})` : ''}`.trim() : existingAsset.notes
        });
        
        console.log(`✅ 资产 ${symbol} 更新成功: 数量 ${originalQuantity} + ${newQuantity} = ${totalQuantity}, 平均成本: $${originalAvgCost.toFixed(2)} → $${weightedAvgCost.toFixed(2)}`);
        
        return existingAsset.reload(); // 重新加载以获取最新数据
      }

      // 根据资产类型设置价格源
      const priceSource = ASSET_TYPES[asset_type].priceSource;
      let sourceSymbol = symbol;
      
      // 对于加密货币，需要转换symbol
      if (asset_type === 'crypto') {
        sourceSymbol = symbol.toLowerCase();
      }
      
      const asset = await Asset.create({
        symbol: symbol.toUpperCase(),
        name,
        asset_type,
        quantity: parseFloat(quantity),
        avg_cost: parseFloat(avg_cost),
        current_price: current_price ? parseFloat(current_price) : parseFloat(avg_cost),
        historical_avg_price: historical_avg_price ? parseFloat(historical_avg_price) : null,
        currency,
        exchange,
        price_source: priceSource,
        source_symbol: sourceSymbol,
        portfolio_id,
        purchase_date,
        notes
      });
      
      return asset;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 删除资产
   * @param {number} assetId - 资产ID
   * @returns {Object} 删除结果
   */
  async deleteAsset(assetId) {
    try {
      // 验证参数
      if (!assetId || isNaN(assetId)) {
        throw new Error('无效的资产ID');
      }

      // 查找资产
      const asset = await Asset.findByPk(assetId);
      if (!asset) {
        throw new Error('资产不存在');
      }

      // 业务逻辑：检查是否可以删除
      // 例如：检查是否有未结算的交易等
      
      // 软删除：标记为非活跃状态
      await asset.update({ is_active: false });
      
      // 或者硬删除
      // await asset.destroy();
      
      return {
        message: '资产删除成功',
        deletedAsset: {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新资产信息
   * @param {number} assetId - 资产ID
   * @param {Object} updateData - 更新数据
   * @returns {Object} 更新后的资产
   */
  async updateAsset(assetId, updateData) {
    try {
      // 验证参数
      if (!assetId || isNaN(assetId)) {
        throw new Error('无效的资产ID');
      }

      const asset = await Asset.findByPk(assetId);
      if (!asset) {
        throw new Error('资产不存在');
      }

      // 业务验证
      if (updateData.quantity !== undefined && updateData.quantity <= 0) {
        throw new Error('数量必须大于0');
      }

      if (updateData.avg_cost !== undefined && updateData.avg_cost <= 0) {
        throw new Error('平均成本必须大于0');
      }

      // 更新资产
      await asset.update(updateData);
      
      return asset;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新资产价格
   * @param {number} portfolioId - 投资组合ID
   * @returns {Object} 更新结果
   */
  async updateAssetPrices(portfolioId) {
    try {
      const assets = await Asset.findAll({
        where: { 
          portfolio_id: portfolioId,
          is_active: true 
        }
      });

      const updatePromises = assets.map(async (asset) => {
        try {
          let newPrice = asset.current_price;

          // 根据价格源更新价格
          if (asset.price_source === 'yahoo_finance') {
            const quote = await yahooFinanceService.getStockPrice(asset.source_symbol);
            if (quote && quote.price) {
              newPrice = quote.price;
            }
          } else if (asset.price_source === 'coingecko') {
            const price = await cryptoService.getCryptoPrice(asset.source_symbol);
            if (price) {
              newPrice = price;
            }
          }

          // 更新价格
          if (newPrice !== asset.current_price) {
            await asset.update({ 
              current_price: newPrice,
              last_updated: new Date()
            });
          }

          return { symbol: asset.symbol, success: true, newPrice };
        } catch (error) {
          console.error(`更新 ${asset.symbol} 价格失败:`, error);
          return { symbol: asset.symbol, success: false, error: error.message };
        }
      });

      const results = await Promise.all(updatePromises);
      
      return {
        message: '价格更新完成',
        results,
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 部分卖出资产
   * @param {number} assetId - 资产ID
   * @param {number} sellQuantity - 卖出数量
   * @returns {Object} 更新结果
   */
  async sellAsset(assetId, sellQuantity) {
    try {
      // 验证参数
      if (!assetId || isNaN(assetId)) {
        throw new Error('无效的资产ID');
      }

      if (!sellQuantity || sellQuantity <= 0) {
        throw new Error('卖出数量必须大于0');
      }

      const asset = await Asset.findByPk(assetId);
      if (!asset) {
        throw new Error('资产不存在');
      }

      const currentQuantity = parseFloat(asset.quantity);
      const sellQty = parseFloat(sellQuantity);

      // 验证卖出数量不超过持有数量
      if (sellQty > currentQuantity) {
        throw new Error(`卖出数量(${sellQty})不能超过持有数量(${currentQuantity})`);
      }

      // 计算剩余数量
      const remainingQuantity = currentQuantity - sellQty;

      // 如果卖光了，直接删除资产
      if (remainingQuantity <= 0) {
        await asset.update({ is_active: false });
        console.log(`🏁 资产 ${asset.symbol} 已全部卖出并标记为非活跃`);
        
        return {
          message: `已卖出全部 ${sellQty} ${asset.symbol}，资产已从投资组合中移除`,
          asset: asset,
          soldQuantity: sellQty,
          remainingQuantity: 0,
          isCompletelyRemoved: true
        };
      } else {
        // 部分卖出，更新数量
        await asset.update({ 
          quantity: remainingQuantity,
          // 添加卖出记录到备注
          notes: `${asset.notes || ''}\n${new Date().toLocaleDateString()}: Sold ${sellQty} shares`.trim()
        });
        
        console.log(`💰 资产 ${asset.symbol} 部分卖出: ${sellQty} 股，剩余: ${remainingQuantity} 股`);
        
        return {
          message: `已卖出 ${sellQty} 股 ${asset.symbol}，剩余 ${remainingQuantity.toFixed(2)} 股`,
          asset: asset.reload(),
          soldQuantity: sellQty,
          remainingQuantity: remainingQuantity,
          isCompletelyRemoved: false
        };
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AssetService();
module.exports.ASSET_TYPES = ASSET_TYPES; 