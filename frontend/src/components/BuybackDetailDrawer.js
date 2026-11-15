import React from 'react';
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';

const STAGE_META = {
  completion: { label: '完成', color: 'success' },
  progress: { label: '实施中', color: 'warning' },
  plan: { label: '计划', color: 'primary' },
  other: { label: '其他', color: 'default' },
};

function fmtNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtQuantityWan(v) {
  const n = fmtNum(v);
  if (n == null) return '—';
  return `${(n / 1e4).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}万股`;
}

function fmtAmount(v) {
  const n = fmtNum(v);
  if (n == null) return '—';
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)}亿元`;
  return `${(n / 1e4).toLocaleString('zh-CN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}万元`;
}

function fmtPrice(v) {
  const n = fmtNum(v);
  if (n == null) return '—';
  return `${n.toFixed(2)}元`;
}

function Field({ label, children }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

const BuybackDetailDrawer = ({ item, onClose }) => {
  const open = item != null;
  const stage =
    (item && STAGE_META[item.stage]) || STAGE_META.other;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      data-testid="buyback-detail"
      PaperProps={{
        'aria-label': '回购公告详情',
        sx: {
          width: { xs: '100%', sm: 420 },
          background:
            'linear-gradient(160deg, #14100c 0%, #0e0c0a 100%)',
          borderLeft: '1px solid rgba(244, 190, 126, 0.18)',
        },
      }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background:
                  'linear-gradient(135deg, #F4BE7E 0%, #E8A855 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {item
                ? `${item.code || ''} ${item.companyName || ''}`.trim() || '—'
                : ''}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, wordBreak: 'break-word' }}
            >
              {item?.title || ''}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="关闭详情"
            size="small"
            sx={{
              color: 'text.secondary',
              border: '1px solid rgba(255,255,255,0.16)',
              '&:hover': {
                color: '#F4BE7E',
                borderColor: 'rgba(244,190,126,0.5)',
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        <Stack spacing={2.5}>
          <Field label="公司">
            <Typography variant="body1">
              {item
                ? `${item.code || '—'} ${item.companyName || ''}`.trim()
                : ''}
            </Typography>
          </Field>
          <Field label="公告日期">
            <Typography variant="body1">
              {item?.publishTime || '—'}
            </Typography>
          </Field>
          <Field label="结束日期">
            <Typography variant="body1">{item?.endDate || '—'}</Typography>
          </Field>
          <Field label="实施阶段">
            {item ? (
              <Chip
                label={item.proc || stage.label}
                color={stage.color}
                size="small"
                variant="outlined"
              />
            ) : (
              <Typography variant="body1">—</Typography>
            )}
          </Field>
          <Field label="回购数量">
            <Typography variant="body1">
              {fmtQuantityWan(item?.quantity)}
            </Typography>
          </Field>
          <Field label="回购金额">
            <Typography variant="body1">{fmtAmount(item?.amount)}</Typography>
          </Field>
          <Field label="价格区间">
            <Typography variant="body1">
              {item?.priceRange &&
              (item.priceRange.low != null || item.priceRange.high != null)
                ? `${fmtPrice(item.priceRange.low)} ~ ${fmtPrice(
                    item.priceRange.high,
                  )}`
                : '—'}
            </Typography>
          </Field>
          <Field label="预计完成日">
            <Typography variant="body1">{item?.expDate || '—'}</Typography>
          </Field>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default BuybackDetailDrawer;
