import { runTest, gotoCN, submitQuery } from './lib.mjs';

// Bugfix regression: 000950 近1年只有一条 proc=完成 且 amount/vol 为 null 的记录。
// 1) 记录必须出现（此前 2000 行截断导致完全缺失）
// 2) null 金额显示为「—」，任何地方不得伪造「0万元」
// 3) 汇总卡片在全部金额为 null 时显示「数据源未提供」
export default async function bugfix000950() {
  return runTest('bugfix-000950', async (page) => {
    await gotoCN(page);
    await page.getByLabel('公司').fill('000950');
    await page.getByRole('button', { name: '近1年', exact: true }).click();
    await submitQuery(page);

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count !== 1) {
      throw new Error(`000950 近1年期望 1 条记录，实际 ${count}`);
    }

    const tds = rows.first().locator('td');
    const rowAmt = (await tds.nth(4).innerText()).trim();
    if (!/^—$|[\d]/.test(rowAmt)) {
      throw new Error(`金额列文本异常: ${rowAmt}`);
    }

    const bodyText = await page.locator('body').innerText();
    const zeroAmount = /(^|[^\d.,])0(\.\d+)?万元/;
    if (zeroAmount.test(bodyText)) {
      throw new Error('页面出现伪造的 0万元');
    }
    if (!bodyText.includes('数据源未提供')) {
      throw new Error(`汇总卡片未显示「数据源未提供」: ${bodyText.slice(0, 400)}`);
    }

    await rows.first().click();
    const drawer = page.locator('[data-testid="buyback-detail"]');
    await drawer.waitFor({ state: 'visible', timeout: 15000 });
    const drawerText = await drawer.innerText();
    if (zeroAmount.test(drawerText)) {
      throw new Error(`抽屉把 null 金额显示成了 0万元: ${drawerText}`);
    }
    const amtField = (
      await drawer
        .locator('xpath=.//p[normalize-space()="回购金额"]/following-sibling::div')
        .first()
        .innerText()
    ).trim();
    if (!/^—$/.test(amtField) && !/[\d]/.test(amtField)) {
      throw new Error(`抽屉「回购金额」文本异常: ${amtField}`);
    }
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden', timeout: 15000 });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = await bugfix000950();
  process.exit(ok ? 0 : 1);
}
