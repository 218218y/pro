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
