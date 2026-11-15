import { runTest, gotoCN, submitQuery } from './lib.mjs';

export default async function queryName() {
  return runTest('query-name', async (page) => {
    await gotoCN(page);
    await page.getByLabel('公司').fill('宋城演艺');
    await submitQuery(page);
    const rows = page.locator('tbody tr');
    if ((await rows.count()) === 0) throw new Error('没有结果行');
  });
}
