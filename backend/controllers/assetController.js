const assetService = require('../services/assetService');

// 🎯 错误类型映射 - 这是Controller应该处理的
const ERROR_MAPPINGS = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

// 🔄 根据错误信息返回适当的HTTP状态码
const getErrorStatusCode = (errorMessage) => {
  if (errorMessage.includes('无效') || 
      errorMessage.includes('缺少必填字段') || 
      errorMessage.includes('必须大于0')) {
    return ERROR_MAPPINGS.VALIDATION_ERROR;
  }
  
  if (errorMessage.includes('不存在') || 
      errorMessage.includes('未找到')) {
    return ERROR_MAPPINGS.NOT_FOUND;
  }
  
  if (errorMessage.includes('已存在') || 
      errorMessage.includes('冲突')) {
    return ERROR_MAPPINGS.CONFLICT;
  }
  
  return ERROR_MAPPINGS.SERVER_ERROR;
};

// 🎯 标准化响应格式
const sendSuccess = (res, data, message, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

const sendError = (res, error, statusCode = 500) => {
  console.error('API错误:', error);
  res.status(statusCode).json({
    success: false,
    error: error.message || '服务器内部错误'
  });
};

class AssetController {
  /**
   * 获取投资组合的分类资产
   * GET /api/assets/portfolio/:portfolioId
   */
  async getPortfolioAssets(req, res) {
    try {
      const portfolioId = parseInt(req.params.portfolioId);
      
      const result = await assetService.getPortfolioAssets(portfolioId);
      
      sendSuccess(res, result);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 创建新资产
   * POST /api/assets
   */
  async createAsset(req, res) {
    try {
      const assetData = req.body;
      
      const asset = await assetService.createAsset(assetData);
      
      sendSuccess(res, asset, '资产创建成功', 201);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 删除资产
   * DELETE /api/assets/:id
   */
  async deleteAsset(req, res) {
    try {
      const assetId = parseInt(req.params.id);
      
      const result = await assetService.deleteAsset(assetId);
      
      sendSuccess(res, result.deletedAsset, result.message);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 更新资产
   * PUT /api/assets/:id
   */
  async updateAsset(req, res) {
    try {
      const assetId = parseInt(req.params.id);
      const updateData = req.body;
      
      const asset = await assetService.updateAsset(assetId, updateData);
      
      sendSuccess(res, asset, '资产更新成功');
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 更新资产价格
   * POST /api/assets/update-prices
   */
  async updateAssetPrices(req, res) {
    try {
      const portfolioId = parseInt(req.body.portfolioId);
      
      const result = await assetService.updateAssetPrices(portfolioId);
      
      sendSuccess(res, result, result.message);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }
}

module.exports = new AssetController(); 