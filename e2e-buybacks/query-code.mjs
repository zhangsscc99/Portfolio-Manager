import { runTest, gotoCN, submitQuery } from './lib.mjs';

export default async function queryCode() {
  return runTest('query-code', async (page) => {
    await gotoCN(page);
    await page.getByLabel('公司').fill('300144');
    await page.getByRole('button', { name: '近1年', exact: true }).click();
    await submitQuery(page);
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count === 0) throw new Error('没有结果行');
    const firstRowText = await rows.first().innerText();
    if (!/宋城演艺|300144/.test(firstRowText)) {
      throw new Error(`首行不含「宋城演艺」或「300144」: ${firstRowText}`);
    }
  });
}
