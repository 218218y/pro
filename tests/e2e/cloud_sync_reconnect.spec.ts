import { test, expect, type Page } from '@playwright/test';

import {
  collectRuntimeIssues,
  expectCloudSyncPanel,
  expectExportSurface,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  syncCloudSyncSketchFromPanel,
} from './helpers/project_flows';

async function expectNavigatorOnline(page: Page, expected: boolean): Promise<void> {
  await expect
    .poll(async () => await page.evaluate(() => navigator.onLine), {
      message: `navigator.onLine should become ${String(expected)}`,
    })
    .toBe(expected);
}

async function dispatchCloudSyncAttentionSignals(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

test.describe('Cloud Sync browser reconnect smoke', () => {
  test('offline to online browser transition keeps the panel stable and sync usable', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    await expectExportSurface(page);
    await expectCloudSyncPanel(page);

    await page.context().setOffline(true);
    try {
      await expectNavigatorOnline(page, false);
      await dispatchCloudSyncAttentionSignals(page);
      await expectCloudSyncPanel(page);

      await page.context().setOffline(false);
      await expectNavigatorOnline(page, true);
      await dispatchCloudSyncAttentionSignals(page);

      await syncCloudSyncSketchFromPanel(page);
      await expectCloudSyncPanel(page);

      expectNoRuntimeIssues(issues);
    } finally {
      await page.context().setOffline(false);
    }
  });
});
