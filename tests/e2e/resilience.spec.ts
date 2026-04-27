import { writeFileSync } from 'node:fs';

import { test, expect } from '@playwright/test';

import {
  addSavedDesignColor,
  collectRuntimeIssues,
  countSavedDesignColorSwatches,
  expectNoRuntimeIssues,
  expectPerfMetricCount,
  expectRestoreLastSessionUnavailable,
  expectUiStateFingerprint,
  fillProjectName,
  getSavedDesignColorSwatch,
  getAnyProjectNameInput,
  gotoSmokeApp,
  importSettingsBackupFromFile,
  loadProjectViaHeader,
  readPerfEntries,
  readUiStateFingerprint,
} from './helpers/project_flows';

test.describe('Playwright resilience flows', () => {
  test('invalid project load reports failure, keeps the app stable, and records an error perf entry', async ({
    page,
  }, testInfo) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const originalName = `Stable Name ${Date.now()}`;
    await fillProjectName(page, originalName);
    const expectedState = await readUiStateFingerprint(page);

    const invalidProjectPath = testInfo.outputPath('invalid-project.json');
    writeFileSync(invalidProjectPath, JSON.stringify({ projectName: 'invalid-fixture' }), 'utf8');

    const loadDetail = await loadProjectViaHeader(page, invalidProjectPath);
    expect(loadDetail.ok).toBe(false);
    expect(['invalid', 'error']).toContain(String(loadDetail.reason || ''));
    await expect(getAnyProjectNameInput(page)).toHaveValue(originalName);
    await expectUiStateFingerprint(page, expectedState, 'Invalid project load changed persisted UI state');

    await expectPerfMetricCount(page, 'project.load', 1);
    const loadEntries = await readPerfEntries(page, 'project.load');
    expect(loadEntries.some(entry => entry.status === 'error')).toBe(true);

    expectNoRuntimeIssues(issues);
  });

  test('restore-last-session without autosave stays unavailable and keeps user state', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const originalName = `No Autosave ${Date.now()}`;
    await fillProjectName(page, originalName);
    const expectedState = await readUiStateFingerprint(page);
    await page.evaluate(() => window.localStorage.removeItem('wardrobe_autosave_latest'));

    await expectRestoreLastSessionUnavailable(page);
    await expect(getAnyProjectNameInput(page)).toHaveValue(originalName);
    await expectUiStateFingerprint(page, expectedState, 'Missing autosave restore mutated user state');

    const restoreEntries = await readPerfEntries(page, 'project.restoreLastSession');
    expect(restoreEntries).toEqual([]);

    expectNoRuntimeIssues(issues);
  });

  test('invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry', async ({
    page,
  }, testInfo) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const uniqueColor = `#${String(Date.now() % 0xffffff)
      .padStart(6, '0')
      .slice(-6)}`;
    const initialSavedColorCount = await countSavedDesignColorSwatches(page);
    const savedColorValue = await addSavedDesignColor(page, uniqueColor);
    await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
    const expectedState = await readUiStateFingerprint(page);

    const invalidBackupPath = testInfo.outputPath('invalid-settings-backup.json');
    writeFileSync(
      invalidBackupPath,
      `${JSON.stringify({ broken: true, savedColors: null }, null, 2)}\n`,
      'utf8'
    );

    await importSettingsBackupFromFile(page, invalidBackupPath);

    expect(await countSavedDesignColorSwatches(page)).toBe(initialSavedColorCount + 1);
    await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
    await expectUiStateFingerprint(
      page,
      expectedState,
      'Invalid settings backup import mutated saved user state'
    );

    await expectPerfMetricCount(page, 'settingsBackup.import', 1);
    const importEntries = await readPerfEntries(page, 'settingsBackup.import');
    expect(importEntries.at(-1)?.status).toBe('error');

    expectNoRuntimeIssues(issues);
  });
});
