import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Pagination,
  Alert,
  Stack,
  Grid,
  Paper,
} from '@mui/material';
import { Search, Replay, DateRange } from '@mui/icons-material';
import { buildApiUrl } from '../config/api';
import BuybackDetailDrawer from '../components/BuybackDetailDrawer';

const RANGE_OPTIONS = [
  { key: '1m', label: '近1月', days: 30 },
  { key: '3m', label: '近3月', days: 90 },
  { key: '6m', label: '近半年', days: 180 },
  { key: '1y', label: '近1年', days: 365 },
  { key: 'custom', label: '自定义' },
];

const PAGE_SIZE = 20;

const STORAGE_KEY = 'buybacks-cn:lastQuery';
const STORAGE_VERSION = 1;

function isValidDateStr(s) {
  if (typeof s !== 'string' || s.length > 10) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (y < 1990 || y > 2100) return false;
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

function loadLastQuery() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.v !== STORAGE_VERSION) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return null;
    }
    const customFrom = isValidDateStr(data.customFrom) ? data.customFrom : '';
    const customTo = isValidDateStr(data.customTo) ? data.customTo : '';
    let rangeKey = RANGE_OPTIONS.some((o) => o.key === data.rangeKey)
      ? data.rangeKey
      : '1y';
    if (rangeKey === 'custom' && (!customFrom || !customTo)) rangeKey = '1y';
    return {
      company: typeof data.company === 'string' ? data.company : '',
      rangeKey,
      customFrom,
      customTo,
    };
  } catch {
    return null;
  }
}

function saveLastQuery(query) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: STORAGE_VERSION, ...query }),
    );
  } catch {}
}

const STAGE_META = {
  completion: { label: '完成', color: 'success' },
  progress: { label: '实施中', color: 'warning' },
  plan: { label: '计划', color: 'primary' },
  other: { label: '其他', color: 'default' },
};

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rangeDates(rangeKey, customFrom, customTo) {
  const today = new Date();
  if (rangeKey === 'custom') {
    return { from: customFrom, to: customTo };
  }
  const opt = RANGE_OPTIONS.find((o) => o.key === rangeKey) || RANGE_OPTIONS[3];
  const from = new Date(today.getTime() - opt.days * 86400000);
  return { from: toDateStr(from), to: toDateStr(today) };
}

function fmtWan(v, digits = 1) {
  if (v == null || v === '') return '—';
  const num = Number(v);
  if (!Number.isFinite(num)) return '—';
  const n = num / 1e4;
  return `${n.toLocaleString('zh-CN', { maximumFractionDigits: digits })}万`;
}

function fmtAmount(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
  return fmtWan(n);
}

async function fetchJson(url, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const err = new Error(body?.error || `请求失败（HTTP ${res.status}）`);
      err.status = res.status;
      err.candidates = body?.candidates;
      throw err;
    }
    return body;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('请求超时，请缩小时间范围后重试');
      err.status = 504;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const BuybacksCN = () => {
  const [savedQuery] = useState(loadLastQuery);
  const [companyInput, setCompanyInput] = useState(
    () => savedQuery?.company || '',
  );
  const [suggestions, setSuggestions] = useState([]);
  const [rangeKey, setRangeKey] = useState(
    () => savedQuery?.rangeKey || '1y',
  );
  const [customFrom, setCustomFrom] = useState(
    () => savedQuery?.customFrom || '',
  );
  const [customTo, setCustomTo] = useState(() => savedQuery?.customTo || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const lastQuery = useRef(null);
  const suggestTimer = useRef(null);

  useEffect(() => {
    if (!companyInput || companyInput.trim().length < 1) {
      setSuggestions([]);
      return undefined;
    }
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        const body = await fetchJson(
          buildApiUrl(
            `/buybacks/companies?q=${encodeURIComponent(companyInput.trim())}`,
          ),
          8000,
        );
        setSuggestions(body?.data?.candidates || []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(suggestTimer.current);
  }, [companyInput]);

  useEffect(() => {
    const t = setTimeout(
      () =>
        saveLastQuery({ company: companyInput, rangeKey, customFrom, customTo }),
      300,
    );
    return () => clearTimeout(t);
  }, [companyInput, rangeKey, customFrom, customTo]);

  const runQuery = useCallback(
    async (query, targetPage = 1) => {
      const params = new URLSearchParams({
        company: query.company,
        from: query.from,
        to: query.to,
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      });
      setLoading(true);
      setError(null);
      lastQuery.current = { ...query, page: targetPage };
      try {
        const body = await fetchJson(buildApiUrl(`/buybacks?${params}`));
        setResult(body.data);
        setPage(targetPage);
      } catch (e) {
        setResult(null);
        setError({
          message: e.message || '查询失败',
          candidates: e.candidates || null,
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSearch = () => {
    const raw = companyInput.trim();
    const company = /^\d{6}\s/.test(raw) ? raw.slice(0, 6) : raw;
    if (!company) {
      setError({ message: '请输入股票代码、公司简称或拼音' });
      return;
    }
    const { from, to } = rangeDates(rangeKey, customFrom, customTo);
    if (!from || !to) {
      setError({ message: '请先选择完整的起止日期' });
      return;
    }
    if (from > to) {
      setError({ message: '开始日期不能晚于结束日期' });
      return;
    }
    runQuery({ company, from, to });
  };

  const handleSwitchOneYear = () => {
    setRangeKey('1y');
    const { from, to } = rangeDates('1y');
    const company = companyInput.trim() || lastQuery.current?.company;
    if (company) runQuery({ company, from, to });
  };

  const suggestionOptions = useMemo(
    () => suggestions.map((c) => `${c.code} ${c.name}`),
    [suggestions],
  );

  const summary = result?.summary;
  const items = result?.items || [];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #0a0a0a 0%, #14100c 50%, #0a0a0a 100%)',
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              background:
                'linear-gradient(135deg, #F4BE7E 0%, #E8A855 50%, #D4961F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            A股回购公告查询
          </Typography>
          <Typography variant="body1" color="text.secondary">
            按公司和时间跨度查询沪深北全市场股份回购记录 · 数据来源：Tushare
          </Typography>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={5}>
                <Autocomplete
                  freeSolo
                  options={suggestionOptions}
                  inputValue={companyInput}
                  onInputChange={(e, value) => setCompanyInput(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="公司"
                      placeholder="股票代码 / 公司简称 / 拼音，如 300144、宋城演艺、scyy"
                      size="small"
                      fullWidth
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={7}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <ToggleButtonGroup
                    value={rangeKey}
                    exclusive
                    size="small"
                    onChange={(e, v) => v && setRangeKey(v)}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    {RANGE_OPTIONS.map((o) => (
                      <ToggleButton key={o.key} value={o.key}>
                        {o.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Button
                    variant="contained"
                    startIcon={
                      loading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Search />
                      )
                    }
                    onClick={handleSearch}
                    disabled={loading}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {loading ? '查询中…' : '查询'}
                  </Button>
                </Stack>
                {rangeKey === 'custom' && (
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                    <TextField
                      label="开始日期"
                      type="date"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                    <TextField
                      label="结束日期"
                      type="date"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </Stack>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<Replay />}
                    onClick={() =>
                      lastQuery.current
                        ? runQuery(lastQuery.current, lastQuery.current.page)
                        : handleSearch()
                    }
                  >
                    重试
                  </Button>
                }
              >
                {error.message}
              </Alert>
              {error.candidates && error.candidates.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    找到多家匹配公司，请点击选择：
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {error.candidates.map((c) => (
                      <Chip
                        key={c.tsCode || c.code}
                        label={`${c.code} ${c.name}`}
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                          setCompanyInput(`${c.code} ${c.name}`);
                          const { from, to } = rangeDates(
                            rangeKey,
                            customFrom,
                            customTo,
                          );
                          runQuery({
                            company: c.code,
                            from,
                            to,
                          });
                        }}
                        sx={{ mb: 1, cursor: 'pointer' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      命中条数
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {result.pagination.total}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      已回购金额
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {summary?.completedAmount != null
                        ? `${fmtAmount(summary.completedAmount)}元`
                        : '数据源未提供'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      已回购数量
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {summary?.completedQuantity != null
                        ? `${fmtWan(summary.completedQuantity)}股`
                        : '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      回购目标
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {summary?.targetAmount != null
                        ? `${fmtAmount(summary.targetAmount)}元`
                        : '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      完成进度
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {summary?.progressPct != null
                        ? `${summary.progressPct.toFixed(1)}%`
                        : '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      最新公告日期
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {summary?.latestAnnDate || '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {items.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <DateRange
                    sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                  />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    该时间段内没有回购公告
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    试试扩大时间范围，或换一家公司查询
                  </Typography>
                  <Button variant="outlined" onClick={handleSwitchOneYear}>
                    切到近1年
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <TableContainer
                  component={Box}
                  sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
                >
                  <Table size="small" sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>公告日期</TableCell>
                        <TableCell>公司</TableCell>
                        <TableCell>阶段</TableCell>
                        <TableCell align="right">回购数量</TableCell>
                        <TableCell align="right">回购金额</TableCell>
                        <TableCell>价格区间（元）</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => {
                        const stage = STAGE_META[item.stage] || STAGE_META.other;
                        const openDetail = () => setSelectedItem(item);
                        return (
                          <TableRow
                            key={item.id}
                            hover
                            tabIndex={0}
                            role="row"
                            aria-label={`${
                              item.companyName || item.code || ''
                            } ${item.publishTime || ''} 回购公告详情`.trim()}
                            onClick={openDetail}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openDetail();
                              }
                            }}
                            sx={{
                              cursor: 'pointer',
                              '&&:hover': {
                                backgroundColor:
                                  'rgba(244, 190, 126, 0.08)',
                              },
                            }}
                          >
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {item.publishTime || '—'}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" component="span">
                                {item.code}
                              </Typography>{' '}
                              <Typography
                                variant="body2"
                                component="span"
                                color="text.secondary"
                              >
                                {item.companyName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.proc || stage.label}
                                color={stage.color}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                              {item.quantity != null
                                ? `${fmtWan(item.quantity)}股`
                                : '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                              {item.amount != null
                                ? `${fmtAmount(item.amount)}元`
                                : '—'}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {item.priceRange
                                ? `${
                                    item.priceRange.low ?? '—'
                                  } ~ ${item.priceRange.high ?? '—'}`
                                : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {result.pagination.totalPages > 1 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      py: 2,
                    }}
                  >
                    <Pagination
                      count={result.pagination.totalPages}
                      page={page}
                      color="primary"
                      onChange={(e, p) => {
                        if (lastQuery.current) runQuery(lastQuery.current, p);
                      }}
                      disabled={loading}
                    />
                  </Box>
                )}
              </Card>
            )}
          </>
        )}

        {!result && !error && !loading && (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              background: 'rgba(15, 15, 20, 0.5)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
            }}
          >
            <Typography variant="body1" color="text.secondary">
              输入公司并选择时间跨度，点击「查询」查看回购公告
            </Typography>
          </Paper>
        )}
      </Container>
      <BuybackDetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </Box>
  );
};

export default BuybacksCN;
