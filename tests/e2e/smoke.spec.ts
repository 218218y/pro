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
  toggleHeaderSketchMode,
  toggleViewerContentsVisibility,
  toggleViewerNoteDrawMode,
  toggleViewerNotesVisibility,
  toggleSwitchByTestId,
} from './helpers/project_flows';

test.describe('Playwright smoke flows', () => {
  test('boot, viewport, tabs and render toggles stay stable @critical', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const tabs = ['structure', 'design', 'interior', 'sketch', 'settings'] as const;
    for (const id of tabs) await openMainTab(page, id);

    await openMainTab(page, 'settings');
    const settingsPanel = page.locator('.tab-content[data-tab="settings"]');
    await toggleSwitchByTestId(settingsPanel, 'toggle-global-click');
    await expect(settingsPanel.locator('input[data-testid="toggle-sketch-mode"]')).toHaveCount(0);
    await expect(settingsPanel.locator('input[data-testid="toggle-notes"]')).toHaveCount(0);

    await toggleViewerNoteDrawMode(page);
    await toggleViewerNoteDrawMode(page);
    await toggleViewerNotesVisibility(page);
    await toggleViewerNotesVisibility(page);
    await toggleViewerContentsVisibility(page);
    await toggleViewerContentsVisibility(page);
    await toggleHeaderSketchMode(page);
    await toggleHeaderSketchMode(page);

    expectNoRuntimeIssues(issues);
  });

  test('header save-load roundtrip restores project name @critical', async ({ page }) => {
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

  test('order pdf overlay opens from export and header with stable toolbar @critical', async ({ page }) => {
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

  test('settings tab keeps cloud-sync surface interactive', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    await expectExportSurface(page);
    await expectCloudSyncPanel(page);
    await toggleCloudSyncFloatingPin(page);

    expectNoRuntimeIssues(issues);
  });
});
