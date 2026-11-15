const dns = require("node:dns");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

dns.setDefaultResultOrder("ipv4first");

const TUSHARE_BASE_URL = "https://quantdata888.duckdns.org";
const REQUEST_TIMEOUT_MS = 30 * 1000;
const SEGMENT_SLEEP_MS = 200;
const ROW_LIMIT = 2000;
const MAX_SEGMENTS = 120;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const STOCK_BASIC_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STOCK_BASIC_PATH = path.join(__dirname, "..", "data", "stock_basic.json");
const STOCK_BASIC_FIELDS = "ts_code,symbol,name,area,industry,cnspell";

const cache = new Map();
let stockBasicCache = null;

class TushareRequestError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = "TushareRequestError";
    this.status = status;
    this.details = details;
  }
}

function setCache(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getToken() {
  const token = String(process.env.TUSHARE_TOKEN || "").trim();
  if (!token) {
    throw new TushareRequestError("服务未配置 TUSHARE_TOKEN", 500);
  }
  return token;
}

function postJson(body) {
  const payload = Buffer.from(body);
  const target = new URL(TUSHARE_BASE_URL);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname,
        method: "POST",
        family: 4,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": String(payload.length),
          Connection: "keep-alive",
          "User-Agent": "Openfolio/1.0",
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
              Object.assign(
                new TushareRequestError(
                  `Tushare 数据服务返回 HTTP ${response.statusCode}`,
                  502,
                ),
                { retryable: response.statusCode >= 500 },
              ),
            );
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new TushareRequestError("Tushare 数据服务返回了无效 JSON", 502));
          }
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(
        Object.assign(new TushareRequestError("Tushare 数据服务请求超时", 504), {
          retryable: true,
        }),
      );
    });
    request.on("error", (error) => {
      if (error instanceof TushareRequestError) {
        reject(error);
        return;
      }
      reject(
        Object.assign(
          new TushareRequestError(
            `无法连接 Tushare 数据服务: ${error.message}${
              error.code ? ` (${error.code})` : ""
            }`,
            502,
          ),
          { retryable: true },
        ),
      );
    });
    request.write(payload);
    request.end();
  });
}

async function callApi(apiName, params = {}, fields = "") {
  const body = JSON.stringify({
    api_name: apiName,
    token: getToken(),
    params,
    fields,
  });

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = await postJson(body);
      if (payload?.code !== 0) {
        throw new TushareRequestError(
          payload?.msg || `Tushare 接口 ${apiName} 返回错误`,
          502,
        );
      }
      const fieldsList = payload?.data?.fields || [];
      const items = payload?.data?.items || [];
      return items.map((row) =>
        Object.fromEntries(fieldsList.map((field, i) => [field, row[i]])),
      );
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof TushareRequestError && error.retryable === true;
      if (!retryable || attempt === 1) break;
      await sleep(300);
    }
  }
  throw lastError;
}

function normalizeStock(row) {
  return {
    code: row.symbol || "",
    tsCode: row.ts_code || "",
    name: row.name || "",
    pinyin: row.cnspell || "",
    industry: row.industry || "",
    area: row.area || "",
  };
}

function readStockBasicFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(STOCK_BASIC_PATH, "utf8"));
    if (!Array.isArray(raw.items)) return null;
    return { fetchedAt: raw.fetchedAt || 0, items: raw.items };
  } catch {
    return null;
  }
}

function writeStockBasicFile(items) {
  try {
    fs.mkdirSync(path.dirname(STOCK_BASIC_PATH), { recursive: true });
    fs.writeFileSync(
      STOCK_BASIC_PATH,
      JSON.stringify({ fetchedAt: Date.now(), items }),
    );
  } catch {
    // 缓存文件写失败不阻塞查询
  }
}

async function loadStockBasic(forceRefresh = false) {
  if (!forceRefresh && stockBasicCache) return stockBasicCache;

  const fileData = readStockBasicFile();
  const fileFresh =
    fileData && Date.now() - fileData.fetchedAt < STOCK_BASIC_TTL_MS;

  if (!forceRefresh && fileFresh) {
    stockBasicCache = fileData.items.map(normalizeStock);
    return stockBasicCache;
  }

  try {
    const rows = await callApi(
      "stock_basic",
      { list_status: "L" },
      STOCK_BASIC_FIELDS,
    );
    writeStockBasicFile(rows);
    stockBasicCache = rows.map(normalizeStock);
    return stockBasicCache;
  } catch (error) {
    if (fileData) {
      stockBasicCache = fileData.items.map(normalizeStock);
      return stockBasicCache;
    }
    throw error;
  }
}

function inferTsCode(symbol) {
  if (/^(60|68|90)/.test(symbol)) return `${symbol}.SH`;
  if (/^(00|30|20)/.test(symbol)) return `${symbol}.SZ`;
  if (/^(43|83|87|88|92)/.test(symbol)) return `${symbol}.BJ`;
  return `${symbol}.SZ`;
}

function toCandidate(stock) {
  return {
    code: stock.code,
    tsCode: stock.tsCode,
    name: stock.name,
    pinyin: stock.pinyin,
  };
}

async function searchCompanies(input, limit = 10) {
  const query = String(input || "").trim();
  if (!query) return [];
  const stocks = await loadStockBasic();
  const upper = query.toUpperCase();

  const scored = [];
  for (const stock of stocks) {
    let score = -1;
    if (stock.code === query || stock.tsCode === upper) score = 0;
    else if (stock.name === query || stock.pinyin === upper) score = 1;
    else if (stock.name.startsWith(query) || stock.pinyin.startsWith(upper))
      score = 2;
    else if (stock.name.includes(query) || stock.pinyin.includes(upper))
      score = 3;
    else if (/^\d+$/.test(query) && stock.code.startsWith(query)) score = 2;
    if (score >= 0) scored.push({ stock, score });
  }

  scored.sort((a, b) => a.score - b.score || a.stock.code.localeCompare(b.stock.code));
  return scored.slice(0, limit).map((entry) => toCandidate(entry.stock));
}

async function resolveCompany(companyQuery) {
  const input = String(companyQuery || "").trim();
  if (!input) {
    throw new TushareRequestError("请输入公司代码、简称或拼音", 400);
  }
  const stocks = await loadStockBasic();
  const upper = input.toUpperCase();
  const tsMatch = upper.match(/^(\d{6})\.(SZ|SH|BJ)$/);

  let exact = [];
  if (tsMatch) {
    exact = stocks.filter((s) => s.tsCode === upper);
  } else if (/^\d{6}$/.test(input)) {
    exact = stocks.filter((s) => s.code === input);
  } else {
    exact = stocks.filter((s) => s.name === input || s.pinyin === upper);
  }

  if (exact.length === 1) return toCandidate(exact[0]);
  if (exact.length > 1) {
    throw new TushareRequestError(
      "公司查询存在多个匹配项，请使用 6 位股票代码",
      409,
      { candidates: exact.slice(0, 10).map(toCandidate) },
    );
  }

  if (tsMatch || /^\d{6}$/.test(input)) {
    const symbol = tsMatch ? tsMatch[1] : input;
    return { code: symbol, tsCode: upper.includes(".") ? upper : inferTsCode(symbol), name: symbol, pinyin: "" };
  }

  const fuzzy = await searchCompanies(input, 10);
  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    throw new TushareRequestError(
      "公司查询存在多个匹配项，请使用 6 位股票代码或完整公司简称",
      409,
      { candidates: fuzzy },
    );
  }
  throw new TushareRequestError(`未找到上市公司：${input}`, 404);
}

function toCompact(dateStr) {
  return String(dateStr).replace(/-/g, "");
}

function splitRange(start, end) {
  const s = new Date(`${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}T00:00:00Z`);
  const e = new Date(`${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}T00:00:00Z`);
  const mid = new Date(s.getTime() + Math.floor((e - s) / 2));
  const fmt = (d) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const midEnd = new Date(mid.getTime() + 86400000);
  return [
    [start, fmt(mid)],
    [fmt(midEnd), end],
  ];
}

async function fetchRepurchaseRange(start, end, budget) {
  if (budget.count >= MAX_SEGMENTS) {
    console.warn(`[tushare] segment budget exceeded, skipping ${start}-${end}`);
    return [];
  }
  budget.count += 1;
  const rows = await callApi(
    "repurchase",
    { start_date: start, end_date: end },
    "ts_code,ann_date,end_date,proc,vol,amount,high_limit,low_limit,exp_date",
  );
  if (rows.length >= ROW_LIMIT && start !== end) {
    await sleep(SEGMENT_SLEEP_MS);
    const [left, right] = splitRange(start, end);
    const leftRows = await fetchRepurchaseRange(left[0], left[1], budget);
    await sleep(SEGMENT_SLEEP_MS);
    const rightRows = await fetchRepurchaseRange(right[0], right[1], budget);
    return leftRows.concat(rightRows);
  }
  return rows;
}

async function queryRepurchases({ code, tsCode, from, to } = {}) {
  const target = String(tsCode || "").toUpperCase();
  if (!target && !code) {
    throw new TushareRequestError("缺少公司代码", 400);
  }

  const start = toCompact(from);
  const end = toCompact(to);
  const cacheKey = JSON.stringify(["repurchase", target || code, start, end]);
  const cached = getCache(cacheKey);
  if (cached) return { ...cached, cached: true };

  const segments = [];
  let yearStart = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  while (yearStart <= endYear) {
    const segStart = `${yearStart}0101` < start ? start : `${yearStart}0101`;
    const segEnd = `${yearStart}1231` > end ? end : `${yearStart}1231`;
    segments.push([segStart, segEnd]);
    yearStart += 1;
  }

  const budget = { count: 0 };
  const all = [];
  for (let i = 0; i < segments.length; i += 1) {
    if (i > 0) await sleep(SEGMENT_SLEEP_MS);
    all.push(...(await fetchRepurchaseRange(segments[i][0], segments[i][1], budget)));
  }

  const seen = new Set();
  const items = [];
  for (const row of all) {
    if (target && row.ts_code !== target) continue;
    if (!target && code && !String(row.ts_code || "").startsWith(code)) continue;
    const key = [row.ts_code, row.ann_date, row.proc, row.vol, row.amount].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(row);
  }
  items.sort((a, b) => String(b.ann_date || "").localeCompare(String(a.ann_date || "")));

  const result = { items, fetchedAt: new Date().toISOString(), cached: false };
  setCache(cacheKey, result);
  return result;
}

module.exports = {
  TushareRequestError,
  callApi,
  resolveCompany,
  searchCompanies,
  queryRepurchases,
  loadStockBasic,
};
