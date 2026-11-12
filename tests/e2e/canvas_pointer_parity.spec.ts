import { test, expect } from '@playwright/test';

import {
  applyCellDimsToReachableLinearModuleViaBrowserPointer,
  clickCanvasViaDebugNdc,
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  inspectCanvasViaDebugNdc,
  readBuildDebugStats,
  readDebugStoreState,
  readLinearModuleSpecialDims,
  resetAllCellDimsOverrides,
  resetBuildDebugStats,
  setCellDimsDraft,
  setCellDimsMode,
  setDoorAuthoringMode,
  setDoorFeatureToggle,
} from './helpers/project_flows';

test.describe('Canvas pointer parity smoke', () => {
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
