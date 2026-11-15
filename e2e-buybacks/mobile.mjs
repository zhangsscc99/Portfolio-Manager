import { runTest, gotoCN, submitQuery } from './lib.mjs';

export default async function mobile() {
  return runTest(
    'mobile',
    async (page) => {
      await gotoCN(page);
      // 表单可用
      await page.getByLabel('公司').fill('300144');
      await submitQuery(page);
      const rows = await page.locator('tbody tr').count();
      const empty = await page.getByText('该时间段内没有回购公告').count();
      if (rows === 0 && empty === 0) throw new Error('无结果行也无空态');
      if (rows > 0) {
        // 表格容器横向可滚动
        const scrollable = await page.evaluate(() => {
          const el = document.querySelector('table')?.parentElement;
          return el ? el.scrollWidth >= el.clientWidth : false;
        });
        if (!scrollable) throw new Error('表格容器不可滚动');
      }
      // 页面整体不允许横向溢出
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      if (overflow > 2) throw new Error(`页面横向溢出 ${overflow}px`);
    },
    { viewport: { width: 390, height: 844 } },
  );
}
