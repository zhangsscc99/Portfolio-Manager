# 回购查询（/cn）增量清单

验收契约：每条必须带 `verify:` 与 `risk:`。
- 后端断言：`bash e2e-buybacks/verify.sh <FID>`（内部用 curl 断言）
- 前端断言：`node e2e-buybacks/<name>.mjs`
- risk: low=样式/文案/只读展示；med=接口/查询逻辑；high=鉴权/数据写入/迁移

## M0 基座（首轮由人工派单完成，勿重复）
- [x] B001 Tushare 服务封装（repurchase / stock_basic / token_status）✅
- [x] B002 /api/buybacks 换数据源，契约不变 ✅
- [x] B003 /cn 页面：公司 + 时间跨度查询、结果表格、空态/错误态 ✅
- [x] B004 E2E 7 条（页面/代码查询/简称查询/自定义区间/空态/非法输入/移动端）✅

## M0.5 详情查看（用户直接提出）
- [ ] B005 回购公告详情：点击列表任意一行 → 右侧抽屉/弹层展示完整字段（公告日期、结束日期、实施阶段、回购数量、回购金额、价格区间上下限、预计完成日），并按金额/数量做单位换算（万股、万元/亿元）
  verify: node e2e-buybacks/detail.mjs
  risk: med
- [ ] B006 详情内提供「查看原始公告」外链：跳转巨潮资讯按公司代码+日期的搜索结果页（`https://www.cninfo.com.cn/new/fulltextSearch?notautosubmit=&keyWord=<code>`），新标签打开
  verify: node e2e-buybacks/detail-link.mjs
  risk: low

## M1 查询体验
- [ ] B010 公司输入联想：输入 2 字符以上展示候选（代码+名称+行业），点选填入
  verify: node e2e-buybacks/suggest.mjs
  risk: med
- [ ] B011 查询条件记忆：上次的公司与时间跨度写入 localStorage，下次打开自动回填
  verify: node e2e-buybacks/memory.mjs
  risk: low
- [ ] B012 URL 同步查询参数（?company=&from=&to=），刷新/分享可复原
  verify: node e2e-buybacks/urlstate.mjs
  risk: low
- [ ] B013 结果表格排序：按公告日期 / 金额 升降序
  verify: node e2e-buybacks/sort.mjs
  risk: low

## M2 数据洞察
- [ ] B020 汇总卡片增强：回购金额合计（亿/万自适应）、公告数量按月分布迷你柱图
  verify: node e2e-buybacks/summary.mjs
  risk: low
- [ ] B021 阶段分布统计：完成/实施中/计划 各自条数与占比
  verify: node e2e-buybacks/stage-stats.mjs
  risk: low
- [ ] B022 导出 CSV（当前查询结果）
  verify: node e2e-buybacks/export.mjs
  risk: med
- [ ] B023 单公司时间轴：横轴公告日期，纵轴回购金额，悬停显示阶段
  verify: node e2e-buybacks/timeline.mjs
  risk: med

## M3 监控与提醒（定时能力）
- [ ] B030 每日抓取：cron 每日 18:00 抓当日全部回购公告入库（SQLite 表 repurchase_ann）
  verify: bash e2e-buybacks/verify.sh B030
  risk: high
- [ ] B031 大额回购识别：单笔金额 ≥ 1 亿元标记「重点」，页面加筛选开关
  verify: node e2e-buybacks/whale.mjs
  risk: med
- [ ] B032 关注公司清单：加星标的公司出现在首页快捷查询区
  verify: node e2e-buybacks/watchlist.mjs
  risk: med

## M4 健壮性
- [ ] B040 Tushare 限流与失败降级：429/超时给出可读提示，缓存命中则继续展示
  verify: node e2e-buybacks/ratelimit.mjs
  risk: med
- [ ] B041 日期跨度上限校验（>5 年提示分段）+ 非法日期格式拦截
  verify: node e2e-buybacks/range-guard.mjs
  risk: med
- [ ] B042 多公司命中（409）候选列表交互可用
  verify: node e2e-buybacks/candidates.mjs
  risk: med
