import { test, expect, type Page } from '@playwright/test';
import {
  gotoSmokeApp,
  openMainTab,
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  setStructureDoors,
} from './helpers/project_flows';

async function choose(page: Page, query: string, id: string) {
  await page.getByTestId('viewer-search-button').click();
  await page.getByTestId('viewer-search-input').fill(query);
  await page.getByTestId(`viewer-search-result-${id}`).click();
  await expect(page.getByTestId('viewer-search-popover')).toHaveCount(0);
}

test('search ranks primary options and reveals the actual nested controls across tabs @critical', async ({
  page,
}) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  await page.getByTestId('viewer-search-button').click();
  await page.getByTestId('viewer-search-input').fill('רגליים');
  await expect(page.getByRole('option').first()).toHaveAttribute('data-testid', 'viewer-search-result-base');
  await page.getByTestId('viewer-search-result-base').click();
  await expect(page.getByTestId('structure-base-type-controls')).toHaveClass(/wp-r-search-target-flash/);

  await choose(page, 'הזזה', 'type-sliding');
  const sliding = page.getByTestId('structure-type-sliding-button');
  await expect(sliding).toHaveClass(/wp-r-search-target-flash/);
  await expect(sliding).toHaveAttribute('aria-pressed', 'false');

  await choose(page, 'טקסטורה', 'texture');
  await expect(page.getByTestId('design-custom-color-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('design-custom-texture-upload-button')).toHaveClass(
    /wp-r-search-target-flash/
  );
  await choose(page, 'מספר חריטות', 'groove-count');
  await expect(page.getByTestId('design-groove-lines-input')).toHaveClass(/wp-r-search-target-flash/);

  await choose(page, 'מיקום מגירות פנימיות', 'internal-drawer-mode');
  await expect(page.getByTestId('interior-internal-drawers-mode-button')).toHaveClass(
    /wp-r-search-target-flash/
  );

  await choose(page, 'קירות', 'room-architecture');
  const sketch = page.locator('.tab-content.active[data-tab="sketch"]');
  await expect(sketch.getByTestId('settings-room-architecture')).toHaveClass(/wp-r-search-target-flash/);
  await choose(page, 'חלון', 'room-window');
  await expect(sketch.getByTestId('settings-room-opening-window')).toHaveClass(/wp-r-search-target-flash/);
  await expect(sketch.getByTestId('settings-room-back-wall-toggle')).toBeChecked();

  await choose(page, 'מצב כהה', 'dark-mode');
  const dark = page.getByTestId('toggle-dark-mode');
  await expect(dark.locator('xpath=ancestor::div[contains(@class,"wp-r-toggle-row")]')).toHaveClass(
    /wp-r-search-target-flash/
  );
  await expect(dark).not.toBeChecked();
  expectNoRuntimeIssues(issues);
});

test('search availability updates after changing wardrobe type without changing it during navigation', async ({
  page,
}) => {
  await gotoSmokeApp(page);
  await page.getByTestId('viewer-search-button').click();
  await page.getByTestId('viewer-search-input').fill('מסילות הזזה');
  await expect(page.getByTestId('viewer-search-result-sliding-tracks')).toHaveCount(0);
  await page.getByTestId('viewer-search-input').press('Escape');
  await setStructureDoors(page, 3);
  await choose(page, 'מיקום דלת בודדת', 'single-door');
  await expect(page.locator('.wp-r-single-door-selector')).toHaveClass(/wp-r-search-target-flash/);
  await choose(page, 'כיוון פתיחת דלת', 'hinge-direction');
  await expect(
    page
      .getByTestId('structure-hinge-direction-toggle')
      .locator('xpath=ancestor::div[contains(@class,"wp-r-toggle-row")]')
  ).toHaveClass(/wp-r-search-target-flash/);
  await openMainTab(page, 'structure');
  await page.getByTestId('structure-type-sliding-button').click();
  await choose(page, 'מסילות הזזה', 'sliding-tracks');
  await expect(page.locator('.wp-r-sliding-tracks-selector')).toHaveClass(/wp-r-search-target-flash/);
});

test('search covers individual presets and Sketch tools without applying a building action', async ({
  page,
}) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  await page.getByTestId('viewer-search-button').click();
  const search = page.getByTestId('viewer-search-input');
  await search.fill('מוט תלייה');
  await expect(page.getByTestId('viewer-search-result-sketch-rod')).toBeVisible();
  await expect(page.getByTestId('viewer-search-result-manual-rod')).toBeVisible();
  await page.getByTestId('viewer-search-result-sketch-rod').click();
  await expect(page.getByTestId('sketch-shelf-tool-rod')).toHaveClass(/wp-r-search-target-flash/);
  await expect(page.getByTestId('sketch-shelf-tool-rod')).toHaveAttribute('aria-pressed', 'false');

  await choose(page, 'אוגר מצעים', 'sketch-storage');
  await expect(page.getByTestId('sketch-shelf-tool-storage')).toHaveClass(/wp-r-search-target-flash/);
  await choose(page, 'מדפים', 'preset-shelves');
  await expect(page.getByTestId('interior-layout-method-presets')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('interior-layout-shelves')).toHaveClass(/wp-r-search-target-flash/);
  await expect(page.getByTestId('interior-layout-shelves')).toHaveAttribute('aria-pressed', 'false');

  await choose(page, 'תלייה כפולה', 'preset-hanging_split');
  await expect(page.getByTestId('interior-layout-hanging_split')).toHaveClass(/wp-r-search-target-flash/);
  await choose(page, 'משולב', 'preset-mixed');
  await expect(page.getByTestId('interior-layout-mixed')).toHaveClass(/wp-r-search-target-flash/);
  await choose(page, 'מדף זכוכית', 'sketch-shelf-glass');
  await expect(page.getByTestId('sketch-shelf-tool-main')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('sketch-shelf-tool-glass')).toHaveClass(/wp-r-search-target-flash/);
  await expect(page.getByTestId('sketch-shelf-tool-glass')).toHaveAttribute('aria-pressed', 'false');
  expectNoRuntimeIssues(issues);
});

test('search exposes omitted Sketch actions and results beyond the first twelve @critical', async ({
  page,
}) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  await choose(page, 'הוספת קופסא', 'box-add');
  const sketch = page.locator('.tab-content.active[data-tab="sketch"]');
  await expect(sketch.getByTestId('sketch-control-box-add')).toHaveClass(/wp-r-search-target-flash/);
  await expect(sketch.getByTestId('sketch-control-box-add')).toHaveAttribute('aria-pressed', 'false');
  for (const [query, id] of [
    ['מחיצה שוכבת', 'box-horizontal-divider'],
    ['מחיצה עומדת', 'box-divider'],
  ] as const) {
    await choose(page, query, id);
    await expect(sketch.getByTestId(`sketch-control-${id}`)).toHaveClass(/wp-r-search-target-flash/);
    await expect(sketch.getByTestId(`sketch-control-${id}`)).toHaveAttribute('aria-pressed', 'false');
  }
  await choose(page, 'פסי עיטור לדלת', 'door-trim');
  await expect(sketch.getByTestId('sketch-door-trim-toggle')).toHaveAttribute('aria-expanded', 'false');
  await choose(page, 'פס עיטור שוכב', 'door-trim-horizontal');
  await expect(sketch.getByTestId('sketch-door-trim-horizontal')).toHaveClass(/wp-r-search-target-flash/);
  await expect(sketch.getByTestId('sketch-door-trim-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId('viewer-search-button').click();
  await page.getByTestId('viewer-search-input').fill('קופסא');
  expect(await page.getByRole('option').count()).toBeGreaterThan(12);
  await page.getByTestId('viewer-search-result-box-cornice-type').click();
  await expect(sketch.getByTestId('sketch-control-box-cornice-type')).toHaveClass(/wp-r-search-target-flash/);
  expectNoRuntimeIssues(issues);
});
