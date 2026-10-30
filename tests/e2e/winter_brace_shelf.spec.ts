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
  inspectCanvasViaDebugNdc,
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
        labelFits: element.classList.contains('wp-winter-brace-lock-icon')
          ? !!element.getAttribute('aria-label')
          : labelBounds.left >= bounds.left &&
            labelBounds.right <= bounds.right &&
            labelBounds.top >= bounds.top &&
            labelBounds.bottom <= bounds.bottom &&
            label.scrollWidth <= label.clientWidth + 1,
        iconFits: iconBounds.width > 0 && iconBounds.left >= bounds.left && iconBounds.right <= bounds.right,
        separated:
          element.classList.contains('wp-winter-brace-lock-icon') ||
          labelBounds.right <= iconBounds.left + 1 ||
          iconBounds.right <= labelBounds.left + 1,
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

async function expectCombinedWinterControl(scope: Locator): Promise<void> {
  const controls = scope.getByTestId('winter-brace-combined-button');
  for (const control of await controls.all()) {
    const main = control.getByTestId('winter-brace-shelf-button');
    const lock = control.getByTestId('winter-brace-door-lock-button');
    const outer = (await control.boundingBox())!;
    const mainBounds = (await main.boundingBox())!;
    const lockBounds = (await lock.boundingBox())!;
    expect(Math.abs(lockBounds.x + lockBounds.width - mainBounds.x)).toBeLessThan(1);
    expect(Math.abs(lockBounds.y - mainBounds.y)).toBeLessThan(1);
    expect(Math.abs(lockBounds.height - mainBounds.height)).toBeLessThan(1);
    expect(lockBounds.x).toBeLessThan(mainBounds.x);
    expect(lockBounds.width).toBeLessThan(mainBounds.width);
    expect(Math.abs(lockBounds.x - outer.x - 2)).toBeLessThan(1);
    for (const button of [main, lock]) {
      const style = await button.evaluate(element => {
        const css = getComputedStyle(element);
        return { radius: css.borderRadius, top: css.borderTopWidth, bottom: css.borderBottomWidth };
      });
      expect(style).toEqual({ radius: '0px', top: '0px', bottom: '0px' });
    }
  }
}

test('winter shelf split controls fit and keep their actions independent at desktop and narrow widths', async ({
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
      if (tab === 'interior') {
        const grid = panel.locator('.wp-tool-card--layout .wp-layout-grid');
        const storage = (await grid.getByRole('button', { name: 'אוגר מצעים', exact: true }).boundingBox())!;
        const winter = (await grid.getByTestId('winter-brace-combined-button').boundingBox())!;
        const brace = (await grid.getByRole('button', { name: 'מדפי קושרת', exact: true }).boundingBox())!;
        const regular = (await grid.getByRole('button', { name: 'מדף רגיל', exact: true }).boundingBox())!;
        expect(Math.abs(storage.y - winter.y)).toBeLessThan(2);
        expect(winter.x).toBeLessThan(storage.x);
        expect(Math.abs(brace.y - regular.y)).toBeLessThan(2);
        expect(brace.y).toBeGreaterThan(storage.y);
        const iconLock = grid.getByTestId('winter-brace-door-lock-button');
        await expect(iconLock).toHaveAccessibleName('דלתות נעולות');
        const modeBefore = (await readDebugStoreState(page)).mode;
        await iconLock.click();
        await expect(iconLock).toHaveAccessibleName('דלתות משוחררות');
        expect((await readDebugStoreState(page)).mode).toEqual(modeBefore);
        await iconLock.click();
        await expectCombinedWinterControl(grid);
        await grid.screenshot({ path: testInfo.outputPath(`shortcuts-${width}.png`) });
      }
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
      await expect(lock).toHaveAccessibleName('דלתות נעולות');
      await expectShelfButtonsFit(panel);
      await expectCombinedWinterControl(row);
      const variants = panel.locator('.wp-sketch-shelf-subrow:visible').first();
      expect(await variants.getByRole('button').count()).toBe(4);
      const variantsBounds = (await variants.boundingBox())!;
      const rowBounds = (await row.boundingBox())!;
      expect(rowBounds.y).toBeGreaterThanOrEqual(variantsBounds.y + variantsBounds.height);
      await lock.click();
      await expect(lock).toHaveAccessibleName('דלתות משוחררות');
      await expectShelfButtonsFit(panel);
      await lock.focus();
      await lock.press('Space');
      await expect(lock).toHaveAccessibleName('דלתות נעולות');
      await row.scrollIntoViewIfNeeded();
      await row.screenshot({ path: testInfo.outputPath(`${tab}-${width}.png`) });
    }
  }
});

test('interior shelf shortcuts add, convert and remove shelves through browser pointers', async ({
  page,
}) => {
  const issues = collectRuntimeIssues(page);
  await gotoSmokeApp(page);
  const project = JSON.parse(
    readFileSync('tests/fixtures/project_import/minimal_empty_owned_branches_project.json', 'utf8')
  );
  Object.assign(project.settings, {
    wardrobeType: 'hinged',
    doorStyle: 'flat',
  });
  project.modulesConfiguration = [
    {
      doors: 1,
      layout: 'shelves',
      isCustom: true,
      gridDivisions: 6,
      extDrawersCount: 0,
      hasShoeDrawer: false,
      customData: {
        shelves: [false, false, false, false, false],
        rods: [],
        storage: false,
        shelfVariants: [],
      },
    },
  ];
  project.modulesConfiguration.push(structuredClone(project.modulesConfiguration[0]));
  const loaded = waitForProjectActionEvent(page, 'load');
  await page.locator('input[data-testid="header-project-load-input"]').setInputFiles({
    name: 'shelf-shortcuts.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  const loadResult = await loaded;
  expect(loadResult.ok, JSON.stringify(loadResult)).toBe(true);
  await openMainTab(page, 'interior');
  const grid = page.locator(
    '#reactSidebarRoot .tab-content[data-tab="interior"] .wp-tool-card--layout .wp-layout-grid'
  );
  await grid.getByRole('button', { name: 'מדפי קושרת', exact: true }).click();
  await expect
    .poll(async () => (await readDebugStoreState(page)).mode)
    .toMatchObject({ primary: 'brace_shelves', opts: { shelfShortcutVariant: 'brace' } });
  let point: { x: number; y: number } | null = null;
  await expect
    .poll(async () => {
      for (const y of [0, -0.2, 0.2])
        for (const x of [0, -0.15, 0.15]) {
          const hit = await inspectCanvasViaDebugNdc(page, { x, y });
          if (
            hit?.moduleIndex === 0 &&
            hit.moduleHitY != null &&
            hit.moduleHitY > 0.5 &&
            hit.moduleHitY < 1.8 &&
            !hit.partId?.startsWith('d1')
          ) {
            point = { x, y };
            return true;
          }
        }
      return false;
    })
    .toBe(true);
  const canvas = page.locator('#viewer-container canvas').first();
  const bounds = (await canvas.boundingBox())!;
  const client = {
    x: bounds.x + ((point!.x + 1) / 2) * bounds.width,
    y: bounds.y + ((1 - point!.y) / 2) * bounds.height,
  };
  const shelves = async () => {
    const config = (await readDebugStoreState(page)).config as {
      modulesConfiguration: Array<{ sketchExtras?: { shelves?: Array<{ variant: string }> } }>;
    };
    return config.modulesConfiguration[0]?.sketchExtras?.shelves ?? [];
  };
  const click = async () => {
    await page.mouse.move(client.x + 2, client.y);
    await page.mouse.move(client.x, client.y);
    await page.mouse.click(client.x, client.y);
  };
  await click();
  await expect.poll(shelves).toMatchObject([{ variant: 'brace' }]);
  await expect
    .poll(async () =>
      page.evaluate(() =>
        window.__WP_DEBUG__!.scene.getGeometrySnapshot()!.partIds.includes('sketch_shelf_0_1')
      )
    )
    .toBe(true);
  await click();
  await expect.poll(shelves).toEqual([]);
  await grid.getByRole('button', { name: 'מדף רגיל', exact: true }).click();
  await click();
  await expect.poll(shelves).toMatchObject([{ variant: 'regular' }]);
  await grid.getByRole('button', { name: 'מדפי קושרת', exact: true }).click();
  await click();
  await expect.poll(shelves).toMatchObject([{ variant: 'brace' }]);
  await grid.getByRole('button', { name: 'מדף רגיל', exact: true }).click();
  await click();
  await expect.poll(shelves).toMatchObject([{ variant: 'regular' }]);
  await click();
  await expect.poll(shelves).toEqual([]);
  expectNoRuntimeIssues(issues);
});
