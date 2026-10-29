import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import {
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  openMainTab,
} from './helpers/project_flows';

test('settings composite PDF buttons download actual A4 pages', async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  await openMainTab(page, 'settings');

  for (const { id, title, filename } of [
    {
      id: 'export-dual-image-a4-pdf-button',
      title: 'פתוח/סגור PDF A4',
      filename: 'wardrobe-design-open-closed-a4.pdf',
    },
    {
      id: 'export-render-sketch-a4-pdf-button',
      title: 'סקיצה/הדמיה PDF A4',
      filename: 'wardrobe-render-sketch-a4.pdf',
    },
  ]) {
    const button = page.getByTestId(id);
    await expect(button.locator('.wp-r-settings-action-title')).toHaveText(title);
    await expect(button.locator('.wp-r-settings-action-sub')).toHaveText('עמוד A4 להוספה ל-PDF קיים');

    const downloadPromise = page.waitForEvent('download');
    await button.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(filename);
    expect(await download.failure()).toBeNull();
    const file = await download.path();
    expect(file).toBeTruthy();
    const pdf = await PDFDocument.load(await readFile(file!));
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo((210 / 25.4) * 72, 3);
    expect(height).toBeCloseTo((297 / 25.4) * 72, 3);
  }

  expectNoRuntimeIssues(issues);
});
