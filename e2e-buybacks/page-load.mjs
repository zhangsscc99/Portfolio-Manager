import { runTest, gotoCN } from './lib.mjs';

export default async function pageLoad() {
  return runTest('page-load', async (page, consoleErrors) => {
    await gotoCN(page);
    await page.getByLabel('公司').waitFor({ timeout: 10000 });
    for (const label of ['近1月', '近3月', '近半年', '近1年', '自定义']) {
      await page.getByRole('button', { name: label, exact: true }).waitFor({ timeout: 5000 });
    }
    // 结果容器（初始引导态）
    await page.getByText('输入公司并选择时间跨度', { exact: false }).waitFor({ timeout: 5000 });
    if (consoleErrors.length) {
      throw new Error(`console errors: ${consoleErrors.join(' | ')}`);
    }
  });
}
