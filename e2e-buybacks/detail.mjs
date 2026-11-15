import { runTest, gotoCN, submitQuery } from './lib.mjs';

const FIELD_LABELS = [
  '公告日期',
  '结束日期',
  '实施阶段',
  '回购数量',
  '回购金额',
  '价格区间',
  '预计完成日',
];

// "1,580.50万股" -> { num: 1580.5, unit: '万', decimals: 2 }
// "1.21亿元"     -> { num: 1.21, unit: '亿', decimals: 2 }
function parseWanYi(text) {
  const t = (text || '').trim();
  if (t === '—' || t === '') return null;
  const m = t.match(/([\d,]+(?:\.\d+)?)\s*(亿|万)/);
  if (!m) return null;
  return {
    num: Number(m[1].replace(/,/g, '')),
    unit: m[2],
    decimals: (m[1].split('.')[1] || '').length,
  };
}

function numInUnit(parsed, unit) {
  if (!parsed) return null;
  if (parsed.unit === unit) return parsed.num;
  return parsed.unit === '亿' ? parsed.num * 1e4 : parsed.num / 1e4;
}

// 表格单元格文本 vs 抽屉字段值。表格/抽屉小数位不同，
// 容差取两者较粗显示精度的一半（至少 0.01）。
function assertConsistent(tableText, drawerText, field) {
  const tt = tableText.trim();
  const dt = drawerText.trim();
  if (tt === '—') {
    if (dt !== '—') {
      throw new Error(`${field}: 表格为「—」但抽屉显示「${dt}」`);
    }
    return;
  }
  const tp = parseWanYi(tt);
  if (!tp) {
    if (tt !== dt) {
      throw new Error(`${field}: 表格「${tt}」与抽屉「${dt}」不一致`);
    }
    return;
  }
  const dp = parseWanYi(dt);
  if (!dp) {
    throw new Error(`${field}: 抽屉值「${dt}」无法解析为数值`);
  }
  const dv = numInUnit(dp, tp.unit);
  const tol = Math.max(0.01, 0.5 * 10 ** -Math.min(tp.decimals, dp.decimals));
  if (Math.abs(dv - tp.num) > tol) {
    throw new Error(`${field}: 表格「${tt}」与抽屉「${dt}」数值不一致`);
  }
  if (tp.unit !== dp.unit) {
    throw new Error(`${field}: 表格单位「${tp.unit}」与抽屉单位「${dp.unit}」不一致`);
  }
}

export default async function detail() {
  return runTest('detail', async (page) => {
    await gotoCN(page);
    const rows = page.locator('tbody tr');
    const drawer = page.locator('[data-testid="buyback-detail"]');

    const fieldText = async (label) =>
      (
        await drawer
          .locator(
            `xpath=.//p[normalize-space()="${label}"]/following-sibling::div`,
          )
          .first()
          .innerText()
      ).trim();

    async function scanRows() {
      const n = await rows.count();
      let nullQty = -1;
      let valued = -1;
      for (let i = 0; i < n; i += 1) {
        const tds = rows.nth(i).locator('td');
        const q = (await tds.nth(3).innerText()).trim();
        const a = (await tds.nth(4).innerText()).trim();
        if (q === '—' && nullQty < 0) nullQty = i;
        if (q !== '—' && a !== '—' && valued < 0) valued = i;
      }
      return { nullQty, valued };
    }

    async function queryAndScan(code) {
      await page.getByLabel('公司').fill(code);
      await submitQuery(page);
      if ((await rows.count()) === 0) return null;
      return scanRows();
    }

    let found = await queryAndScan('300144');
    for (const code of ['600519', '000651']) {
      if (found && found.nullQty >= 0 && found.valued >= 0) break;
      found = await queryAndScan(code);
    }
    if (!found || found.nullQty < 0) {
      throw new Error('所试公司中找不到「回购数量」为 — 的行');
    }
    if (found.valued < 0) {
      throw new Error('所试公司中找不到数量与金额均有值的行');
    }

    // --- 1) 有值行：全部字段标签 + 与表格行的一致性 + 金额单位 ---
    const vRow = rows.nth(found.valued);
    const vTds = vRow.locator('td');
    const rowDate = (await vTds.nth(0).innerText()).trim();
    const rowQty = (await vTds.nth(3).innerText()).trim();
    const rowAmt = (await vTds.nth(4).innerText()).trim();
    await vRow.click();
    await drawer.waitFor({ state: 'visible', timeout: 15000 });
    const dText = await drawer.innerText();
    for (const label of FIELD_LABELS) {
      if (!dText.includes(label)) {
        throw new Error(`抽屉内缺少「${label}」: ${dText}`);
      }
    }
    for (const bad of ['undefined', 'NaN', 'null']) {
      if (dText.includes(bad)) {
        throw new Error(`抽屉内出现「${bad}」: ${dText}`);
      }
    }
    assertConsistent(rowDate, await fieldText('公告日期'), '公告日期');
    assertConsistent(rowQty, await fieldText('回购数量'), '回购数量');
    assertConsistent(rowAmt, await fieldText('回购金额'), '回购金额');

    const amtText = await fieldText('回购金额');
    if (!/[\d.,]+\s*(亿|万)元/.test(amtText)) {
      throw new Error(`抽屉金额单位异常: ${amtText}`);
    }
    const pa = parseWanYi(rowAmt);
    const da = parseWanYi(amtText);
    if (pa.unit === '亿') {
      if (da.unit !== '亿' || da.num < 1) {
        throw new Error(`金额 ≥1e8 应用亿元: 表格「${rowAmt}」抽屉「${amtText}」`);
      }
    } else if (da.unit !== '万' || da.num >= 1e4) {
      throw new Error(`金额 <1e8 应用万元: 表格「${rowAmt}」抽屉「${amtText}」`);
    }

    // --- 2) 点「关闭详情」按钮能关 ---
    await drawer.getByRole('button', { name: '关闭详情' }).click();
    await drawer.waitFor({ state: 'hidden', timeout: 15000 });

    // --- 3) null 兜底：表格「—」的行，抽屉也必须「—」，不许伪造 0 ---
    const nRow = rows.nth(found.nullQty);
    const nTds = nRow.locator('td');
    const nQty = (await nTds.nth(3).innerText()).trim();
    const nAmt = (await nTds.nth(4).innerText()).trim();
    if (nQty !== '—') throw new Error('内部错误：扫描到的行数量不是 —');
    await nRow.click();
    await drawer.waitFor({ state: 'visible', timeout: 15000 });
    const nText = await drawer.innerText();
    const dQty = await fieldText('回购数量');
    if (dQty !== '—') {
      throw new Error(`null 数量在抽屉中显示为「${dQty}」（应为 —）`);
    }
    if (nAmt === '—') {
      const dAmt = await fieldText('回购金额');
      if (dAmt !== '—') {
        throw new Error(`null 金额在抽屉中显示为「${dAmt}」（应为 —）`);
      }
    }
    for (const bad of ['0.00万股', '0.0万元', '0万元']) {
      if (nText.includes(bad)) {
        throw new Error(`抽屉把 null 显示成了「${bad}」: ${nText}`);
      }
    }
    assertConsistent(
      (await nTds.nth(0).innerText()).trim(),
      await fieldText('公告日期'),
      '公告日期',
    );

    // --- 4) ESC 能关 ---
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden', timeout: 15000 });

    // --- 5) 键盘：focus 行后按 Enter 能打开 ---
    await vRow.focus();
    await page.keyboard.press('Enter');
    await drawer.waitFor({ state: 'visible', timeout: 15000 });
    assertConsistent(rowQty, await fieldText('回购数量'), '回购数量(键盘)');
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden', timeout: 15000 });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = await detail();
  process.exit(ok ? 0 : 1);
}
