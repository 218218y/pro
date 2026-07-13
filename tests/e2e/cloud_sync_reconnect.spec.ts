import { test, expect, type Page } from '@playwright/test';

import {
  collectRuntimeIssues,
  expectCloudSyncPanel,
  expectExportSurface,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  openMainTab,
  readCloudSyncGatewayRequests,
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

  test('switching from public to a newly created private room replaces the active owner without reload', async ({
    page,
  }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page, { initialCloudSyncRoom: 'public' });

    await openMainTab(page, 'settings');
    await expectCloudSyncPanel(page);
    await expect(page.locator('[data-testid="cloud-sync-status"]')).toContainText('ציבורי');

    const roomModeButton = page.locator('button[data-testid="cloud-sync-room-mode-button"]');
    await expect(roomModeButton).toContainText('עבור לפרטי');
    await roomModeButton.click();

    await expect(page.locator('[data-testid="cloud-sync-status"]')).toContainText('חדר פרטי');
    await expect(roomModeButton).toContainText('עבור לציבורי');

    await expect
      .poll(
        async () => {
          const room = new URL(page.url()).hash
            .slice(1)
            .split('&')
            .map(part => part.split('=').map(decodeURIComponent))
            .find(([key]) => key === 'room')?.[1];
          return room || '';
        },
        { message: 'the main site URL should commit the new private room' }
      )
      .toMatch(/^room_e2e_/);

    const roomFromUrl = new URL(page.url()).hash
      .slice(1)
      .split('&')
      .map(part => part.split('=').map(decodeURIComponent))
      .find(([key]) => key === 'room')?.[1];
    expect(roomFromUrl).toBeTruthy();
    expect(new URL(page.url()).hash).not.toContain('roomToken=');

    await expect
      .poll(
        () =>
          readCloudSyncGatewayRequests(page).some(
            request => request.action === 'write' && request.room === roomFromUrl
          ),
        {
          message: 'the newly installed main-row owner should seed the new private room without reload',
        }
      )
      .toBe(true);

    expectNoRuntimeIssues(issues);
  });
});
