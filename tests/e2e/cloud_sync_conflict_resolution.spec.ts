import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';

import {
  collectRuntimeIssues,
  createCloudSyncGatewayIsolationState,
  gotoSmokeApp,
  openMainTab,
  readCloudSyncGatewayRequests,
} from './helpers/project_flows';

const ROOM = 'e2e-conflict-lock-room';

function createRoomToken(): string {
  const expiresAtMs = Date.now() + 86_400_000;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: Math.floor(expiresAtMs / 1000) })}.e2e`;
}

async function createSecondContextPage(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const baseURL = String(testInfo.project.use.baseURL || 'http://127.0.0.1:5174');
  const context = await browser.newContext({ baseURL });
  return await context.newPage();
}

async function saveSharedColor(page: Page): Promise<string> {
  await openMainTab(page, 'design');
  await page.locator('[data-testid="design-custom-color-toggle"]').click();
  await page.locator('[data-testid="design-custom-color-input"]').fill('#222222');
  await page.locator('[data-testid="design-custom-color-save-button"]').click();
  const prompt = page.locator('#customPromptModal.open');
  await expect(prompt).toBeVisible();
  await prompt.locator('#modalInput').fill('Conflict E2E');
  await prompt.locator('#modalConfirmBtn').click();
  const swatch = page.locator('[data-testid="design-color-swatch-item"][data-color-kind="saved"]').last();
  await expect(swatch).toBeVisible();
  const id = await swatch.getAttribute('data-color-id');
  expect(id).toBeTruthy();
  return id!;
}

function savedSwatch(page: Page, id: string) {
  return page.locator(
    `[data-testid="design-color-swatch-item"][data-color-kind="saved"][data-color-id="${id}"]`
  );
}

test.describe('Cloud Sync conflict resolution contention', () => {
  test('two browser contexts resolve the same remote entity conflict without a blind overwrite', async ({
    page,
    browser,
  }, testInfo) => {
    const secondPage = await createSecondContextPage(browser, testInfo);
    const firstIssues = collectRuntimeIssues(page);
    const secondIssues = collectRuntimeIssues(secondPage);
    const gateway = createCloudSyncGatewayIsolationState();
    gateway.readDelayMs = 150;
    const token = createRoomToken();
    const gotoOptions = {
      cloudSyncRoom: ROOM,
      cloudSyncRoomToken: token,
      cloudSyncGatewayState: gateway,
    } as const;

    await gotoSmokeApp(page, gotoOptions);
    await expect
      .poll(() => gateway.rows.get(ROOM)?.revision || 0, {
        message: 'the first context should seed the shared room',
      })
      .toBeGreaterThan(0);

    const colorId = await saveSharedColor(page);
    await expect
      .poll(
        () => {
          const colors = gateway.rows.get(ROOM)?.payload.savedColors;
          return Array.isArray(colors) && colors.some(color => (color as { id?: string }).id === colorId);
        },
        { message: 'the saved color should reach the shared remote row' }
      )
      .toBe(true);

    await gotoSmokeApp(secondPage, gotoOptions);
    await openMainTab(secondPage, 'design');
    await expect(savedSwatch(secondPage, colorId)).toBeVisible();

    const thirdClientBase = gateway.rows.get(ROOM);
    expect(thirdClientBase).toBeTruthy();
    const thirdClientColors = (thirdClientBase!.payload.savedColors as Array<Record<string, unknown>>).map(
      color => (color.id === colorId ? { ...color, value: '#333333' } : color)
    );
    gateway.rows.set(ROOM, {
      ...thirdClientBase!,
      payload: {
        ...thirdClientBase!.payload,
        savedColors: thirdClientColors,
        savedModels: [{ id: 'third-model', name: 'Third client model' }],
      },
      revision: thirdClientBase!.revision + 1,
      updated_at: new Date().toISOString(),
      updated_by: 'third-client',
    });

    const firstSavedSwatch = savedSwatch(page, colorId);
    await expect(firstSavedSwatch).toBeVisible();
    const lockMutation = firstSavedSwatch.locator('[data-testid="design-color-swatch-lock-button"]').click();

    await savedSwatch(secondPage, colorId).click();
    const deleteMutation = secondPage.locator('[data-testid="design-selected-color-delete-button"]').click();
    await Promise.all([lockMutation, deleteMutation]);
    const deleteConfirm = secondPage.locator('#customPromptModal.open');
    await expect(deleteConfirm).toBeVisible();
    await deleteConfirm.locator('#modalConfirmBtn').click();

    await Promise.all([openMainTab(page, 'settings'), openMainTab(secondPage, 'settings')]);
    const firstResolution = page.locator('[data-testid="cloud-sync-conflict-resolution"]');
    const secondResolution = secondPage.locator('[data-testid="cloud-sync-conflict-resolution"]');
    await expect(firstResolution).toBeVisible({ timeout: 15_000 });
    await expect(secondResolution).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.locator('[data-testid="cloud-sync-conflict-keep-local"]').click(),
      secondPage.locator('[data-testid="cloud-sync-conflict-use-remote"]').click(),
    ]);

    await expect(firstResolution).toHaveCount(0);
    await expect(secondResolution).toHaveCount(0);
    await expect
      .poll(
        () =>
          [page, secondPage].reduce(
            (count, currentPage) =>
              count +
              readCloudSyncGatewayRequests(currentPage).filter(
                request => request.action === 'write' && request.room === ROOM
              ).length,
            0
          ),
        { message: 'the conflict resolution should produce one confirmed keep-local write' }
      )
      .toBeGreaterThanOrEqual(1);

    const finalColors = gateway.rows.get(ROOM)?.payload.savedColors as Array<Record<string, unknown>>;
    expect(finalColors.find(color => color.id === colorId)).toMatchObject({
      id: colorId,
      value: '#222222',
      locked: true,
    });
    expect(gateway.rows.get(ROOM)?.payload.savedModels).toEqual([
      { id: 'third-model', name: 'Third client model' },
    ]);
    expect(firstIssues.pageErrors).toEqual([]);
    expect(secondIssues.pageErrors).toEqual([]);
    const expectedConflictConsole = [...firstIssues.consoleErrors, ...secondIssues.consoleErrors];
    expect(expectedConflictConsole.length).toBeGreaterThan(0);
    expect(expectedConflictConsole.every(message => message.includes('409 (Conflict)'))).toBe(true);
    await secondPage.context().close();
  });
});
