import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

import {
  applyCellDimsToReachableLinearModuleViaBrowserPointer,
  clickCanvasViaDebugNdc,
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  loadProjectViaHeader,
  openMainTab,
  inspectCanvasViaDebugNdc,
  readBuildDebugStats,
  readDebugStoreState,
  readLinearModuleSpecialDims,
  resetAllCellDimsOverrides,
  resetBuildDebugStats,
  saveProjectViaHeader,
  setCellDimsDraft,
  setCellDimsMode,
  setDoorAuthoringMode,
  setDoorFeatureToggle,
  setInternalDrawersEnabled,
  waitForProjectActionEvent,
} from './helpers/project_flows';

test.describe('Canvas pointer parity smoke', () => {
  test('places, paints and updates a built-in desk from both sketch tool panels @critical', async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);
    await openMainTab(page, 'interior');
    await page.getByTestId('interior-layout-method-sketch').click();
    await page.getByTestId('interior-built-in-desk').click();
    await page.getByTestId('sketch-built-in-desk-length').fill('75');
    await page.getByTestId('sketch-built-in-desk-drawers').selectOption('2');
    await expect
      .poll(async () => (await readDebugStoreState(page)).mode)
      .toMatchObject({
        primary: 'manual_layout',
        opts: { manualTool: 'sketch_built_in_desk:75:2:leg' },
      });

    const host = await page.evaluate(() => {
      const canvas = window.__WP_DEBUG__!.canvas;
      for (let x = 0.5; x >= -0.5; x -= 0.02) {
        const p = { x, y: -0.16 };
        const hit = canvas.inspectNdc(p.x, p.y);
        if (hit?.moduleIndex === 0) return p;
      }
      return null;
    });
    if (!host) throw new Error('Expected a reachable end cell');
    await clickCanvasViaDebugNdc(page, host);

    const config = async () => (await readDebugStoreState(page)).config;
    const bottomPlacement = { lengthCm: 75, drawerCount: 2, support: 'leg' };
    await expect.poll(config).toMatchObject({
      modulesConfiguration: expect.arrayContaining([
        expect.objectContaining({
          sketchExtras: { builtInDesk: expect.objectContaining(bottomPlacement) },
        }),
      ]),
    });

    await page.getByTestId('interior-built-in-desk').click();
    const viewer = page.locator('#viewer-container canvas').first();
    const viewerBounds = await viewer.boundingBox();
    if (!viewerBounds) throw new Error('Expected a visible viewer canvas');
    const orbitX = viewerBounds.x + viewerBounds.width / 2;
    const orbitY = viewerBounds.y + viewerBounds.height / 2;
    await page.mouse.move(orbitX, orbitY);
    await page.mouse.down();
    await page.mouse.move(orbitX - viewerBounds.height * 0.12, orbitY, { steps: 8 });
    await page.mouse.up();

    const findDeskPart = async (suffix: string) =>
      page.evaluate(partSuffix => {
        const canvas = window.__WP_DEBUG__!.canvas;
        const rows = [
          ...Array.from({ length: 44 }, (_, index) => -0.16 - index * 0.018),
          ...Array.from({ length: 31 }, (_, index) => -0.142 + index * 0.018),
        ];
        for (const y of rows) {
          for (let x = -0.92; x <= 0.65; x += 0.025) {
            const partId = canvas.inspectNdc(x, y)?.partId;
            if (partId?.startsWith('built_in_desk_') && partId.endsWith(partSuffix)) {
              return { x, y, partId };
            }
          }
        }
        return null;
      }, suffix);

    await openMainTab(page, 'design');
    const paintToggle = page.getByTestId('design-multicolor-enabled-toggle');
    await paintToggle.locator('..').click();
    await expect(paintToggle).toBeChecked();
    await page
      .locator('.wp-tool-card--paint')
      .getByRole('button', { name: 'אגוז טבעי', exact: true })
      .click();
    const colors = async () =>
      ((await config()) as { individualColors?: Record<string, string> }).individualColors;
    for (const suffix of ['_front_1', '_leg']) {
      const part = await findDeskPart(suffix);
      if (!part) throw new Error(`Expected a visible desk part for ${suffix}`);
      const canvas = await viewer.boundingBox();
      if (!canvas) throw new Error('Expected a visible viewer canvas');
      const x = canvas.x + ((part.x + 1) * canvas.width) / 2;
      const y = canvas.y + ((1 - part.y) * canvas.height) / 2;
      await page.mouse.move(x, y);
      await page.mouse.click(x, y);
      await expect.poll(async () => (await colors())?.[part.partId]).toEqual(expect.any(String));
    }
    await page.locator('.wp-tool-card--paint').getByRole('button', { name: 'סיום עריכה' }).click();

    await openMainTab(page, 'sketch');
    const sketch = page.locator('#reactSidebarRoot .tab-content[data-tab="sketch"]');
    const deskButton = sketch.getByTestId('sketch-built-in-desk');
    if ((await deskButton.getAttribute('aria-expanded')) !== 'true') await deskButton.click();
    await sketch.getByTestId('sketch-built-in-desk-length').fill('75');
    await sketch.getByTestId('sketch-built-in-desk-drawers').selectOption('3');
    await sketch.getByTestId('sketch-built-in-desk-wall').click();

    const deskPoint = await findDeskPart('_top');
    if (!deskPoint) throw new Error('Expected a reachable built-in desk part');
    await clickCanvasViaDebugNdc(page, deskPoint);
    const updatedDesk = {
      modulesConfiguration: expect.arrayContaining([
        expect.objectContaining({
          sketchExtras: {
            builtInDesk: expect.objectContaining({ lengthCm: 75, drawerCount: 3, support: 'wall' }),
          },
        }),
      ]),
    };
    await expect.poll(config).toMatchObject(updatedDesk);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const partIds = window.__WP_DEBUG__?.scene.getGeometrySnapshot()?.partIds ?? [];
          return partIds.filter(id => id.startsWith('built_in_desk_') && /_cell_(back|leg|wall)$/.test(id));
        })
      )
      .toEqual(['built_in_desk_top_0_cell_back']);
    await deskButton.click();
    await expect(sketch.getByTestId('sketch-built-in-desk-length')).toHaveCount(0);
    const savedColors = await colors();
    const saved = await saveProjectViaHeader(page, 'built-in-desk');
    const path = testInfo.outputPath(saved.download.suggestedFilename());
    await saved.download.saveAs(path);
    expect((await loadProjectViaHeader(page, path)).ok).toBe(true);
    await expect.poll(config).toMatchObject(updatedDesk);
    await expect.poll(colors).toMatchObject(savedColors ?? {});

    await openMainTab(page, 'sketch');
    await deskButton.click();
    await sketch.getByTestId('sketch-built-in-desk-length').fill('75');
    await sketch.getByTestId('sketch-built-in-desk-wall').click();
    const removalPoint = await findDeskPart('_top');
    if (!removalPoint) throw new Error('Expected a visible desktop for removal');
    await clickCanvasViaDebugNdc(page, removalPoint);
    await expect.poll(config).not.toMatchObject(updatedDesk);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__WP_DEBUG__?.scene
            .getGeometrySnapshot()
            ?.partIds.some(id => id.startsWith('built_in_desk_'))
        )
      )
      .toBe(false);
    const empty = { x: -0.9, y: -0.7 };
    expect(await inspectCanvasViaDebugNdc(page, empty)).toMatchObject({ partId: null, moduleIndex: null });
    await clickCanvasViaDebugNdc(page, empty);
    await expect(deskButton).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await readDebugStoreState(page)).mode).toMatchObject({ primary: 'none' });
    expectNoRuntimeIssues(issues);
  });

  for (const { name, buttonId, tool } of [
    {
      name: 'sketch external drawers',
      buttonId: 'interior-external-drawers-sketch-button',
      tool: /^sketch_ext_drawers:/u,
    },
    {
      name: 'internal drawers',
      buttonId: 'interior-internal-drawers-mode-button',
      tool: /^sketch_int_drawers/u,
    },
  ]) {
    test(`an empty canvas click exits ${name} editing @critical`, async ({ page }) => {
      const issues = collectRuntimeIssues(page);
      await gotoSmokeApp(page);
      const editButton = page.getByTestId(buttonId);
      if (buttonId === 'interior-internal-drawers-mode-button') {
        await setInternalDrawersEnabled(page, true);
      } else {
        await openMainTab(page, 'interior');
        await editButton.click();
      }
      await expect
        .poll(async () => (await readDebugStoreState(page)).mode)
        .toMatchObject({ primary: 'manual_layout', opts: { manualTool: expect.stringMatching(tool) } });
      await expect(editButton).toHaveAttribute('aria-pressed', 'true');

      const point = { x: -0.9, y: -0.7 };
      expect(await inspectCanvasViaDebugNdc(page, point)).toMatchObject({ partId: null, moduleIndex: null });
      const canvas = page.locator('#viewer-container canvas').first();
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Expected a visible viewer canvas');
      await canvas.click({
        position: { x: ((1 + point.x) / 2) * box.width, y: ((1 - point.y) / 2) * box.height },
      });

      await expect(editButton).toHaveAttribute('aria-pressed', 'false');
      expect((await readDebugStoreState(page)).mode).toMatchObject({ primary: 'none' });
      expectNoRuntimeIssues(issues);
    });
  }

  test('a stationary shelf-tool pointer removes a hanging rod instead of building a shelf @critical', async ({
    page,
  }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);
    const project = JSON.parse(
      readFileSync('tests/fixtures/project_import/minimal_empty_owned_branches_project.json', 'utf8')
    );
    project.settings.wardrobeType = 'hinged';
    project.settings.doorStyle = 'flat';
    project.modulesConfiguration = Array.from({ length: 2 }, () => ({
      doors: 1,
      layout: 'shelves',
      isCustom: true,
      gridDivisions: 6,
      extDrawersCount: 0,
      hasShoeDrawer: false,
      customData: { shelves: [], rods: [], storage: false },
      sketchExtras: { rods: [{ id: 'pointer-rod', yNorm: 0.5 }] },
    }));
    const loaded = waitForProjectActionEvent(page, 'load');
    await page.getByTestId('header-project-load-input').setInputFiles({
      name: 'rod-removal.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    });
    expect((await loaded).ok).toBe(true);
    await openMainTab(page, 'interior');
    await page.getByTestId('interior-layout-method-sketch').click();
    await page.getByTestId('interior-manual-tool-shelf-button').click();
    await page.getByTestId('interior-manual-shelf-variant-regular-button').click();
    await expect
      .poll(async () => (await readDebugStoreState(page)).mode)
      .toMatchObject({ opts: { manualTool: 'sketch_shelf:regular' } });
    // Locate the actual rod height through the production picking surface, keeping
    // the test independent of the camera's framing and selector screen position.
    let point: { x: number; y: number } | null = null;
    await expect
      .poll(async () => {
        point = await page.evaluate(() => {
          const canvas = window.__WP_DEBUG__!.canvas;
          let best: { x: number; y: number; distance: number } | null = null;
          for (const x of [-0.3, -0.15, 0, 0.15, 0.3]) {
            for (let row = -50; row <= 50; row++) {
              const y = row / 100;
              const hit = canvas.inspectNdc(x, y);
              if (hit?.moduleIndex !== 0 || hit.moduleHitY == null || hit.partId?.startsWith('d1')) continue;
              const distance = Math.abs(hit.moduleHitY - 1.2);
              if (!best || distance < best.distance) best = { x, y, distance };
            }
          }
          return best && best.distance < 0.015 ? { x: best.x, y: best.y } : null;
        });
        return point !== null;
      })
      .toBe(true);
    const bounds = (await page.locator('#viewer-container canvas').first().boundingBox())!;
    const client = {
      x: bounds.x + ((point!.x + 1) / 2) * bounds.width,
      y: bounds.y + ((1 - point!.y) / 2) * bounds.height,
    };
    await page.mouse.move(client.x, client.y);
    // Exercise a visible, stationary preview past the command freshness window.
    await page.waitForTimeout(1500);
    await page.mouse.down();
    await page.mouse.up();
    await expect
      .poll(async () => {
        const config = (await readDebugStoreState(page)).config as {
          modulesConfiguration: Array<{ sketchExtras: { rods: unknown[]; shelves?: unknown[] } }>;
        };
        return config.modulesConfiguration.map(module => ({
          rods: module.sketchExtras.rods.length,
          shelves: module.sketchExtras.shelves?.length ?? 0,
        }));
      })
      .toEqual([
        { rods: 0, shelves: 0 },
        { rods: 1, shelves: 0 },
      ]);
    expectNoRuntimeIssues(issues);
  });

  test('viewer pans with mouse and focused arrow keys without applying canvas edits @critical', async ({
    page,
  }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const help = page.getByRole('button', { name: 'עזרה בשליטה בתצוגה' });
    await help.click();
    await expect(page.getByText('הזזה בלי שינוי זווית', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('הזזה בלי שינוי זווית', { exact: true })).toBeHidden();

    await setCellDimsMode(page, true);
    await resetAllCellDimsOverrides(page);
    const canvas = page.locator('#viewer-container canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Expected a visible viewer canvas');
    const ndc = { x: 0.1, y: 0 };
    const x = box.x + ((ndc.x + 1) / 2) * box.width;
    const y = box.y + box.height / 2;
    const hitHeight = async () => {
      const hit = await inspectCanvasViaDebugNdc(page, ndc);
      if (hit?.moduleHitY == null) throw new Error('Expected a module hit in the viewer');
      return hit.moduleHitY;
    };
    const settledHitHeight = async () => {
      let previous = await hitHeight();
      let stableSamples = 0;
      // OrbitControls damping continues after pointer-up. Capture each gesture's baseline
      // only after the preceding motion has settled, including on slow CI renderers.
      await expect
        .poll(
          async () => {
            const current = await hitHeight();
            stableSamples = Math.abs(current - previous) < 0.00001 ? stableSamples + 1 : 0;
            previous = current;
            return stableSamples;
          },
          { intervals: [100], timeout: 15_000 }
        )
        .toBeGreaterThanOrEqual(3);
      return previous;
    };

    await page.mouse.click(x, y, { button: 'right' });
    expect(await readLinearModuleSpecialDims(page, 'top')).toEqual([]);

    const beforeRightDrag = await settledHitHeight();
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(x + 28, y + 42, { steps: 4 });
    await page.mouse.up({ button: 'right' });
    await expect.poll(hitHeight).toBeGreaterThan(beforeRightDrag + 0.04);

    const beforeShiftDrag = await settledHitHeight();
    await page.keyboard.down('Shift');
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect.poll(hitHeight).toBeLessThan(beforeShiftDrag - 0.04);

    const beforeArrow = await settledHitHeight();
    await canvas.focus();
    await expect(canvas).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect.poll(hitHeight).toBeGreaterThan(beforeArrow + 0.02);
    expect(await readLinearModuleSpecialDims(page, 'top')).toEqual([]);
    expectNoRuntimeIssues(issues);
  });

  test('viewer measurement waits for its tool and handles the first hover and click @critical', async ({
    page,
  }) => {
    const issues = collectRuntimeIssues(page);
    const toolModule = /\/viewer_measurement_tool\.ts(?:\?.*)?$/u;
    const loadGate = Promise.withResolvers<void>();
    await page.route(toolModule, async route => {
      await loadGate.promise;
      await route.continue();
    });

    try {
      await gotoSmokeApp(page);
      const toggle = page.getByTestId('viewer-measurement-toggle-button');
      const menu = page.getByTestId('viewer-measurement-mode-menu');
      await expect(toggle).toHaveAttribute('aria-busy', 'false');

      const toolRequest = page.waitForRequest(toolModule);
      await toggle.press('Enter');
      await toolRequest;
      await expect(toggle).toHaveAttribute('aria-busy', 'true');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(menu).toHaveCount(0);
      loadGate.resolve();

      await expect(menu).toBeVisible();
      const point = { x: 0.1, y: 0 };
      const canvas = page.locator('#viewer-container canvas').first();
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Expected a visible viewer canvas');
      await page.mouse.move(box.x + ((point.x + 1) / 2) * box.width, box.y + box.height / 2);
      await expect(page.locator('[data-wp-viewer-measurement-part-tooltip].is-open')).toBeVisible();

      // The first click on empty canvas is consumed by the measurement tool and exits the mode.
      await page.mouse.click(box.x + box.width * 0.05, box.y + box.height * 0.85);
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(menu).toHaveCount(0);
      expectNoRuntimeIssues(issues);
    } finally {
      loadGate.resolve();
    }
  });

  test('manual door split can be removed at the same pointer position after rebuilding', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);
    await setDoorFeatureToggle(page, 'splitDoors', true);
    await setDoorAuthoringMode(page, 'split-custom', true);

    const point = { x: 0.1, y: 0 };
    await expect.poll(async () => (await inspectCanvasViaDebugNdc(page, point))?.partId).toMatch(/^d\d+_/u);
    const canvas = page.locator('#viewer-container canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const client = { x: box!.x + ((point.x + 1) / 2) * box!.width, y: box!.y + box!.height / 2 };
    const readCuts = async () => {
      const state = await readDebugStoreState(page);
      const config = state.config as { splitDoorsMap?: Record<string, unknown> };
      return config.splitDoorsMap?.splitpos_d3 || [];
    };

    await page.mouse.move(client.x, client.y);
    for (let cycle = 0; cycle < 3; cycle++) {
      const beforeBuild = (await readBuildDebugStats(page)).executeCount;
      await page.mouse.down();
      await page.mouse.up();
      await expect.poll(readCuts).toHaveLength(1);
      await expect
        .poll(async () => (await readBuildDebugStats(page)).executeCount)
        .toBeGreaterThan(beforeBuild);

      // The cut opens a gap: selectors/carcass behind it still produce a click
      // hit, while the visible line remains an actionable removal target.
      await expect
        .poll(async () => (await inspectCanvasViaDebugNdc(page, point))?.partId || '')
        .not.toMatch(/^d\d+_/u);
      await expect
        .poll(async () => canvas.evaluate(node => (node as HTMLElement).style.cursor))
        .toBe('pointer');
      const beforeRemove = (await readBuildDebugStats(page)).executeCount;
      await page.mouse.down();
      await page.mouse.up();
      await expect.poll(readCuts).toEqual([]);
      await expect
        .poll(async () => (await readBuildDebugStats(page)).executeCount)
        .toBeGreaterThan(beforeRemove);
    }
    expectNoRuntimeIssues(issues);
  });

  test('places and removes an arched cut, mirror and CNC on a single leaf and across a seam @critical', async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);
    await setDoorFeatureToggle(page, 'splitDoors', true);
    await setDoorAuthoringMode(page, 'split-custom', true);
    const canvas = page.locator('#viewer-container canvas').first();
    const targets = await page.evaluate(() => {
      const canvas = window.__WP_DEBUG__!.canvas;
      const y = 0;
      const raw = Array.from({ length: 401 }, (_, i) => {
        const x = -0.6 + i * 0.003;
        return { x, part: canvas.inspectNdc(x, y)?.partId };
      });
      const samples = raw.filter(item => /^d[0-9]+_(full|top|bot)$/u.test(item.part || ''));
      const boundary = samples.findIndex((item, index) => {
        const previous = samples[index - 1];
        return previous && item.part !== previous.part && item.x - previous.x < 0.02;
      });
      const first = samples[boundary - 1];
      const second = samples[boundary];
      if (!first || !second) return null;
      const same = samples.filter(item => item.part === first.part);
      const start = same[0]?.x;
      const end = samples.filter(item => item.part === second.part).at(-1)?.x;
      if (start === undefined || end === undefined) return null;
      return {
        single: { x: (start + first.x) / 2, y },
        pair: { x: (first.x + second.x) / 2 + 0.006, y },
        neighbor: { x: (second.x + end) / 2, y },
      };
    });
    if (!targets) throw new Error('Expected two adjacent visible door leaves');

    const archCounts = async () => {
      const state = await readDebugStoreState(page);
      const config = state.config as {
        splitDoorsMap?: Record<string, unknown>;
        grooveLayoutMap?: Record<string, { arch?: unknown }[]>;
        mirrorLayoutMap?: Record<string, { arch?: unknown }[]>;
      };
      return {
        cut: Object.keys(config.splitDoorsMap ?? {}).filter(key => key.startsWith('splitarch_')).length,
        groove: Object.values(config.grooveLayoutMap ?? {})
          .flat()
          .filter(entry => entry.arch).length,
        mirror: Object.values(config.mirrorLayoutMap ?? {})
          .flat()
          .filter(entry => entry.arch).length,
      };
    };
    const pointOnCanvas = async (point: { x: number; y: number }) => {
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Expected viewer canvas');
      return { x: box.x + ((point.x + 1) * box.width) / 2, y: box.y + ((1 - point.y) * box.height) / 2 };
    };

    for (const tool of ['cut', 'groove', 'mirror'] as const) {
      if (tool === 'groove') {
        await setDoorAuthoringMode(page, 'split-custom', false);
        await setDoorFeatureToggle(page, 'groovesEnabled', true);
        await page.getByTestId('design-groove-manual-button').click();
      } else if (tool === 'mirror') {
        await page.getByTestId('design-multicolor-enabled-toggle').locator('..').click();
        await page.locator('[data-wp-search-special="mirror"]').click();
      }
      await page.getByTestId(`design-${tool}-shape-arch`).click();
      for (const placement of ['single', 'pair'] as const) {
        const point = await pointOnCanvas(targets[placement]);
        await page.mouse.move(point.x, point.y);
        await expect
          .poll(async () => canvas.evaluate(node => (node as HTMLElement).style.cursor), {
            message: `preview ${tool} ${placement}`,
          })
          .toBe('pointer');
        const beforeAdd = (await readBuildDebugStats(page)).executeCount;
        await page.mouse.click(point.x, point.y);
        await expect.poll(async () => (await archCounts())[tool]).toBe(placement === 'single' ? 1 : 2);
        await expect
          .poll(async () => (await readBuildDebugStats(page)).executeCount)
          .toBeGreaterThan(beforeAdd);
        const removeFrom =
          tool === 'cut'
            ? { x: point.x, y: point.y + 10 }
            : { x: point.x + (placement === 'pair' ? 9 : 0), y: point.y + 22 };
        await page.mouse.move(removeFrom.x, removeFrom.y);
        const beforeRemove = (await readBuildDebugStats(page)).executeCount;
        await page.mouse.click(removeFrom.x, removeFrom.y);
        await expect
          .poll(async () => (await archCounts())[tool], { message: `remove ${tool} ${placement}` })
          .toBe(0);
        await expect
          .poll(async () => (await readBuildDebugStats(page)).executeCount)
          .toBeGreaterThan(beforeRemove);
      }
      if (tool === 'cut') {
        const left = await pointOnCanvas(targets.single);
        const right = await pointOnCanvas({ ...targets.neighbor, y: 0.18 });
        await page.mouse.move(left.x, left.y);
        await expect
          .poll(async () => canvas.evaluate(node => (node as HTMLElement).style.cursor))
          .toBe('pointer');
        await page.keyboard.down('Shift');
        try {
          await page.mouse.click(left.x, left.y);
          await expect.poll(async () => (await archCounts()).cut).toBe(1);
          await page.mouse.move(right.x, right.y);
          await page.mouse.click(right.x, right.y);
          await expect.poll(async () => (await archCounts()).cut).toBe(2);
          const cuts = (
            (await readDebugStoreState(page)).config as {
              splitDoorsMap: Record<string, { peak: number }[]>;
            }
          ).splitDoorsMap;
          const peaks = Object.entries(cuts)
            .filter(([key]) => key.startsWith('splitarch_'))
            .flatMap(([, cuts]) => cuts.map(cut => cut.peak));
          expect(peaks[0]).toBeCloseTo(peaks[1]!, 5);
        } finally {
          await page.keyboard.up('Shift');
        }
        for (const target of [targets.single, targets.neighbor]) {
          const point = await pointOnCanvas(target);
          await page.mouse.click(point.x, point.y);
        }
        await expect.poll(async () => (await archCounts()).cut).toBe(0);
      }
      if (tool === 'groove') {
        const single = await pointOnCanvas({ ...targets.single, y: -0.09 });
        const taller = await pointOnCanvas({ ...targets.single, y: -0.02 });
        const pair = await pointOnCanvas(targets.pair);
        const readGrooves = async () => {
          const config = (await readDebugStoreState(page)).config as {
            grooveLayoutMap: Record<string, { heightCm: number; arch?: { link?: string } }[]>;
          };
          return Object.values(config.grooveLayoutMap).flat();
        };
        await page.mouse.click(single.x, single.y);
        await expect.poll(readGrooves).toHaveLength(1);
        const firstHeight = (await readGrooves())[0]!.heightCm;
        await page.mouse.click(taller.x, taller.y);
        await expect.poll(async () => (await readGrooves())[0]?.heightCm ?? 0).toBeGreaterThan(firstHeight);
        expect(await readGrooves()).toHaveLength(1);
        await page.mouse.click(pair.x, pair.y);
        await expect.poll(readGrooves).toHaveLength(2);
        const paired = await readGrooves();
        expect(paired[0]?.arch?.link).toBeTruthy();
        expect(paired[0]?.arch?.link).toBe(paired[1]?.arch?.link);
        await page.mouse.click(pair.x, pair.y);
        await expect.poll(async () => (await archCounts()).groove).toBe(0);

        await page.locator('#wp-r-groove-draft-height').fill('42');
        await page.mouse.click(single.x, single.y);
        await expect.poll(readGrooves).toHaveLength(1);
        expect((await readGrooves())[0]?.heightCm).toBeCloseTo(42, 6);
        const earlierPlacementInterior = { x: single.x, y: single.y + 28 };
        await page.mouse.click(earlierPlacementInterior.x, earlierPlacementInterior.y);
        await expect.poll(readGrooves).toHaveLength(0);
        await page.mouse.click(earlierPlacementInterior.x, earlierPlacementInterior.y);
        await expect.poll(readGrooves).toHaveLength(1);
        await page.mouse.click(earlierPlacementInterior.x, earlierPlacementInterior.y);
        await expect.poll(readGrooves).toHaveLength(0);
      }
      const background = await pointOnCanvas({ x: 0.75, y: -0.3 });
      await page.mouse.click(background.x, background.y);
      await expect
        .poll(async () => (await readDebugStoreState(page)).mode)
        .toMatchObject({ primary: 'none' });
    }

    await setDoorAuthoringMode(page, 'split-custom', true);
    const readMixedCutCounts = async () => {
      const { splitDoorsMap = {} } = (await readDebugStoreState(page)).config as {
        splitDoorsMap?: Record<string, unknown>;
      };
      return {
        arcs: Object.keys(splitDoorsMap).filter(key => key.startsWith('splitarch_')).length,
        straight: Object.keys(splitDoorsMap).filter(key => key.startsWith('splitpos_')).length,
      };
    };
    for (const [target, order] of [
      [targets.single, ['straight', 'arch']],
      [targets.neighbor, ['arch', 'straight']],
    ] as const) {
      const before = await readMixedCutCounts();
      for (const shape of order) {
        await page.getByTestId(`design-cut-shape-${shape}`).click();
        const point = await pointOnCanvas({ x: target.x, y: shape === 'straight' ? 0.3 : -0.1 });
        const buildCount = (await readBuildDebugStats(page)).executeCount;
        await page.mouse.click(point.x, point.y);
        await expect
          .poll(async () => (await readBuildDebugStats(page)).executeCount)
          .toBeGreaterThan(buildCount);
      }
      await expect.poll(readMixedCutCounts).toEqual({ arcs: before.arcs + 1, straight: before.straight + 1 });
      await expect
        .poll(() =>
          page.evaluate(x => {
            const canvasDebug = window.__WP_DEBUG__!.canvas;
            return new Set([0.4, 0.13, -0.24].map(y => canvasDebug.inspectNdc(x, y)?.partId)).size;
          }, target.x)
        )
        .toBe(3);
    }

    await setDoorAuthoringMode(page, 'split-custom', false);
    const multicolor = page.getByTestId('design-multicolor-enabled-toggle');
    if (!(await multicolor.isChecked())) await multicolor.locator('..').click();
    await page.locator('[data-wp-search-special="mirror"]').click();
    await page.getByTestId('design-mirror-shape-arch').click();
    const mirrorOnCurve = await pointOnCanvas({ x: targets.single.x, y: -0.24 });
    const beforeMirror = (await readBuildDebugStats(page)).executeCount;
    await page.mouse.move(mirrorOnCurve.x, mirrorOnCurve.y);
    await expect.poll(() => canvas.evaluate(node => (node as HTMLElement).style.cursor)).toBe('pointer');
    await page.mouse.click(mirrorOnCurve.x, mirrorOnCurve.y);
    await expect.poll(async () => (await archCounts()).mirror).toBe(1);
    await expect
      .poll(async () => (await readBuildDebugStats(page)).executeCount)
      .toBeGreaterThan(beforeMirror);
    const background = await pointOnCanvas({ x: 0.75, y: -0.3 });
    await page.mouse.click(background.x, background.y);
    await setDoorFeatureToggle(page, 'groovesEnabled', true);
    await setDoorAuthoringMode(page, 'groove', true);
    const manualGroove = page.getByTestId('design-groove-manual-button');
    if ((await manualGroove.getAttribute('aria-expanded')) !== 'true') await manualGroove.click();
    await page.getByTestId('design-groove-shape-arch').click();
    await page.locator('#wp-r-groove-draft-height').fill('22');
    const curvedFront = await pointOnCanvas({ x: targets.neighbor.x, y: -0.22 });
    const beforeGroove = (await archCounts()).groove;
    await page.mouse.move(curvedFront.x, curvedFront.y);
    await expect.poll(() => canvas.evaluate(node => (node as HTMLElement).style.cursor)).toBe('pointer');
    await page.mouse.click(curvedFront.x, curvedFront.y);
    await expect.poll(async () => (await archCounts()).groove).toBe(beforeGroove + 1);
    expectNoRuntimeIssues(issues);
  });

  test('curved cuts stack on one door and curved finishes snap past the edge @critical', async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);
    await setDoorFeatureToggle(page, 'splitDoors', true);
    await setDoorAuthoringMode(page, 'split-custom', true);
    const canvas = page.locator('#viewer-container canvas').first();
    const targets = await page.evaluate(() => {
      const debug = window.__WP_DEBUG__!.canvas;
      const baseOf = (partId?: string) => /^d[1-9]\d*(?=_)/.exec(partId ?? '')?.[0];
      const doors = new Map<string, number[]>();
      for (let index = 0; index <= 180; index++) {
        const x = -0.45 + index * 0.005;
        const base = baseOf(debug.inspectNdc(x, 0)?.partId);
        if (!base) continue;
        const row = doors.get(base) ?? [];
        row.push(x);
        doors.set(base, row);
      }
      return [...doors.entries()].slice(0, 2).map(([base, row]) => {
        const x = row[Math.floor(row.length / 2)]!;
        const ys = [];
        for (let index = 0; index <= 360; index++) {
          const y = -0.9 + index * 0.005;
          if (baseOf(debug.inspectNdc(x, y)?.partId) === base) ys.push(y);
        }
        return { x, base, bottom: ys[0]!, top: ys.at(-1)! };
      });
    });
    expect(targets).toHaveLength(2);
    const [cutDoor, plainDoor] = targets;
    if (!cutDoor || !plainDoor) throw new Error('Expected two door fronts');
    const clickNdc = async (x: number, y: number) => {
      const bounds = (await canvas.boundingBox())!;
      const px = bounds.x + ((x + 1) * bounds.width) / 2;
      const py = bounds.y + ((1 - y) * bounds.height) / 2;
      await page.mouse.move(px, py);
      await expect.poll(() => canvas.evaluate(node => (node as HTMLElement).style.cursor)).toBe('pointer');
      const previous = (await readBuildDebugStats(page)).executeCount;
      await page.mouse.click(px, py);
      await expect.poll(async () => (await readBuildDebugStats(page)).executeCount).toBeGreaterThan(previous);
    };
    const readCuts = async () => {
      const { splitDoorsMap } = (await readDebugStoreState(page)).config as {
        splitDoorsMap: Record<string, { peak: number; base?: number }[]>;
      };
      return splitDoorsMap[`splitarch_${cutDoor.base}`] ?? [];
    };
    await expect(page.getByTestId('design-cut-shape-arch-both')).toHaveCount(0);
    await expect(page.getByTestId('design-cut-shape-ellipse')).toHaveCount(0);
    await page.getByTestId('design-cut-shape-arch').click();
    await clickNdc(cutDoor.x, cutDoor.top + 0.008);
    expect((await readCuts())[0]?.peak).toBeGreaterThan(0.98);
    await page.getByTestId('design-cut-shape-arch-down').click();
    await clickNdc(cutDoor.x, cutDoor.bottom - 0.008);
    expect((await readCuts())[1]?.base).toBeLessThan(0.02);
    await page.getByTestId('design-cut-shape-arch').click();
    await clickNdc(cutDoor.x, 0);
    await expect.poll(readCuts).toHaveLength(3);
    await clickNdc(cutDoor.x, cutDoor.bottom - 0.008);
    await expect.poll(readCuts).toHaveLength(2);

    await setDoorAuthoringMode(page, 'split-custom', false);
    const multicolor = page.getByTestId('design-multicolor-enabled-toggle');
    if (!(await multicolor.isChecked())) await multicolor.locator('..').click();
    await page.locator('[data-wp-search-special="mirror"]').click();
    await page.getByTestId('design-mirror-shape-arch').click();
    const readFinishes = async (tool: 'groove' | 'mirror', partId: string) => {
      const config = (await readDebugStoreState(page)).config as Record<
        string,
        Record<string, { heightCm: number; arch?: { fitToFront?: boolean; shape?: string } }[]>
      >;
      return config[`${tool}LayoutMap`]?.[partId] ?? [];
    };
    const curvedPartId = `${cutDoor.base}_bot`;
    await clickNdc(cutDoor.x, 0.007);
    expect((await readFinishes('mirror', curvedPartId))[0]?.arch?.fitToFront).toBe(true);
    await clickNdc(cutDoor.x, 0.007);
    await expect.poll(() => readFinishes('mirror', curvedPartId)).toHaveLength(0);
    const enterGrooves = async () => {
      await setDoorFeatureToggle(page, 'groovesEnabled', true);
      await setDoorAuthoringMode(page, 'groove', true);
      const manual = page.getByTestId('design-groove-manual-button');
      if ((await manual.getAttribute('aria-expanded')) !== 'true') await manual.click();
    };
    await enterGrooves();
    await page.getByTestId('design-groove-shape-arch').click();
    await page.locator('#wp-r-groove-draft-height').fill('22');
    await clickNdc(cutDoor.x, 0.007);
    const fittedGroove = (await readFinishes('groove', curvedPartId))[0];
    expect(fittedGroove?.arch?.fitToFront).toBe(true);
    expect(fittedGroove?.heightCm).toBeGreaterThan(22);
    await page.locator('#wp-r-groove-draft-height').fill('');
    await clickNdc(plainDoor.x, plainDoor.top + 0.008);
    await page.getByTestId('design-groove-shape-arch-down').click();
    await clickNdc(plainDoor.x, plainDoor.bottom - 0.008);
    const config = (await readDebugStoreState(page)).config as {
      grooveLayoutMap: Record<string, { arch?: { shape?: string } }[]>;
    };
    expect(
      Object.entries(config.grooveLayoutMap)
        .filter(([key]) => key.startsWith(`${plainDoor.base}_`))
        .flatMap(([, entries]) => entries.map(entry => entry.arch?.shape))
    ).toContain('arch-down');
    expectNoRuntimeIssues(issues);
  });

  test('browser hover and click apply cell dimensions to the same canvas target @critical', async ({
    page,
  }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const expectedDims = {
      widthCm: 86,
      heightCm: 211,
      depthCm: 47,
    };

    await setCellDimsMode(page, true);
    await resetAllCellDimsOverrides(page);
    await setCellDimsDraft(page, 'cellDimsWidth', expectedDims.widthCm);
    await setCellDimsDraft(page, 'cellDimsHeight', expectedDims.heightCm);
    await setCellDimsDraft(page, 'cellDimsDepth', expectedDims.depthCm);

    const applied = await applyCellDimsToReachableLinearModuleViaBrowserPointer(page, expectedDims, {
      stack: 'top',
    });

    expect(applied.widthCm).toBe(expectedDims.widthCm);
    expect(applied.heightCm).toBe(expectedDims.heightCm);
    expect(applied.depthCm).toBe(expectedDims.depthCm);
    await expect.poll(async () => (await readLinearModuleSpecialDims(page, 'top')).length).toBe(1);

    expectNoRuntimeIssues(issues);
  });

  test('groove click crosses the canonical runtime patch boundary and rebuilds @critical', async ({
    page,
  }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);
    await setDoorFeatureToggle(page, 'groovesEnabled', true);
    await setDoorAuthoringMode(page, 'groove', true);
    await resetBuildDebugStats(page);
    await expect
      .poll(async () => {
        const state = await readDebugStoreState(page);
        const mode = state.mode && typeof state.mode === 'object' ? state.mode : {};
        return String((mode as Record<string, unknown>).primary || 'none');
      })
      .toBe('groove');

    const xCandidates = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];
    const yCandidates = [0.75, 0.55, 0.35, 0.15, -0.05, -0.25, -0.45, -0.65];
    let doorPoint: { x: number; y: number } | null = null;
    const scannedHits: string[] = [];

    for (const y of yCandidates) {
      for (const x of xCandidates) {
        const hit = await inspectCanvasViaDebugNdc(page, { x, y });
        scannedHits.push(`(${x},${y})=${String(hit?.partId || 'none')}`);
        if (!hit?.partId || !/^d\d+_/u.test(hit.partId)) continue;
        doorPoint = { x, y };
        break;
      }
      if (doorPoint) break;
    }

    expect(doorPoint, scannedHits.join(', ')).not.toBeNull();
    await clickCanvasViaDebugNdc(page, doorPoint!);
    await expect
      .poll(async () => {
        const state = await readDebugStoreState(page);
        const runtime = state.runtime && typeof state.runtime === 'object' ? state.runtime : {};
        const pendingMap = (runtime as Record<string, unknown>).pendingGrooveLinesCountMap;
        return pendingMap && typeof pendingMap === 'object' ? Object.keys(pendingMap).length : 0;
      })
      .toBeGreaterThan(0);

    const state = await readDebugStoreState(page);
    const runtime = state.runtime && typeof state.runtime === 'object' ? state.runtime : {};
    const config = state.config && typeof state.config === 'object' ? state.config : {};
    const pendingGrooveCountMap = (runtime as Record<string, unknown>).pendingGrooveLinesCountMap as Record<
      string,
      unknown
    >;
    const persistedGrooveCountMap = (config as Record<string, unknown>).grooveLinesCountMap as Record<
      string,
      unknown
    >;
    const pendingGrooveCountEntries = Object.entries(pendingGrooveCountMap);
    for (const [partId, count] of pendingGrooveCountEntries) {
      expect(persistedGrooveCountMap[partId]).toBe(count);
    }
    await expect.poll(async () => (await readBuildDebugStats(page)).executeCount).toBeGreaterThan(0);
    expectNoRuntimeIssues(issues);
  });
});
