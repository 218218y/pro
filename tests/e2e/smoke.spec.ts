import { test, expect } from '@playwright/test';

import {
  closeOrderPdfOverlay,
  collectRuntimeIssues,
  expectCloudSyncPanel,
  expectExportSurface,
  expectNoRuntimeIssues,
  expectOrderPdfOverlayToolbar,
  fillProjectName,
  getVisibleProjectNameInput,
  gotoSmokeApp,
  loadProjectViaHeader,
  openMainTab,
  openOrderPdfOverlayFromExport,
  openOrderPdfOverlayFromHeader,
  resetProjectViaHeader,
  saveProjectViaHeader,
  toggleCloudSyncFloatingPin,
  toggleSwitchByTestId,
} from './helpers/project_flows';

test.describe('Playwright smoke flows', () => {
  test('boot, viewport, tabs and render toggles stay stable', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const tabs = ['structure', 'design', 'interior', 'render', 'export'] as const;
    for (const id of tabs) await openMainTab(page, id);

    await openMainTab(page, 'render');
    const renderPanel = page.locator('.tab-content[data-tab="render"]');
    await toggleSwitchByTestId(renderPanel, 'toggle-global-click');
    await toggleSwitchByTestId(renderPanel, 'toggle-sketch-mode');
    await toggleSwitchByTestId(renderPanel, 'toggle-notes');
    await expect(page.locator('#notes-overlay')).toBeVisible();
    await toggleSwitchByTestId(renderPanel, 'toggle-notes');

    const headerSketchToggle = page.locator('button[data-testid="header-sketch-toggle-button"]');
    await expect(headerSketchToggle).toBeVisible();
    const sketchBefore = await headerSketchToggle.getAttribute('aria-pressed');
    await headerSketchToggle.click();
    await expect(headerSketchToggle).not.toHaveAttribute('aria-pressed', sketchBefore ?? 'false');
    await headerSketchToggle.click();
    await expect(headerSketchToggle).toHaveAttribute('aria-pressed', sketchBefore ?? 'false');

    expectNoRuntimeIssues(issues);
  });

  test('header save-load roundtrip restores project name', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const savedName = `Smoke Header Save ${Date.now()}`;
    const changedName = `Changed ${Date.now()}`;

    await fillProjectName(page, savedName);
    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'smoke-header-roundtrip');
    expect(saveDetail.ok).toBe(true);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    await fillProjectName(page, changedName);
    const loadDetail = await loadProjectViaHeader(page, downloadPath!);
    expect(loadDetail.ok).toBe(true);
    await expect(getVisibleProjectNameInput(page)).toHaveValue(savedName);

    expectNoRuntimeIssues(issues);
  });

  test('header reset default replaces the current project cleanly', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const currentName = `Reset Header ${Date.now()}`;
    await fillProjectName(page, currentName);
    await resetProjectViaHeader(page, currentName);

    expectNoRuntimeIssues(issues);
  });

  test('order pdf overlay opens from export and header with stable toolbar', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    await expectExportSurface(page);
    await openOrderPdfOverlayFromExport(page);
    await expectOrderPdfOverlayToolbar(page);
    await closeOrderPdfOverlay(page);

    await openOrderPdfOverlayFromHeader(page);
    await expectOrderPdfOverlayToolbar(page);
    await closeOrderPdfOverlay(page);

    expectNoRuntimeIssues(issues);
  });

  test('export tab keeps cloud-sync surface interactive', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    await expectExportSurface(page);
    await expectCloudSyncPanel(page);
    await toggleCloudSyncFloatingPin(page);

    expectNoRuntimeIssues(issues);
  });
});
