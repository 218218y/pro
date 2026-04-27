import test from 'node:test';
import assert from 'node:assert/strict';

import { handleCornerPerCellDimsClick } from '../esm/native/services/canvas_picking_cell_dims_corner_cell.ts';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createAppHarness() {
  const calls = {
    cornerConfigs: [] as any[],
    uiPatches: [] as any[],
    toasts: [] as Array<{ message: string; sticky?: boolean }>,
    touches: [] as any[],
    builds: [] as any[],
    renders: 0,
  };

  const App = {
    actions: {
      config: {
        setCornerConfiguration(next: unknown) {
          calls.cornerConfigs.push(cloneJson(next));
          return next;
        },
      },
      ui: {
        patchSoft(patch: unknown) {
          calls.uiPatches.push(cloneJson(patch));
          return patch;
        },
      },
      meta: {
        touch(meta?: unknown) {
          calls.touches.push(cloneJson(meta));
          return meta;
        },
      },
    },
    services: {
      uiFeedback: {
        updateEditStateToast(message: string, sticky?: boolean) {
          calls.toasts.push({ message, sticky });
        },
      },
      builder: {
        requestBuild(_uiOverride: unknown, meta?: unknown) {
          calls.builds.push(cloneJson(meta));
          return true;
        },
      },
    },
    platform: {
      triggerRender() {
        calls.renders += 1;
        return true;
      },
      reportError() {
        return true;
      },
    },
  } as any;

  return { App, calls };
}

function createBaseContext(App: any, overrides: Record<string, unknown> = {}) {
  return {
    App,
    ui: { cornerDoors: 4 },
    cfg: {},
    raw: { cornerDoors: 4 },
    applyW: null,
    applyH: null,
    applyD: null,
    foundModuleIndex: 'corner:0',
    foundPartId: null,
    ensureCornerCellConfigRef: (cellIdx: number) => {
      const cfgs = [
        { specialDims: { baseWidthCm: 60, widthCm: 60, baseHeightCm: 240, baseDepthCm: 55 } },
        { specialDims: { baseWidthCm: 60, widthCm: 60, baseHeightCm: 240, baseDepthCm: 55 } },
      ];
      return cfgs[cellIdx] || null;
    },
    nextCornerCfg: {
      modulesConfiguration: [
        { specialDims: { baseWidthCm: 60, widthCm: 60, baseHeightCm: 240, baseDepthCm: 55 } },
        { specialDims: { baseWidthCm: 60, widthCm: 60, baseHeightCm: 240, baseDepthCm: 55 } },
      ],
      specialDims: { baseWidthCm: 120, widthCm: 120 },
    },
    sd: { baseWidthCm: 120, widthCm: 120 },
    connSd: {},
    cornerWBase: 120,
    cornerHBase: 240,
    cornerDBase: 55,
    wallLenBase: 103,
    curWingW: 120,
    curH: 240,
    curD: 55,
    curWallL: 103,
    isConnectorHit: false,
    cellIdx: 0,
    isPerCellWing: true,
    ...overrides,
  } as any;
}

test('corner per-cell dims keeps height/depth-only overrides on the focused height-depth owner', () => {
  const { App, calls } = createAppHarness();
  const ctx = createBaseContext(App, {
    applyH: 250,
    applyD: 60,
  });

  const handled = handleCornerPerCellDimsClick(ctx);
  assert.equal(handled, true);
  assert.equal(calls.cornerConfigs.length, 1);
  assert.equal(calls.uiPatches.length, 0);
  assert.equal(calls.builds.length, 1);
  assert.equal(calls.renders, 1);

  const nextCfg = calls.cornerConfigs[0];
  const firstCell = nextCfg.modulesConfiguration[0];
  assert.equal(firstCell.specialDims.baseHeightCm, 240);
  assert.equal(firstCell.specialDims.heightCm, 250);
  assert.equal(firstCell.specialDims.baseDepthCm, 55);
  assert.equal(firstCell.specialDims.depthCm, 60);
  assert.match(calls.toasts[0]?.message || '', /עודכן גובה/);
  assert.match(calls.toasts[0]?.message || '', /עודכן עומק/);
});

test('corner per-cell dims keeps width redistribution and corner-width sync on the focused width owner', () => {
  const { App, calls } = createAppHarness();
  const ctx = createBaseContext(App, {
    applyW: 80,
  });

  const handled = handleCornerPerCellDimsClick(ctx);
  assert.equal(handled, true);
  assert.equal(calls.cornerConfigs.length, 1);
  assert.equal(calls.uiPatches.length, 1);
  assert.equal(calls.builds.length, 1);
  assert.equal(calls.renders, 1);

  const nextCfg = calls.cornerConfigs[0];
  assert.equal(nextCfg.specialDims.baseWidthCm, 140);
  assert.equal(nextCfg.specialDims.widthCm, 140);
  assert.equal(calls.uiPatches[0].cornerWidth, 140);
  assert.equal(calls.uiPatches[0].raw.cornerWidth, 140);

  const firstCell = nextCfg.modulesConfiguration[0].specialDims;
  const secondCell = nextCfg.modulesConfiguration[1].specialDims;
  assert.equal(firstCell.baseWidthCm, 60);
  assert.equal(firstCell.widthCm, 80);
  assert.equal(secondCell.baseWidthCm, 60);
  assert.equal(secondCell.widthCm, 60);
  assert.match(calls.toasts[0]?.message || '', /עודכן רוחב/);
  assert.match(calls.toasts[0]?.message || '', /רוחב הארון הפינתי/);
});
