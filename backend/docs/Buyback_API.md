# A 股回购公告查询 API

当前适配深圳证券交易所披露平台。输入支持股票代码、公司简称和全拼。

## 查询公告

```http
GET /api/buybacks
  ?company=300144
  &from=2024-01-01
  &to=2026-10-28
  &page=1
  &pageSize=20
```

参数：

- `company`：6 位代码、公司简称或全拼，支持 `q` / `symbol` 别名
- `from` / `to`：`YYYY-MM-DD`，默认最近一年，单次最多 10 年
- `page`：页码，从 1 开始
- `pageSize`：每页 1-50 条
- `keyword`：公告标题关键词，默认 `回购`

返回的公告会标记：

- `share_buyback`：普通股份回购
- `equity_incentive_repurchase`：限制性股票/股权激励回购注销
- `stage`：plan、progress、completion、price_adjustment、cancellation 等阶段
- PDF 原文地址与深交所公告详情页

如果简称或拼音命中多家公司，接口返回 HTTP 409 和候选公司列表。

## 查询公告详情

```http
GET /api/buybacks/announcement/:uuid
```

`uuid` 是深交所公告详情 URL 中问号后的标识。

示例：

```http
GET /api/buybacks/announcement/b9828db8-6f6d-4c61-af65-b2c841ccc328
```

## 命令行

```bash
node scripts/queryBuybacks.js 300144 2024-01-01 2026-10-28 1 20
```
