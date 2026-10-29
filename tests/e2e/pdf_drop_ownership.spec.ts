import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import {
  gotoSmokeApp,
  openOrderPdfOverlayFromHeader,
  collectRuntimeIssues,
  expectNoRuntimeIssues,
} from './helpers/project_flows';

test('PDF portal consumes file drops without invoking the project importer', async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  await openOrderPdfOverlayFromHeader(page);
  const pdf = await PDFDocument.create();
  const form = pdf.getForm();
  const field = form.createTextField('customer_name');
  field.setText('PDF drop regression');
  field.addToPage(pdf.addPage([595, 842]));
  const bytes = Array.from(await pdf.save());
  const transfer = await page.evaluateHandle(bytes => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], 'existing.pdf', { type: 'application/pdf' }));
    return dt;
  }, bytes);
  const stage = page.locator('[data-file-drop-owner="order-pdf"]');
  const unexpectedToasts: string[] = [];
  await page.exposeFunction('recordProjectDropError', (message: string) => unexpectedToasts.push(message));
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.body.textContent?.includes('אנא גרור קובץ פרויקט')) {
        (window as unknown as { recordProjectDropError: (text: string) => void }).recordProjectDropError(
          'project error'
        );
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await stage.dispatchEvent('dragover', { dataTransfer: transfer });
  await stage.dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.locator('.wp-pdf-editor-stage [name="projectName"]')).toHaveValue('PDF drop regression');
  expect(unexpectedToasts).toEqual([]);
  await expect(page.locator('body')).not.toHaveClass(/is-dragover/);
  expectNoRuntimeIssues(issues);
});
