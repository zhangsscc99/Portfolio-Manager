import { runTest, gotoCN, submitQuery } from './lib.mjs';

const STORAGE_KEY = 'buybacks-cn:lastQuery';

async function assertIdle(page, label) {
  const rows = await page.locator('tbody tr').count();
  if (rows !== 0) {
    throw new Error(`${label}: 首屏出现结果行（${rows} 行），疑似自动发起查询`);
  }
  const alerts = await page.getByRole('alert').count();
  if (alerts !== 0) {
    throw new Error(`${label}: 页面出现错误弹窗`);
  }
  await page
    .getByText('输入公司并选择时间跨度')
    .waitFor({ timeout: 10000 });
}

export default async function memory() {
  return runTest('memory', async (page) => {
    await gotoCN(page);
    await page.getByLabel('公司').fill('300144');
    await page.getByRole('button', { name: '近半年', exact: true }).click();
    await submitQuery(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: '查询', exact: true })
      .waitFor({ timeout: 30000 });

    const input = page.getByLabel('公司');
    const value = await input.inputValue();
    if (value !== '300144') {
      throw new Error(`公司输入框未回填: "${value}"`);
    }

    const pressed = await page
      .getByRole('button', { name: '近半年', exact: true })
      .getAttribute('aria-pressed');
    if (pressed !== 'true') {
      throw new Error(`「近半年」未恢复选中态: aria-pressed=${pressed}`);
    }
    await assertIdle(page, '记忆回填');

    // 损坏数据回落：非法 JSON 不得阻塞渲染，全部回默认值且不自动查询
    await page.evaluate(
      (k) => window.localStorage.setItem(k, '{bad json'),
      STORAGE_KEY,
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: '查询', exact: true })
      .waitFor({ timeout: 30000 });

    const corruptValue = await page.getByLabel('公司').inputValue();
    if (corruptValue !== '') {
      throw new Error(`损坏数据后公司输入框应为空: "${corruptValue}"`);
    }
    const corruptPressed = await page
      .getByRole('button', { name: '近1年', exact: true })
      .getAttribute('aria-pressed');
    if (corruptPressed !== 'true') {
      throw new Error(
        `损坏数据后「近1年」未恢复选中态: aria-pressed=${corruptPressed}`,
      );
    }
    await assertIdle(page, '损坏数据回落');

    // 非法日期回落：custom + 不存在的日期，跨度回落默认且不自动查询
    await page.evaluate(
      (k) =>
        window.localStorage.setItem(
          k,
          JSON.stringify({
            v: 1,
            company: '300144',
            rangeKey: 'custom',
            customFrom: '2026-13-45',
            customTo: '2026-14-99',
          }),
        ),
      STORAGE_KEY,
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: '查询', exact: true })
      .waitFor({ timeout: 30000 });

    const invalidPressed = await page
      .getByRole('button', { name: '近1年', exact: true })
      .getAttribute('aria-pressed');
    if (invalidPressed !== 'true') {
      throw new Error(
        `非法日期后跨度未回落为「近1年」: aria-pressed=${invalidPressed}`,
      );
    }
    const customInputs = await page.getByLabel('开始日期').count();
    if (customInputs !== 0) {
      throw new Error('非法日期回落后仍显示自定义日期输入框');
    }
    await assertIdle(page, '非法日期回落');
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = await memory();
  process.exit(ok ? 0 : 1);
}
