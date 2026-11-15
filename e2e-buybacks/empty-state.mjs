import { runTest, gotoCN, submitQuery } from './lib.mjs';

export default async function emptyState() {
  return runTest('empty-state', async (page) => {
    await gotoCN(page);
    // 999999 不在股票列表中，但按代码规则可解析 → 必然无回购记录 → 空态
    await page.getByLabel('公司').fill('999999');
    await page.getByRole('button', { name: '近1月', exact: true }).click();
    await submitQuery(page);
    await page.getByText('该时间段内没有回购公告').waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: '切到近1年' }).waitFor({ timeout: 5000 });
  });
}
