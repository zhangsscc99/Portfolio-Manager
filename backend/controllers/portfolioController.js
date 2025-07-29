const portfolioService = require('../services/portfolioService');

// 🎯 错误类型映射
const ERROR_MAPPINGS = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

// 🔄 根据错误信息返回适当的HTTP状态码
const getErrorStatusCode = (errorMessage) => {
  if (errorMessage.includes('无效') || 
      errorMessage.includes('缺少必填字段')) {
    return ERROR_MAPPINGS.VALIDATION_ERROR;
  }
  
  if (errorMessage.includes('不存在') || 
      errorMessage.includes('未找到') ||
      errorMessage.includes('No portfolio found')) {
    return ERROR_MAPPINGS.NOT_FOUND;
  }
  
  if (errorMessage.includes('已存在')) {
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

class PortfolioController {
  /**
   * 获取所有投资组合
   * GET /api/portfolio
   */
  async getAllPortfolios(req, res) {
    try {
      const portfolios = await portfolioService.getAllPortfolios();
      sendSuccess(res, portfolios);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 获取当前投资组合 (最新的)
   * GET /api/portfolio/current
   */
  async getCurrentPortfolio(req, res) {
    try {
      // 🎯 现在调用Service层，不再在Controller做复杂计算
      const portfolioData = await portfolioService.getPortfolioDetails();
      
      sendSuccess(res, portfolioData);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 根据ID获取投资组合
   * GET /api/portfolio/:id
   */
  async getPortfolioById(req, res) {
    try {
      const portfolioId = parseInt(req.params.id);
      
      const portfolioData = await portfolioService.getPortfolioDetails(portfolioId);
      
      sendSuccess(res, portfolioData);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 创建新投资组合
   * POST /api/portfolio
   */
  async createPortfolio(req, res) {
    try {
      const portfolioData = req.body;
      
      const portfolio = await portfolioService.createPortfolio(portfolioData);
      
      sendSuccess(res, portfolio, '投资组合创建成功', 201);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 更新投资组合
   * PUT /api/portfolio/:id
   */
  async updatePortfolio(req, res) {
    try {
      const portfolioId = parseInt(req.params.id);
      const updateData = req.body;
      
      const portfolio = await portfolioService.updatePortfolio(portfolioId, updateData);
      
      sendSuccess(res, portfolio, '投资组合更新成功');
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 删除投资组合
   * DELETE /api/portfolio/:id
   */
  async deletePortfolio(req, res) {
    try {
      const portfolioId = parseInt(req.params.id);
      
      const result = await portfolioService.deletePortfolio(portfolioId);
      
      sendSuccess(res, result, '投资组合删除成功');
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }

  /**
   * 获取投资组合重新平衡建议
   * POST /api/portfolio/:id/rebalance
   */
  async getRebalanceRecommendations(req, res) {
    try {
      const portfolioId = parseInt(req.params.id);
      const { targetAllocation } = req.body;
      
      const recommendations = await portfolioService.generateRebalanceRecommendations(
        portfolioId, 
        targetAllocation
      );
      
      sendSuccess(res, recommendations);
    } catch (error) {
      const statusCode = getErrorStatusCode(error.message);
      sendError(res, error, statusCode);
    }
  }
}

module.exports = new PortfolioController(); 