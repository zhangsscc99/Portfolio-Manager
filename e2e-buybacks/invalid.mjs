import { runTest, gotoCN } from './lib.mjs';

export default async function invalid() {
  return runTest('invalid', async (page) => {
    await gotoCN(page);
    await page.getByLabel('公司').fill('zzzz9999');
    await page.getByRole('button', { name: '查询', exact: true }).click();
    const alert = page.locator('[role="alert"]');
    await alert.waitFor({ timeout: 30000 });
    const text = await alert.innerText();
    if (!/未找到|错误|失败|输入/.test(text)) {
      throw new Error(`错误提示不明确: ${text}`);
    }
    // 页面没有崩溃：表单仍可用
    await page.getByLabel('公司').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: '查询', exact: true }).waitFor({ timeout: 5000 });
  });
}
