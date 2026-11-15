import { runTest, gotoCN, submitQuery } from './lib.mjs';

export default async function rangeCustom() {
  return runTest('range-custom', async (page) => {
    await gotoCN(page);
    await page.getByLabel('公司').fill('300144');
    await page.getByRole('button', { name: '自定义', exact: true }).click();
    await page.getByLabel('开始日期').fill('2025-01-01');
    await page.getByLabel('结束日期').fill('2025-12-31');
    await submitQuery(page);
    const rows = await page.locator('tbody tr').count();
    const empty = await page.getByText('该时间段内没有回购公告').count();
    const alert = await page.locator('[role="alert"]').count();
    if (rows === 0 && empty === 0 && alert === 0) {
      throw new Error('既无结果行，也无空态或错误提示');
    }
    if (alert > 0) {
      throw new Error(`查询返回错误: ${await page.locator('[role="alert"]').innerText()}`);
    }
  });
}
