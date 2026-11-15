import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/root/.cache/ms-playwright/chromium-1140/chrome-linux/chrome';
export const BASE_URL = process.env.BASE_URL || 'https://openfolio.uk';
const LOG_DIR = '/root/logs';

export async function launch() {
  return chromium.launch({
    executablePath: CHROME,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--explicitly-allowed-ports=5061',
    ],
  });
}

export async function runTest(name, fn, { viewport } = {}) {
  const browser = await launch();
  const context = await browser.newContext(viewport ? { viewport } : {});
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  try {
    await fn(page, consoleErrors);
    console.log(`PASS ${name}`);
    await browser.close();
    return true;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      const ts = Date.now();
      const file = path.join(LOG_DIR, `cn-buybacks-${name}-${ts}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.error(`  screenshot: ${file}`);
    } catch {}
    await browser.close();
    return false;
  }
}

export async function gotoCN(page) {
  await page.goto(`${BASE_URL}/cn`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: '查询', exact: true }).waitFor({ timeout: 30000 });
}

export async function submitQuery(page, { waitMs = 90000 } = {}) {
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await page
    .locator('tbody tr')
    .first()
    .or(page.getByRole('alert'))
    .or(page.getByText('该时间段内没有回购公告'))
    .waitFor({ timeout: waitMs });
}
