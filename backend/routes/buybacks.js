const express = require("express");
const {
  getAnnouncement,
  queryBuybacks,
  SzseRequestError,
} = require("../services/szseBuybackService");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await queryBuybacks({
      company: req.query.company || req.query.symbol || req.query.q,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: req.query.pageSize,
      searchKey: req.query.keyword,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof SzseRequestError ? error.status : 500;
    res.status(status).json({
      success: false,
      error: error.message || "查询回购公告失败",
      ...(error.details || {}),
    });
  }
});

router.get("/announcement/:uuid", async (req, res) => {
  try {
    const announcement = await getAnnouncement(req.params.uuid);
    res.json({ success: true, data: announcement });
  } catch (error) {
    const status = error instanceof SzseRequestError ? error.status : 500;
    res.status(status).json({
      success: false,
      error: error.message || "查询公告详情失败",
    });
  }
});

module.exports = router;
