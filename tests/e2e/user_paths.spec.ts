import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  createCabinetDoorDrawerLayoutFixture,
  createCabinetDoorDrawerLayoutScenarioMatrix,
  readCabinetDoorDrawerLayoutProjectSubset,
} from './helpers/cabinet_door_drawer_layout_fixture.js';
import { requiredProjectActions } from './helpers/perf_contracts.js';
import {
  addSavedDesignColor,
  closeOrderPdfOverlay,
  collectRuntimeIssues,
  countSavedDesignColorSwatches,
  deleteSavedDesignColor,
  expectCabinetCoreFingerprint,
  expectCloudSyncPanel,
  expectSettingsBackupPanel,
  expectExportSurface,
  expectNoPerfErrors,
  expectNoRuntimeIssues,
  expectPerfMetricCount,
  expectPerfMetrics,
  expectUiStateFingerprint,
  exportSettingsBackup,
  exportSnapshotFromExport,
  fillProjectName,
  expectCabinetDoorDrawerAuthoringFingerprint,
  getSavedDesignColorSwatch,
  getAnyProjectNameInput,
  gotoSmokeApp,
  importSettingsBackupFromFile,
  installClipboardCapture,
  loadProjectViaHeader,
  openMainTab,
  openOrderPdfOverlayFromExport,
  openOrderPdfOverlayFromHeader,
  readClipboardWriteCount,
  readPerfEntries,
  readProjectActionEvents,
  readCabinetCoreFingerprint,
  readCabinetDoorDrawerAuthoringFingerprint,
  readUiStateFingerprint,
  resetProjectViaHeader,
  restoreLastSessionViaProjectPanel,
  saveProjectViaHeader,
  seedAutosaveStorageFromFile,
  setBoardMaterial,
  setDoorAuthoringMode,
  setDoorFeatureToggle,
  setDoorStyle,
  setExternalDrawerSelection,
  setGrooveLinesCount,
  setInternalDrawerMode,
  setInternalDrawersEnabled,
  setRenderSketchMode,
  setStructureDimension,
  setStructureType,
  toggleCloudSyncFloatingPin,
  toggleSwitchByTestId,
  triggerClipboardExportAction,
} from './helpers/project_flows';

const recoveryMetricNames = ['settingsBackup.import', 'project.restoreLastSession'] as const;
const primaryJourneyMetrics = [
  'boot.browser.setup',
  'boot.react.mount.reactSidebarRoot',
  'project.save',
  'project.load',
  'project.resetDefault',
  'export.snapshot',
  'export.copy',
  'export.renderSketch',
  'export.dual',
  'render.globalClick.toggle',
  'render.sketchMode.toggle',
  'render.notes.toggle',
  'cloudSync.floatingSync.toggle',
  'orderPdf.open',
  'orderPdf.close',
  'settingsBackup.export',
] as const satisfies readonly string[];
const primaryHappyPathMetrics = primaryJourneyMetrics.filter(
  name => !recoveryMetricNames.includes(name as never)
);
const primaryProjectActions = requiredProjectActions.filter(action => action !== 'restore-last-session');

async function readPerfStateFingerprint(page: any) {
  const fingerprint = await page.evaluate(() => window.__WP_PERF__?.getStateFingerprint?.() || null);
  if (!fingerprint) throw new Error('Expected __WP_PERF__.getStateFingerprint() during E2E smoke');
  return fingerprint as Record<string, unknown>;
}

function readSavedProjectPayloadSubset(savedProjectPath: string): Promise<Record<string, unknown>> {
  return fs
    .readFile(savedProjectPath, 'utf8')
    .then(
      raw =>
        readCabinetDoorDrawerLayoutProjectSubset(JSON.parse(raw) as Record<string, unknown>) as Record<
          string,
          unknown
        >
    );
}

function pickExpectedSubset(actual: Record<string, unknown>, expected: Record<string, unknown>) {
  return Object.fromEntries(Object.keys(expected).map(key => [key, actual[key]]));
}

test.describe('Playwright real user paths', () => {
  test('primary user journey records canonical runtime perf metrics', async ({ page }) => {
    test.slow();
    const issues = collectRuntimeIssues(page);
    await installClipboardCapture(page);
    await gotoSmokeApp(page);

    await openMainTab(page, 'render');
    const renderPanel = page.locator('.tab-content[data-tab="render"]');
    await toggleSwitchByTestId(renderPanel, 'toggle-global-click');
    await toggleSwitchByTestId(renderPanel, 'toggle-sketch-mode');
    await toggleSwitchByTestId(renderPanel, 'toggle-notes');
    await toggleSwitchByTestId(renderPanel, 'toggle-notes');

    await expectExportSurface(page);
    await expectCloudSyncPanel(page);
    await expectSettingsBackupPanel(page);

    const snapshotDownload = await exportSnapshotFromExport(page);
    expect(await snapshotDownload.path()).toBeTruthy();

    await triggerClipboardExportAction(page, 'export-copy-button', 'export.copy');
    await triggerClipboardExportAction(page, 'export-render-sketch-button', 'export.renderSketch');
    await triggerClipboardExportAction(page, 'export-dual-image-button', 'export.dual');

    const settingsBackupDownload = await exportSettingsBackup(page);
    expect(await settingsBackupDownload.path()).toBeTruthy();
    expect(await readClipboardWriteCount(page)).toBeGreaterThanOrEqual(3);

    await toggleCloudSyncFloatingPin(page);

    await openOrderPdfOverlayFromExport(page);
    await closeOrderPdfOverlay(page);
    await openOrderPdfOverlayFromHeader(page);
    await closeOrderPdfOverlay(page);

    const savedName = `Journey Save ${Date.now()}`;
    await fillProjectName(page, savedName);
    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'journey-save-load');
    expect(saveDetail.ok).toBe(true);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    await fillProjectName(page, `Changed ${Date.now()}`);
    const loadDetail = await loadProjectViaHeader(page, downloadPath!);
    expect(loadDetail.ok).toBe(true);
    await expect(getAnyProjectNameInput(page)).toHaveValue(savedName);

    await resetProjectViaHeader(page, savedName);

    await expectPerfMetrics(page, primaryJourneyMetrics);
    await expectNoPerfErrors(page, primaryHappyPathMetrics);

    const actionEvents = await readProjectActionEvents(page);
    for (const action of primaryProjectActions) {
      expect(actionEvents.some(event => event.action === action && event.ok === true)).toBe(true);
    }

    const orderPdfEntries = await readPerfEntries(page, 'orderPdf.open');
    expect(orderPdfEntries.length).toBeGreaterThanOrEqual(2);

    expectNoRuntimeIssues(issues);
  });

  test('repeated export and pdf pressure preserves user state', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await installClipboardCapture(page);
    await gotoSmokeApp(page);

    const uniqueColor = `#${String(Date.now() % 0xffffff)
      .padStart(6, '0')
      .slice(-6)}`;
    const savedColorValue = await addSavedDesignColor(page, uniqueColor);
    const stableName = `Pressure Stable ${Date.now()}`;
    await fillProjectName(page, stableName);
    const expectedState = await readUiStateFingerprint(page);

    await openMainTab(page, 'export');
    for (let i = 0; i < 3; i += 1) {
      await triggerClipboardExportAction(page, 'export-copy-button', 'export.copy');
      await triggerClipboardExportAction(page, 'export-render-sketch-button', 'export.renderSketch');
      await triggerClipboardExportAction(page, 'export-dual-image-button', 'export.dual');
      await openOrderPdfOverlayFromExport(page);
      await closeOrderPdfOverlay(page);
    }

    await expectUiStateFingerprint(
      page,
      expectedState,
      'Repeated export/pdf pressure should preserve user state'
    );
    await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
    expect(await readClipboardWriteCount(page)).toBeGreaterThanOrEqual(9);
    await expectPerfMetricCount(page, 'export.copy', 3);
    await expectPerfMetricCount(page, 'export.renderSketch', 3);
    await expectPerfMetricCount(page, 'export.dual', 3);
    await expectPerfMetricCount(page, 'orderPdf.open', 3);
    await expectPerfMetricCount(page, 'orderPdf.close', 3);

    expectNoRuntimeIssues(issues);
  });

  test('cabinet core dimensions, colors, and sketch survive project roundtrip', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const uniqueColor = `#${String(Date.now() % 0xffffff)
      .padStart(6, '0')
      .slice(-6)}`;
    const projectName = `Cabinet Core ${Date.now()}`;

    await fillProjectName(page, projectName);
    await setStructureDimension(page, 'width', 195);
    await setStructureDimension(page, 'height', 247);
    await setStructureDimension(page, 'depth', 62);
    const savedColorValue = await addSavedDesignColor(page, uniqueColor);
    await setRenderSketchMode(page, true);

    const expectedState = await readCabinetCoreFingerprint(page);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'cabinet-core-roundtrip');
    expect(saveDetail.ok).toBe(true);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    await fillProjectName(page, `Cabinet Mutated ${Date.now()}`);
    await setStructureDimension(page, 'width', 160);
    await setStructureDimension(page, 'height', 230);
    await setStructureDimension(page, 'depth', 55);
    await deleteSavedDesignColor(page, savedColorValue);
    await setRenderSketchMode(page, false);

    const loadDetail = await loadProjectViaHeader(page, downloadPath!);
    expect(loadDetail.ok).toBe(true);
    await expectCabinetCoreFingerprint(
      page,
      expectedState,
      'Project roundtrip should rebuild core cabinet dimensions, saved colors, and sketch mode'
    );

    await expectPerfMetricCount(page, 'structure.dimensions.width.commit', 2);
    await expectPerfMetricCount(page, 'structure.dimensions.height.commit', 2);
    await expectPerfMetricCount(page, 'structure.dimensions.depth.commit', 2);
    await expectPerfMetricCount(page, 'design.savedColor.add', 1);
    await expectPerfMetricCount(page, 'design.savedColor.delete', 1);
    await expectPerfMetricCount(page, 'render.sketchMode.toggle', 2);

    expectNoRuntimeIssues(issues);
  });

  test('cabinet authoring options survive project roundtrip', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    await fillProjectName(page, `Cabinet Options ${Date.now()}`);
    await setStructureType(page, 'hinged');
    await setBoardMaterial(page, 'sandwich');
    await setDoorStyle(page, 'profile');
    await setDoorFeatureToggle(page, 'groovesEnabled', true);
    await setGrooveLinesCount(page, 12);
    await setDoorFeatureToggle(page, 'splitDoors', true);
    await setDoorFeatureToggle(page, 'removeDoorsEnabled', true);
    await setInternalDrawersEnabled(page, true);
    await setExternalDrawerSelection(page, 'regular', 3, { exitAfterSelect: true });

    const expectedCoreState = await readCabinetCoreFingerprint(page);
    const expectedAuthoringState = await readCabinetDoorDrawerAuthoringFingerprint(page);

    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'cabinet-authoring-options');
    expect(saveDetail.ok).toBe(true);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    await fillProjectName(page, `Cabinet Options Mutated ${Date.now()}`);
    await setBoardMaterial(page, 'melamine');
    await setDoorStyle(page, 'post');
    await setDoorFeatureToggle(page, 'groovesEnabled', false);
    await setDoorFeatureToggle(page, 'splitDoors', false);
    await setDoorFeatureToggle(page, 'removeDoorsEnabled', false);
    await setInternalDrawersEnabled(page, false);
    await setExternalDrawerSelection(page, 'shoe', undefined, { exitAfterSelect: true });

    expect(await readCabinetCoreFingerprint(page)).not.toEqual(expectedCoreState);
    expect(await readCabinetDoorDrawerAuthoringFingerprint(page)).not.toEqual(expectedAuthoringState);

    await loadProjectViaHeader(page, downloadPath!);
    await expectCabinetCoreFingerprint(
      page,
      expectedCoreState,
      'Project roundtrip should preserve cabinet structure/material/door feature authoring state'
    );
    await expectCabinetDoorDrawerAuthoringFingerprint(
      page,
      expectedAuthoringState,
      'Project roundtrip should preserve cabinet door/drawer authoring toggles and selections'
    );

    expectNoRuntimeIssues(issues);
  });

  test('project roundtrip preserves authored door and drawer layout maps', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const seedName = `Door Drawer Layout Seed ${Date.now()}`;
    await fillProjectName(page, seedName);
    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'door-drawer-layout-seed');
    expect(saveDetail.ok).toBe(true);
    const seedProjectPath = await download.path();
    expect(seedProjectPath).toBeTruthy();

    const seedProject = JSON.parse(await fs.readFile(seedProjectPath!, 'utf8')) as Record<string, unknown>;
    const { project: authoredProject, expectedFingerprint } =
      createCabinetDoorDrawerLayoutFixture(seedProject);
    const authoredFixturePath = path.join(os.tmpdir(), `door-drawer-layout-${Date.now()}.json`);
    await fs.writeFile(authoredFixturePath, `${JSON.stringify(authoredProject, null, 2)}\n`, 'utf8');

    const authoredLoadDetail = await loadProjectViaHeader(page, authoredFixturePath);
    expect(authoredLoadDetail.ok).toBe(true);
    const authoredFingerprint = await readPerfStateFingerprint(page);
    expect(pickExpectedSubset(authoredFingerprint, expectedFingerprint)).toEqual(expectedFingerprint);

    const { download: authoredDownload, detail: authoredSaveDetail } = await saveProjectViaHeader(
      page,
      'door-drawer-layout-authored'
    );
    expect(authoredSaveDetail.ok).toBe(true);
    const authoredProjectPath = await authoredDownload.path();
    expect(authoredProjectPath).toBeTruthy();
    expect(await readSavedProjectPayloadSubset(authoredProjectPath!)).toEqual(
      readCabinetDoorDrawerLayoutProjectSubset(authoredProject) as Record<string, unknown>
    );

    await fillProjectName(page, `Door Drawer Layout Mutated ${Date.now()}`);
    const authoredReloadDetail = await loadProjectViaHeader(page, authoredProjectPath!);
    expect(authoredReloadDetail.ok).toBe(true);
    const reloadedFingerprint = await readPerfStateFingerprint(page);
    expect(pickExpectedSubset(reloadedFingerprint, expectedFingerprint)).toEqual(expectedFingerprint);

    expectNoRuntimeIssues(issues);
  });

  test('project roundtrip preserves authored door and drawer layout scenario matrix', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const seedName = `Door Drawer Layout Matrix Seed ${Date.now()}`;
    await fillProjectName(page, seedName);
    const { download, detail: saveDetail } = await saveProjectViaHeader(
      page,
      'door-drawer-layout-matrix-seed'
    );
    expect(saveDetail.ok).toBe(true);
    const seedProjectPath = await download.path();
    expect(seedProjectPath).toBeTruthy();

    const seedProject = JSON.parse(await fs.readFile(seedProjectPath!, 'utf8')) as Record<string, unknown>;
    const authoredScenarios = createCabinetDoorDrawerLayoutScenarioMatrix(seedProject);

    for (const { scenario, project: authoredProject, expectedFingerprint } of authoredScenarios) {
      const authoredFixturePath = path.join(os.tmpdir(), `door-drawer-layout-${scenario}-${Date.now()}.json`);
      await fs.writeFile(authoredFixturePath, `${JSON.stringify(authoredProject, null, 2)}\n`, 'utf8');

      const authoredLoadDetail = await loadProjectViaHeader(page, authoredFixturePath);
      expect(authoredLoadDetail.ok).toBe(true);
      const authoredFingerprint = await readPerfStateFingerprint(page);
      expect(pickExpectedSubset(authoredFingerprint, expectedFingerprint)).toEqual(expectedFingerprint);

      const { download: authoredDownload, detail: authoredSaveDetail } = await saveProjectViaHeader(
        page,
        `door-drawer-layout-${scenario}`
      );
      expect(authoredSaveDetail.ok).toBe(true);
      const authoredProjectPath = await authoredDownload.path();
      expect(authoredProjectPath).toBeTruthy();
      expect(await readSavedProjectPayloadSubset(authoredProjectPath!)).toEqual(
        readCabinetDoorDrawerLayoutProjectSubset(authoredProject) as Record<string, unknown>
      );

      await fillProjectName(page, `Door Drawer Layout Mutated ${scenario} ${Date.now()}`);
      const authoredReloadDetail = await loadProjectViaHeader(page, authoredProjectPath!);
      expect(authoredReloadDetail.ok).toBe(true);
      const reloadedFingerprint = await readPerfStateFingerprint(page);
      expect(pickExpectedSubset(reloadedFingerprint, expectedFingerprint)).toEqual(expectedFingerprint);
    }

    expectNoRuntimeIssues(issues);
  });

  test('settings backup import and restore-last-session recover real user state', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const uniqueColor = `#${String(Date.now() % 0xffffff)
      .padStart(6, '0')
      .slice(-6)}`;
    const beforeSavedColorCount = await countSavedDesignColorSwatches(page);
    const savedColorValue = await addSavedDesignColor(page, uniqueColor);
    expect(await countSavedDesignColorSwatches(page)).toBe(beforeSavedColorCount + 1);
    await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);

    await openMainTab(page, 'export');
    const backupDownload = await exportSettingsBackup(page);
    const backupPath = await backupDownload.path();
    expect(backupPath).toBeTruthy();

    await deleteSavedDesignColor(page, savedColorValue);
    expect(await countSavedDesignColorSwatches(page)).toBe(beforeSavedColorCount);
    await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(0);

    await importSettingsBackupFromFile(page, backupPath!);
    await openMainTab(page, 'design');
    await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
    expect(await countSavedDesignColorSwatches(page)).toBe(beforeSavedColorCount + 1);

    const importedState = await readUiStateFingerprint(page);
    await importSettingsBackupFromFile(page, backupPath!);
    await expectUiStateFingerprint(page, importedState, 'Settings backup re-import should stay idempotent');
    await expectPerfMetricCount(page, 'settingsBackup.import', 2);

    const savedName = `Restore Seed ${Date.now()}`;
    await fillProjectName(page, savedName);
    const expectedRestoredState = await readUiStateFingerprint(page);
    const { download, detail: saveDetail } = await saveProjectViaHeader(page, 'restore-session-seed');
    expect(saveDetail.ok).toBe(true);
    const savedProjectPath = await download.path();
    expect(savedProjectPath).toBeTruthy();

    await seedAutosaveStorageFromFile(page, savedProjectPath!);
    await gotoSmokeApp(page);
    await fillProjectName(page, `Mutated ${Date.now()}`);
    const restoreDetail = await restoreLastSessionViaProjectPanel(page, savedName);
    expect(restoreDetail.ok).toBe(true);
    await expectUiStateFingerprint(
      page,
      expectedRestoredState,
      'Restore-last-session should rebuild saved user state'
    );

    await fillProjectName(page, `Mutated Again ${Date.now()}`);
    const secondRestoreDetail = await restoreLastSessionViaProjectPanel(page, savedName);
    expect(secondRestoreDetail.ok).toBe(true);
    await expectUiStateFingerprint(
      page,
      expectedRestoredState,
      'Repeated restore-last-session should remain stable'
    );

    await expectPerfMetricCount(page, 'project.restoreLastSession', 2);

    const actionEvents = await readProjectActionEvents(page);
    expect(
      actionEvents.filter(event => event.action === 'restore-last-session' && event.ok === true)
    ).toHaveLength(2);

    expectNoRuntimeIssues(issues);
  });
});
