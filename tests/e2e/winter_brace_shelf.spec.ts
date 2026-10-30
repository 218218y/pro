import { test, expect, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  gotoSmokeApp,
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  waitForProjectActionEvent,
  openMainTab,
  readDebugStoreState,
  setStackSplitEnabled,
  saveProjectViaHeader,
  readSavedProjectPayload,
} from './helpers/project_flows';

for (const wardrobeType of ['hinged', 'sliding', 'corner']) {
  test(`winter shelves build in ${wardrobeType} wardrobes, boxes and both stacks`, async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);
    const project = JSON.parse(
      readFileSync('tests/fixtures/project_import/minimal_empty_owned_branches_project.json', 'utf8')
    );
    project.settings.wardrobeType = wardrobeType === 'corner' ? 'hinged' : wardrobeType;
    project.settings.doorStyle = 'flat';
    const shelf = { id: 'winter', variant: 'winter_brace', yNorm: 0.5 };
    const module = {
      doors: 1,
      layout: 'shelves',
      isCustom: true,
      gridDivisions: 6,
      extDrawersCount: 0,
      hasShoeDrawer: false,
      customData: { shelves: [true], rods: [], storage: false, shelfVariants: ['winter_brace'] },
      sketchExtras: {
        shelves: [{ ...shelf, yNorm: 0.3 }],
        boxes: [
          { id: 'inside', yNorm: 0.75, heightM: 0.5, widthM: 0.6, depthM: 0.5, shelves: [shelf] },
          {
            id: 'outside',
            freePlacement: true,
            absX: 1.5,
            absY: 0.5,
            heightM: 0.5,
            widthM: 0.6,
            depthM: 0.5,
            shelves: [shelf],
          },
        ],
      },
    };
    project.modulesConfiguration = [module, structuredClone(module)];
    project.stackSplitLowerModulesConfiguration = [structuredClone(module), structuredClone(module)];
    if (wardrobeType === 'corner') {
      project.toggles.cornerMode = true;
      Object.assign(project.settings, {
        cornerWidth: 120,
        cornerHeight: 240,
        cornerDepth: 55,
        cornerDoors: 2,
        cornerSide: 'right',
      });
      project.cornerConfiguration = {
        ...structuredClone(module),
        modulesConfiguration: [structuredClone(module), structuredClone(module)],
        stackSplitLower: {
          ...structuredClone(module),
          modulesConfiguration: [structuredClone(module), structuredClone(module)],
        },
      };
    }
    const loaded = waitForProjectActionEvent(page, 'load');
    await page.locator('input[data-testid="header-project-load-input"]').setInputFiles({
      name: 'winter.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    });
    expect((await loaded).ok).toBe(true);
    const snapshot = () => page.evaluate(() => window.__WP_DEBUG__!.scene!.getGeometrySnapshot!());
    await expect.poll(async () => (await snapshot()).partIds).toContain('sketch_shelf_0_1');
    const firstScene = await snapshot();
    expect(firstScene.partIds.some(id => id.includes('inside') && id.endsWith('_shelf_winter'))).toBe(true);
    expect(firstScene.partIds.some(id => id.includes('outside') && id.endsWith('_shelf_winter'))).toBe(true);
    if (wardrobeType === 'corner')
      expect(firstScene.partIds.some(id => id.startsWith('corner_shelf_'))).toBe(true);
    expect(firstScene.summary.invalidNumberCount).toBe(0);

    await openMainTab(page, 'interior');
    await page.getByRole('button', { name: 'קושרת חורף', exact: true }).first().click();
    await expect
      .poll(
        async () =>
          ((await readDebugStoreState(page)).mode as { opts?: { manualTool?: string } }).opts?.manualTool
      )
      .toBe('sketch_shelf:winter_brace');
    if (wardrobeType !== 'sliding') {
      await expect.poll(async () => (await snapshot()).partIds.includes('d1_bot')).toBe(true);
      const lock = page.locator('[data-testid="winter-brace-door-lock-button"]:visible').first();
      await expect(lock).toHaveAttribute('aria-pressed', 'true');
      await lock.click();
      await expect(lock).toHaveAttribute('aria-pressed', 'false');
      await expect
        .poll(async () => JSON.stringify((await readDebugStoreState(page)).config))
        .toContain('"winterBraceDoorsUnlocked":true');
    }
    await setStackSplitEnabled(page, true);
    await expect
      .poll(async () =>
        (await snapshot()).partIds.some(id => id.includes('lower') && id.startsWith('sketch_shelf_'))
      )
      .toBe(true);
    expect((await snapshot()).summary.invalidNumberCount).toBe(0);
    const { download } = await saveProjectViaHeader(page, `winter-${wardrobeType}`);
    const saved = await readSavedProjectPayload((await download.path())!);
    expect(JSON.stringify(saved.modulesConfiguration)).toContain('winter_brace');
    expect(JSON.stringify(saved.stackSplitLowerModulesConfiguration)).toContain('winter_brace');
    if (wardrobeType !== 'sliding') {
      const restored = waitForProjectActionEvent(page, 'load');
      await page.locator('input[data-testid="header-project-load-input"]').setInputFiles({
        name: 'winter-restored.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(saved)),
      });
      expect((await restored).ok).toBe(true);
      await openMainTab(page, 'interior');
      await expect(
        page.locator('[data-testid="winter-brace-door-lock-button"]:visible').first()
      ).toHaveAttribute('aria-pressed', 'false');
    }
    expectNoRuntimeIssues(issues);
  });
}

async function expectShelfButtonsFit(scope: Locator): Promise<void> {
  const buttons = scope.locator('.wp-sketch-shelf-btn:visible');
  expect(await buttons.count()).toBeGreaterThan(0);
  for (const button of await buttons.all()) {
    const metrics = await button.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const label = element.querySelector('.wp-r-editmode-toggle__label')!;
      const icon = element.querySelector('.wp-r-editmode-toggle__icon')!;
      const labelBounds = label.getBoundingClientRect();
      const iconBounds = icon.getBoundingClientRect();
      return {
        text: element.textContent,
        labelFits:
          labelBounds.left >= bounds.left &&
          labelBounds.right <= bounds.right &&
          labelBounds.top >= bounds.top &&
          labelBounds.bottom <= bounds.bottom &&
          label.scrollWidth <= label.clientWidth + 1,
        iconFits: iconBounds.width > 0 && iconBounds.left >= bounds.left && iconBounds.right <= bounds.right,
        separated: labelBounds.right <= iconBounds.left + 1 || iconBounds.right <= labelBounds.left + 1,
        glyph: getComputedStyle(icon.querySelector('i')!, '::before').content,
      };
    });
    expect(metrics.text).not.toMatch(/\?{2}|\uFFFD/u);
    expect(metrics.labelFits, metrics.text ?? '').toBe(true);
    expect(metrics.iconFits, metrics.text ?? '').toBe(true);
    expect(metrics.separated, metrics.text ?? '').toBe(true);
    expect(metrics.glyph).not.toBe('none');
  }
}

test('winter shelf and lock labels fit in separate rows in interior and sketch at desktop and narrow widths', async ({
  page,
}, testInfo) => {
  await gotoSmokeApp(page);
  const project = JSON.parse(
    readFileSync('tests/fixtures/project_import/minimal_empty_owned_branches_project.json', 'utf8')
  );
  Object.assign(project.settings, { wardrobeType: 'hinged', doorStyle: 'flat' });
  project.modulesConfiguration = [
    {
      doors: 1,
      layout: 'shelves',
      isCustom: false,
      gridDivisions: 6,
      extDrawersCount: 0,
      hasShoeDrawer: false,
      customData: { shelves: [], rods: [], storage: false },
      sketchExtras: { shelves: [{ id: 'winter-ui', variant: 'winter_brace', yNorm: 0.4 }] },
    },
  ];
  const loaded = waitForProjectActionEvent(page, 'load');
  await page.locator('input[data-testid="header-project-load-input"]').setInputFiles({
    name: 'winter-ui.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  const loadResult = await loaded;
  expect(loadResult.ok, JSON.stringify(loadResult)).toBe(true);

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ['interior', 'sketch'] as const) {
      await openMainTab(page, tab);
      const panel = page.locator(`#reactSidebarRoot .tab-content[data-tab="${tab}"]`);
      if (
        tab === 'interior' &&
        !(await panel.getByTestId('interior-manual-shelf-variant-regular-button').isVisible())
      ) {
        await panel.locator('.wp-manual-toggle:not(.wp-sketch-toggle)').click();
      }
      if (tab === 'sketch') {
        const shelves = panel.locator('.wp-sketch-shelf-headrow button').first();
        await shelves.click();
      }
      const row = panel.locator('.wp-winter-brace-row:visible').first();
      await expect(row.getByTestId('winter-brace-shelf-button')).toHaveText('קושרת חורף');
      const lock = row.getByTestId('winter-brace-door-lock-button');
      await expect(lock).toHaveText('דלתות נעולות');
      await expectShelfButtonsFit(panel);
      const variants = panel.locator('.wp-sketch-shelf-subrow:visible').first();
      expect(await variants.getByRole('button').count()).toBe(4);
      const variantsBounds = (await variants.boundingBox())!;
      const rowBounds = (await row.boundingBox())!;
      expect(rowBounds.y).toBeGreaterThanOrEqual(variantsBounds.y + variantsBounds.height);
      await lock.click();
      await expect(lock).toHaveText('דלתות משוחררות');
      await expectShelfButtonsFit(panel);
      await lock.click();
      await row.scrollIntoViewIfNeeded();
      await panel
        .locator('.wp-tool-card--layout')
        .screenshot({ path: testInfo.outputPath(`${tab}-${width}.png`) });
    }
  }
});
