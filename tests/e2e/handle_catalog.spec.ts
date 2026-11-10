import { test, expect } from '@playwright/test';
import {
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  inspectCanvasViaDebugNdc,
  loadProjectViaHeader,
  openMainTab,
  readDebugStoreState,
  saveProjectViaHeader,
} from './helpers/project_flows';
import { expectHealthySceneGeometry, readSceneGeometrySnapshot } from './helpers/critical_matrix';

test('catalog selection builds real geometry and survives history and a project round trip', async ({
  page,
}, info) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  await openMainTab(page, 'interior');
  const global = page.getByTestId('handle-picker-global');
  const summary = global.getByText('כל סוגי הידיות');
  const baseline = await readSceneGeometrySnapshot(page);
  const sizes = global.getByLabel('מרחק בין חורים');
  await expect(sizes).toHaveValue('128');
  expect(
    await sizes.evaluate(node =>
      Boolean(
        node.compareDocumentPosition(node.closest('.wp-handle-picker')!.querySelector('summary')!) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    )
  ).toBe(true);
  await sizes.selectOption('192');
  await expect
    .poll(async () => (await readSceneGeometrySnapshot(page)).fingerprint)
    .not.toBe(baseline.fingerprint);
  await sizes.selectOption('128');
  await expect
    .poll(async () => (await readSceneGeometrySnapshot(page)).fingerprint)
    .toBe(baseline.fingerprint);

  await summary.press('Enter');
  await expect(global.getByTestId('handle-global-bar_round')).toBeVisible();
  await expect(global.locator('[aria-pressed="true"]').last()).toHaveText(/סטנדרטית/);
  await page.screenshot({ path: info.outputPath('handle-catalog-desktop.png') });
  const roundBar = global.getByTestId('handle-global-bar_round');
  await roundBar.press('Enter');
  await expect(roundBar).toBeFocused();
  await expect(roundBar).toHaveAttribute('aria-pressed', 'true');
  await expect(roundBar).toBeVisible();
  await summary.click();
  await expect(roundBar).toBeHidden();
  await global.getByLabel('מרחק בין חורים').selectOption('192');
  await expect
    .poll(async () => (await readSceneGeometrySnapshot(page)).fingerprint)
    .not.toBe(baseline.fingerprint);
  const readHandleConfig = async () =>
    (await readDebugStoreState(page)).config as {
      globalHandleType?: string;
      handlesMap?: Record<string, string>;
    };
  await expect
    .poll(async () => (await readHandleConfig()).handlesMap?.__wp_handle_size_global)
    .toBe('bar_round:192');

  await page.getByText('ניהול ידיות מתקדם', { exact: true }).click();
  const part = page.getByTestId('handle-picker-part');
  await part.getByText('כל סוגי הידיות').click();
  const partCup = part.getByTestId('handle-part-cup');
  await partCup.click();
  await expect(partCup).toHaveAttribute('aria-pressed', 'true');
  await expect(partCup).toBeVisible();
  await part.getByText('כל סוגי הידיות').click();
  await page.getByRole('button', { name: 'מיקום ידיות ידני' }).click();

  const point = { x: 0.1, y: 0 };
  await expect.poll(async () => (await inspectCanvasViaDebugNdc(page, point))?.partId).toMatch(/^d\d+_/);
  const canvas = page.locator('#viewer-container canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Viewer canvas is not visible');
  const partId = (await inspectCanvasViaDebugNdc(page, point))!.partId!;
  const click = { x: box.x + ((point.x + 1) * box.width) / 2, y: box.y + box.height / 2 };
  await page.mouse.move(click.x, click.y);
  await page.mouse.click(click.x, click.y);
  const positionKey = `__wp_manual_handle_position:${partId}`;
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[partId]).toBe('cup');
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[positionKey]).toBeTruthy();
  await page.locator('button[data-tooltip^="בטל ("]').click();
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[partId]).toBeUndefined();
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[positionKey]).toBeUndefined();
  await page.locator('button[data-tooltip^="החזר ("]').click();
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[partId]).toBe('cup');
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[positionKey]).toBeTruthy();
  expectHealthySceneGeometry(await readSceneGeometrySnapshot(page));
  await page.screenshot({ path: info.outputPath('handle-catalog-3d.png') });

  const { download } = await saveProjectViaHeader(page, 'handle-catalog');
  const path = await download.path();
  expect(path).toBeTruthy();
  await global.getByRole('button', { name: 'ללא', exact: true }).click();
  await expect.poll(async () => (await readHandleConfig()).globalHandleType).toBe('none');
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[partId]).toBe('cup');
  await loadProjectViaHeader(page, path!);
  await openMainTab(page, 'interior');
  await expect(global.getByLabel('מרחק בין חורים')).toHaveValue('192');
  await expect.poll(async () => (await readHandleConfig()).handlesMap?.[partId]).toBe('cup');
  expectNoRuntimeIssues(issues);
});

test('catalog fits the mobile panel and closes with Escape', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoSmokeApp(page);
  await openMainTab(page, 'interior');
  const global = page.getByTestId('handle-picker-global');
  const summary = global.getByText('כל סוגי הידיות');
  await summary.press('Space');
  const cup = global.getByTestId('handle-global-cup');
  await expect(cup).toBeVisible();
  await cup.click();
  await expect(cup).toHaveAttribute('aria-pressed', 'true');
  await expect(cup).toBeVisible();
  await expect(global).toHaveAttribute('dir', 'rtl');
  expect(await global.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('handle-catalog-mobile.png') });
  await cup.press('Escape');
  await expect(cup).toBeHidden();
  await expect(summary).toBeFocused();
});
