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
        
        assetsByType[asset.asset_type].assets.push({
          ...asset.toJSON(),
          currentValue,
          gainLoss,
          gainLossPercent: asset.getGainLossPercent()
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
        throw new Error(`资产 ${symbol} 已存在于该投资组合中`);
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
}

module.exports = new AssetService(); 