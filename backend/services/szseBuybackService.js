const dns = require("node:dns");
const https = require("node:https");

dns.setDefaultResultOrder("ipv4first");

const SZSE_BASE_URL = "https://www.szse.cn";
const DISCLOSURE_STATIC_URL = "https://disc.static.szse.cn";
const TYPEAHEAD_TYPES = "ZA||XA||DM||BG||CY||EB||[zzss]||[ts]";
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20 * 1000;
const MAX_RANGE_DAYS = 3650;
const cache = new Map();

class SzseRequestError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = "SzseRequestError";
    this.status = status;
    this.details = details;
  }
}

function setCache(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 200) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

async function requestJson(url, options = {}) {
  const target = url instanceof URL ? url : new URL(url);
  const body = options.body ? Buffer.from(options.body) : null;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: options.method || "GET",
        family: 4,
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "zh-CN,zh;q=0.9",
          Connection: "keep-alive",
          Referer: `${SZSE_BASE_URL}/disclosure/listed/notice/index.html`,
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36 Openfolio/1.0",
          ...(body ? { "Content-Length": String(body.length) } : {}),
          ...(options.headers || {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          if (
            !response.statusCode ||
            response.statusCode < 200 ||
            response.statusCode >= 300
          ) {
            reject(
              new SzseRequestError(
                `深圳证券交易所接口返回 HTTP ${response.statusCode}`,
                502,
              ),
            );
            return;
          }

          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (payload?.code && payload.code !== "0" && payload.code !== 0) {
              reject(
                new SzseRequestError(
                  payload.msg || "深圳证券交易所接口返回错误",
                  502,
                  payload,
                ),
              );
              return;
            }
            resolve(payload);
          } catch {
            reject(new SzseRequestError("深交所接口返回了无效 JSON", 502));
          }
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(
        Object.assign(new Error("request timeout"), { code: "ETIMEDOUT" }),
      );
    });
    request.on("error", (error) => {
      reject(
        new SzseRequestError(
          `无法连接深圳证券交易所接口: ${error.message}${
            error.code ? ` (${error.code})` : ""
          }`,
          error.code === "ETIMEDOUT" ? 504 : 502,
        ),
      );
    });
    if (body) request.write(body);
    request.end();
  });
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new SzseRequestError(`${fieldName} 必须使用 YYYY-MM-DD 格式`, 400);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
    throw new SzseRequestError(`${fieldName} 不是有效日期`, 400);
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
    formatDate(new Date(new Date(`${endDate}T00:00:00Z`).getTime() - 365 * 86400000));
  const fromDate = parseDate(startDate, "from");
  const toDate = parseDate(endDate, "to");
  if (fromDate > toDate) {
    throw new SzseRequestError("开始日期不能晚于结束日期", 400);
  }
  const rangeDays = Math.ceil((toDate - fromDate) / 86400000);
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new SzseRequestError("单次查询时间范围不能超过 10 年", 400);
  }
  return { from: startDate, to: endDate };
}

async function resolveCompany(companyQuery) {
  const input = String(companyQuery || "").trim();
  if (!input) {
    throw new SzseRequestError("请输入公司代码、简称或拼音", 400);
  }

  const url = new URL(`${SZSE_BASE_URL}/api/report/shortname/gethangqing`);
  url.searchParams.set("dataType", TYPEAHEAD_TYPES);
  url.searchParams.set("input", input);
  const payload = await requestJson(url);
  const candidates = Array.isArray(payload.data)
    ? payload.data.filter((item) => item?.code && item?.name)
    : [];
  if (candidates.length === 0) {
    throw new SzseRequestError(`未找到深市上市公司：${input}`, 404);
  }

  const exactMatches = candidates.filter(
    (item) =>
      item.code === input ||
      item.name === input ||
      item.pinyinString === input ||
      item.pingyinall === input,
  );
  const match =
    exactMatches.length === 1
      ? exactMatches[0]
      : candidates.length === 1
        ? candidates[0]
        : null;

  if (!match) {
    throw new SzseRequestError(
      `公司查询存在多个匹配项，请使用 6 位股票代码或完整公司简称`,
      409,
      {
        candidates: candidates.slice(0, 10).map((item) => ({
          code: item.code,
          name: item.name,
          pinyin: item.pinyinString || "",
          pinyinFull: item.pingyinall || "",
        })),
      },
    );
  }

  return {
    code: match.code,
    name: match.name,
    pinyin: match.pinyinString || "",
    pinyinFull: match.pingyinall || "",
    englishName: match.enjc || "",
  };
}

function classifyAnnouncement(title) {
  if (/限制性股票|股权激励|激励计划|授予|归属|作废/.test(title)) {
    return "equity_incentive_repurchase";
  }
  if (/回购/.test(title)) {
    return "share_buyback";
  }
  return "other";
}

function classifyStage(title) {
  if (/法律意见/.test(title)) return "legal_opinion";
  if (/方案|预案|董事会决议/.test(title)) return "plan";
  if (/进展/.test(title)) return "progress";
  if (/完成|期限届满/.test(title)) return "completion";
  if (/价格.*(调整|上限)/.test(title)) return "price_adjustment";
  if (/注销/.test(title)) return "cancellation";
  return "other";
}

function normalizeAnnouncement(item) {
  const category = classifyAnnouncement(item.title || "");
  const announcementUrl = item.id
    ? `${SZSE_BASE_URL}/disclosure/listed/bulletinDetail/index.html?${item.id}`
    : null;
  return {
    id: item.id,
    annId: item.annId,
    code: item.secCode?.[0] || "",
    companyName: item.secName?.[0] || "",
    title: item.title || "",
    publishTime: item.publishTime || "",
    category,
    stage: classifyStage(item.title || ""),
    attachment: item.attachPath
      ? {
          format: String(item.attachFormat || "").toLowerCase(),
          sizeKb: item.attachSize || null,
          url: `${DISCLOSURE_STATIC_URL}${item.attachPath}`,
        }
      : null,
    announcementUrl,
    source: "深圳证券交易所",
  };
}

async function queryBuybacks({
  company,
  from,
  to,
  page = 1,
  pageSize = 20,
  searchKey = "回购",
} = {}) {
  const normalizedRange = normalizeDateRange(from, to);
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedPageSize = Math.min(
    50,
    Math.max(1, Number.parseInt(pageSize, 10) || 20),
  );
  const resolvedCompany = await resolveCompany(company);
  const keyword = String(searchKey || "回购").trim().slice(0, 50);

  const cacheKey = JSON.stringify([
    resolvedCompany.code,
    normalizedRange.from,
    normalizedRange.to,
    normalizedPage,
    normalizedPageSize,
    keyword,
  ]);
  const cached = getCache(cacheKey);
  if (cached) return { ...cached, cached: true };

  const requestBody = {
    seDate: [normalizedRange.from, normalizedRange.to],
    stock: [resolvedCompany.code],
    channelCode: ["listedNotice_disc"],
    pageSize: normalizedPageSize,
    pageNum: normalizedPage,
    searchKey: [keyword],
    sortName: ["time"],
    sortType: ["desc"],
  };

  const payload = await requestJson(
    `${SZSE_BASE_URL}/api/disc/announcement/annList`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  const items = (Array.isArray(payload.data) ? payload.data : []).map(
    normalizeAnnouncement,
  );
  const total = Number(payload.announceCount ?? payload.recordCount ?? items.length);
  const totalPages = Math.ceil(total / normalizedPageSize);

  const result = {
    company: resolvedCompany,
    query: {
      from: normalizedRange.from,
      to: normalizedRange.to,
      searchKey: keyword,
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
      scope: "current_page",
      returned: items.length,
      shareBuyback: items.filter((item) => item.category === "share_buyback")
        .length,
      equityIncentiveRepurchase: items.filter(
        (item) => item.category === "equity_incentive_repurchase",
      ).length,
      other: items.filter((item) => item.category === "other").length,
    },
    items,
    source: {
      name: "深圳证券交易所披露平台",
      url: `${SZSE_BASE_URL}/disclosure/listed/notice/index.html`,
      fetchedAt: new Date().toISOString(),
      note: "公告内容以交易所 PDF 原文为准；分类为关键词辅助结果。",
    },
    cached: false,
  };

  setCache(cacheKey, result);
  return result;
}

async function getAnnouncement(uuid) {
  const normalized = String(uuid || "").trim();
  if (!/^[0-9a-f-]{20,}$/i.test(normalized)) {
    throw new SzseRequestError("公告 UUID 格式不正确", 400);
  }
  const payload = await requestJson(
    `${SZSE_BASE_URL}/api/disc/announcement/bulletin_detail/${normalized}`,
  );
  return normalizeAnnouncement({ ...payload, id: payload.id || normalized });
}

module.exports = {
  SzseRequestError,
  getAnnouncement,
  queryBuybacks,
  resolveCompany,
};
