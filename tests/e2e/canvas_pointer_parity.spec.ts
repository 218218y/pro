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
