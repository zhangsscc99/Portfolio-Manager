const express = require("express");
const {
  TushareRequestError,
  queryRepurchases,
  resolveCompany,
  searchCompanies,
} = require("../services/tushareService");

const router = express.Router();

const MAX_RANGE_DAYS = 366 * 5;
const DEFAULT_PAGE_SIZE = 20;

class BuybackRequestError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.name = "BuybackRequestError";
    this.status = status;
    this.details = details;
  }
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new BuybackRequestError(`${fieldName} 必须使用 YYYY-MM-DD 格式`, 400);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
    throw new BuybackRequestError(`${fieldName} 不是有效日期`, 400);
  }
  return date;
}

function currentChinaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeDateRange(from, to) {
  const endDate = to || currentChinaDate();
  const startDate =
    from ||
    formatDate(
      new Date(new Date(`${endDate}T00:00:00Z`).getTime() - 365 * 86400000),
    );
  const fromDate = parseDate(startDate, "from");
  const toDate = parseDate(endDate, "to");
  if (fromDate > toDate) {
    throw new BuybackRequestError("开始日期不能晚于结束日期", 400);
  }
  const rangeDays = Math.ceil((toDate - fromDate) / 86400000);
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new BuybackRequestError("单次查询时间范围不能超过 5 年", 400);
  }
  return { from: startDate, to: endDate };
}

function formatAnnDate(value) {
  const digits = String(value || "");
  if (/^\d{8}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return digits || null;
}

function mapStage(proc) {
  const text = String(proc || "");
  if (/完成|结果|期限届满|注销/.test(text)) return "completion";
  if (/实施|进展/.test(text)) return "progress";
  if (/股东大会|董事会|预案|方案|通过/.test(text)) return "plan";
  return "other";
}

function normalizeItem(row, company, index) {
  const annDate = formatAnnDate(row.ann_date);
  const proc = row.proc || "";
  const low = row.low_limit ?? null;
  const high = row.high_limit ?? null;
  return {
    id: `${row.ts_code}-${row.ann_date}-${index}`,
    code: company.code,
    tsCode: row.ts_code,
    companyName: company.name,
    title: `${annDate || ""} 回购进展：${proc || "公告"}`.trim(),
    publishTime: annDate,
    category: "share_buyback",
    stage: mapStage(proc),
    proc,
    quantity: row.vol ?? null,
    amount: row.amount ?? null,
    priceRange:
      low != null || high != null ? { low, high } : null,
    expDate: formatAnnDate(row.exp_date),
    endDate: formatAnnDate(row.end_date),
    attachment: null,
    pdfUrl: null,
    detailUrl: null,
    announcementUrl: null,
    source: "Tushare",
  };
}

// 对时间倒序（新->旧）的条目，向前沿用同公司最近一次非空的 amount/vol，
// 作为「累计已回购」展示；整条区间无非空值则保持 null。
function applyCarriedForward(items) {
  let lastAmount = null;
  let lastVol = null;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item.amount != null) {
      lastAmount = item.amount;
      item.amount_source = "native";
    } else if (lastAmount != null) {
      item.amount = lastAmount;
      item.amount_source = "carried_forward";
    } else {
      item.amount_source = null;
    }
    if (item.quantity != null) {
      lastVol = item.quantity;
      item.quantity_source = "native";
    } else if (lastVol != null) {
      item.quantity = lastVol;
      item.quantity_source = "carried_forward";
    } else {
      item.quantity_source = null;
    }
  }
  return items;
}

async function queryBuybacks({
  company,
  from,
  to,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  searchKey = "回购",
} = {}) {
  const normalizedRange = normalizeDateRange(from, to);
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedPageSize = Math.min(
    50,
    Math.max(1, Number.parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
  );
  const resolvedCompany = await resolveCompany(company);
  const keyword = String(searchKey || "回购").trim().slice(0, 50);

  const { items: rawItems, fetchedAt, cached, truncated } =
    await queryRepurchases({
      code: resolvedCompany.code,
      tsCode: resolvedCompany.tsCode,
      from: normalizedRange.from,
      to: normalizedRange.to,
    });

  const allItems = applyCarriedForward(
    rawItems.map((row, index) => normalizeItem(row, resolvedCompany, index)),
  );
  const filtered = keyword
    ? allItems.filter(
        (item) =>
          item.title.includes(keyword) ||
          String(item.proc || "").includes(keyword),
      )
    : allItems;

  const total = filtered.length;
  const totalPages = Math.ceil(total / normalizedPageSize) || 0;
  const offset = (normalizedPage - 1) * normalizedPageSize;
  const items = filtered.slice(offset, offset + normalizedPageSize);

  const amounts = filtered
    .map((item) => item.amount)
    .filter((value) => value != null && Number.isFinite(Number(value)));
  const totalAmount = amounts.length
    ? amounts.reduce((sum, value) => sum + Number(value), 0)
    : null;
  const quantities = filtered
    .map((item) => item.quantity)
    .filter((value) => value != null && Number.isFinite(Number(value)));
  const totalQuantity = quantities.length
    ? quantities.reduce((sum, value) => sum + Number(value), 0)
    : null;

  return {
    company: resolvedCompany,
    query: {
      from: normalizedRange.from,
      to: normalizedRange.to,
      searchKey: keyword,
      truncated: truncated === true,
    },
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total,
      totalPages,
      hasPrevious: normalizedPage > 1,
      hasNext: normalizedPage < totalPages,
    },
    summary: {
      scope: "all_results",
      returned: items.length,
      shareBuyback: total,
      equityIncentiveRepurchase: 0,
      other: 0,
      totalQuantity,
      totalAmount,
      latestAnnDate: filtered.length ? filtered[0].publishTime : null,
    },
    items,
    source: {
      name: "Tushare 股票回购数据",
      url: "https://tushare.pro",
      fetchedAt,
      note: "覆盖沪深北全市场回购记录；数量单位为股、金额单位为元。",
    },
    cached,
  };
}

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
    const status =
      error instanceof TushareRequestError ||
      error instanceof BuybackRequestError
        ? error.status
        : 500;
    res.status(status).json({
      success: false,
      error: error.message || "查询回购公告失败",
      ...(error.details || {}),
    });
  }
});

router.get("/companies", async (req, res) => {
  try {
    const candidates = await searchCompanies(req.query.q || "", 10);
    res.json({ success: true, data: { candidates } });
  } catch (error) {
    const status = error instanceof TushareRequestError ? error.status : 500;
    res.status(status).json({
      success: false,
      error: error.message || "公司联想查询失败",
    });
  }
});

router.get("/announcement/:id", async (req, res) => {
  res.status(501).json({
    success: false,
    error: "Tushare 数据源暂不提供公告详情接口",
  });
});

module.exports = router;
