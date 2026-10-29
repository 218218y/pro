import { test, expect } from '@playwright/test';
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
    expectNoRuntimeIssues(issues);
  });
}
