import { expect, test } from '@playwright/test';
import {
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  openMainTab,
  readDebugStoreState,
} from './helpers/project_flows';

test('interior layout keeps the three placement methods distinct on desktop and narrow screens', async ({
  page,
}, testInfo) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  await openMainTab(page, 'interior');
  const layout = page.getByTestId('interior-layout');
  const method = (id: 'presets' | 'grid' | 'sketch') => layout.getByTestId(`interior-layout-method-${id}`);
  const item = (id: 'shelf' | 'rod' | 'storage') => layout.getByTestId(`interior-manual-tool-${id}-button`);
  const mode = async () => (await readDebugStoreState(page)).mode;
  const gridCounts = layout.getByRole('group', { name: 'מספר חלוקות לגובה התא' });
  const finish = layout.getByTestId('interior-layout-finish');

  await expect(method('presets')).toHaveAttribute('aria-pressed', 'true');
  await expect(layout.getByRole('group', { name: 'תבניות לתא' }).getByRole('button')).toHaveCount(5);
  await expect(item('shelf')).toHaveCount(0);
  await layout.screenshot({ path: testInfo.outputPath('interior-presets-desktop.png') });
  await layout.getByTestId('interior-layout-mixed').click();
  await expect.poll(mode).toMatchObject({ primary: 'layout', opts: { layoutType: 'mixed' } });

  await method('grid').focus();
  await method('grid').press('Enter');
  await expect(method('grid')).toHaveAttribute('aria-pressed', 'true');
  await expect(method('grid')).toBeFocused();
  await expect.poll(mode).toMatchObject({ primary: 'none' });
  await expect(layout.getByTestId('interior-layout-mixed')).toHaveCount(0);
  await item('rod').click();
  await layout.getByTestId('interior-layout-grid-count-4').click();
  await expect.poll(mode).toMatchObject({ primary: 'manual_layout', opts: { manualTool: 'rod' } });
  await expect(layout.getByTestId('interior-layout-grid-count-4')).toHaveAttribute('aria-pressed', 'true');
  await expect(layout.getByRole('group', { name: 'סוג מדף' })).toHaveCount(0);
  await item('shelf').click();
  await expect(layout.getByTestId('winter-brace-shelf-button')).toHaveCount(1);
  await layout.screenshot({ path: testInfo.outputPath('interior-grid-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await method('sketch').click();
  await expect(gridCounts).toHaveCount(0);
  await expect(finish).toHaveCount(0);
  await layout.getByTestId('interior-manual-shelf-variant-glass-button').click();
  await expect.poll(mode).toMatchObject({ opts: { manualTool: 'sketch_shelf:glass' } });
  await expect(layout.getByTestId('interior-sketch-shelf-depth-input')).toBeVisible();
  await expect(layout.getByTestId('winter-brace-shelf-button')).toHaveCount(1);
  await layout.screenshot({ path: testInfo.outputPath('interior-sketch-narrow.png') });
  await item('storage').click();
  await expect.poll(mode).toMatchObject({ opts: { manualTool: 'sketch_storage:50' } });
  await expect(layout.getByLabel('גובה אוגר מצעים (ס"מ)')).toBeVisible();
  await expect(layout.getByTestId('interior-sketch-shelf-depth-input')).toHaveCount(0);

  const boring = layout.getByTestId('interior-layout-full_boring');
  await expect(boring).toBeHidden();
  await layout.getByText('המרת מדפים וחירור', { exact: true }).click();
  await boring.click();
  await expect.poll(mode).toMatchObject({ primary: 'layout', opts: { layoutType: 'full_boring' } });
  await expect(boring).toHaveAttribute('aria-pressed', 'true');
  await finish.click();
  await expect.poll(mode).toMatchObject({ primary: 'none' });
  await expect(method('sketch')).toHaveAttribute('aria-pressed', 'true');
  await expect(method('sketch')).toBeFocused();
  await expect(boring).toBeVisible();
  expectNoRuntimeIssues(issues);
});

test('interior layout uses dark card and button surfaces across placement methods', async ({ page }) => {
  await gotoSmokeApp(page);
  await openMainTab(page, 'settings');
  const darkMode = page.getByTestId('toggle-dark-mode');
  if (!(await darkMode.isChecked())) await darkMode.locator('..').click();
  await expect(darkMode).toBeChecked();
  await openMainTab(page, 'interior');

  const layout = page.getByTestId('interior-layout');
  await expect(layout).toHaveCSS('background-color', 'rgb(32, 38, 45)');
  await expect(layout.getByTestId('interior-layout-shelves')).toHaveCSS(
    'background-color',
    'rgb(32, 38, 45)'
  );

  const grid = layout.getByTestId('interior-layout-method-grid');
  await grid.click();
  await expect(grid).toHaveCSS('color', 'rgb(159, 242, 232)');
  await layout.getByTestId('interior-manual-tool-shelf-button').click();
  await expect(layout).toHaveCSS('background-color', 'rgba(77, 182, 172, 0.12)');

  await layout.getByTestId('interior-layout-method-sketch').click();
  await expect(layout.getByText('המרת מדפים וחירור', { exact: true })).toHaveCSS(
    'color',
    'rgb(168, 179, 189)'
  );
});
