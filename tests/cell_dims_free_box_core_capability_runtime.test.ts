import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCanvasFreeBoxCellDimsMutation,
  resolveCanvasFreeBoxCellDimsTarget,
  type CanvasFreeBoxCellDimsCoreArgs,
} from '../esm/native/services/canvas_picking_cell_dims_free_box_core.ts';

function createCoreArgs(
  overrides: Partial<CanvasFreeBoxCellDimsCoreArgs> = {}
): CanvasFreeBoxCellDimsCoreArgs {
  return {
    foundModuleIndex: 0,
    foundPartId: 'sketch_box_free_0_free-a',
    isBottomStack: false,
    hitUserData: {
      __wpSketchFreePlacement: true,
      __wpSketchBoxId: 'free-a',
      __wpSketchModuleKey: 0,
    },
    ui: {},
    applyW: 80,
    applyH: 90,
    applyD: 40,
    hexCellMode: false,
    hexCellProtrusionCm: null,
    hexCellDoorWidthCm: null,
    ...overrides,
  };
}

function createConfig(boxOverrides: Record<string, unknown> = {}) {
  const box: Record<string, unknown> = {
    id: 'free-a',
    freePlacement: true,
    absX: 0,
    absY: 0.406,
    widthM: 0.6,
    heightM: 0.8,
    depthM: 0.35,
    dividers: [{ id: 'v1', frontZ: 0.35 }],
    ...boxOverrides,
  };
  return {
    box,
    cfg: {
      sketchExtras: {
        boxes: [box],
      },
    },
  };
}

test('Cell Dimensions Free Box mutation core resolves identity and applies geometry without AppContainer', () => {
  const clickArgs = createCoreArgs({
    foundPartId: 'sketch_box_free_0_free-a_int_drawers_fd1_lower',
    hitUserData: { moduleIndex: 0 },
  });
  const target = resolveCanvasFreeBoxCellDimsTarget(clickArgs);
  assert.deepEqual(target, { boxId: 'free-a', moduleKey: 0 });

  const { cfg, box } = createConfig();
  const outcome = applyCanvasFreeBoxCellDimsMutation({ cfg, boxId: target.boxId, clickArgs });

  assert.deepEqual(outcome, {
    changed: true,
    removedHex: false,
    appliedHex: false,
    blockedMessage: null,
  });
  assert.equal(box.widthM, 0.8);
  assert.equal(box.heightM, 0.9);
  assert.equal(box.depthM, 0.4);
  assert.ok(Math.abs(Number(box.absY) - 0.456) <= 1e-9);
  assert.equal((box.dividers as Array<Record<string, unknown>>)[0]?.frontZ, 0.4);
  assert.deepEqual(box.specialDims, {
    baseWidthCm: 60,
    widthCm: 80,
    baseHeightCm: 80,
    heightCm: 90,
    baseDepthCm: 35,
    depthCm: 40,
  });
});

test('Cell Dimensions Free Box mutation core reports blocked base-stage changes instead of emitting runtime UI effects', () => {
  const clickArgs = createCoreArgs({
    ui: { baseType: 'legs', baseLegPlatformMode: 'stage' },
    applyW: null,
    applyH: 95,
    applyD: null,
  });
  const { cfg, box } = createConfig();
  const before = JSON.stringify(box);

  const outcome = applyCanvasFreeBoxCellDimsMutation({ cfg, boxId: 'free-a', clickArgs });

  assert.equal(outcome.changed, false);
  assert.equal(outcome.appliedHex, false);
  assert.equal(outcome.removedHex, false);
  assert.match(outcome.blockedMessage || '', /רגליים ובמה/);
  assert.equal(JSON.stringify(box), before);
});

test('Cell Dimensions Free Box mutation core blocks hex conversion over external drawers without partial mutation', () => {
  const clickArgs = createCoreArgs({
    applyW: null,
    applyH: null,
    applyD: null,
    hexCellMode: true,
    hexCellProtrusionCm: 12,
    hexCellDoorWidthCm: 50,
  });
  const { cfg, box } = createConfig({ regularExtDrawers: [{ id: 'drawer-1', enabled: true }] });
  const before = JSON.stringify(box);

  const outcome = applyCanvasFreeBoxCellDimsMutation({ cfg, boxId: 'free-a', clickArgs });

  assert.equal(outcome.changed, false);
  assert.match(outcome.blockedMessage || '', /מגירות/);
  assert.equal(JSON.stringify(box), before);
});

test('Cell Dimensions Free Box preserves active width and height while applying a new depth draft', () => {
  const { cfg, box } = createConfig();

  const first = applyCanvasFreeBoxCellDimsMutation({
    cfg,
    boxId: 'free-a',
    clickArgs: createCoreArgs({ applyW: 80, applyH: 90, applyD: null }),
  });
  assert.equal(first.changed, true);
  assert.equal(box.widthM, 0.8);
  assert.equal(box.heightM, 0.9);
  assert.equal(box.depthM, 0.35);
  assert.deepEqual(box.specialDims, {
    baseWidthCm: 60,
    widthCm: 80,
    baseHeightCm: 80,
    heightCm: 90,
  });

  const second = applyCanvasFreeBoxCellDimsMutation({
    cfg,
    boxId: 'free-a',
    clickArgs: createCoreArgs({ applyW: 80, applyH: 90, applyD: 40 }),
  });
  assert.equal(second.changed, true);
  assert.equal(box.widthM, 0.8);
  assert.equal(box.heightM, 0.9);
  assert.equal(box.depthM, 0.4);
  assert.deepEqual(box.specialDims, {
    baseWidthCm: 60,
    widthCm: 80,
    baseHeightCm: 80,
    heightCm: 90,
    baseDepthCm: 35,
    depthCm: 40,
  });
});

test('Cell Dimensions Free Box still toggles matching active dimensions back when the combined draft has no new value', () => {
  const { cfg, box } = createConfig({
    widthM: 0.8,
    heightM: 0.9,
    depthM: 0.4,
    specialDims: {
      baseWidthCm: 60,
      widthCm: 80,
      baseHeightCm: 80,
      heightCm: 90,
      baseDepthCm: 35,
      depthCm: 40,
    },
  });

  const outcome = applyCanvasFreeBoxCellDimsMutation({
    cfg,
    boxId: 'free-a',
    clickArgs: createCoreArgs({ applyW: 80, applyH: 90, applyD: 40 }),
  });

  assert.equal(outcome.changed, true);
  assert.equal(box.widthM, 0.6);
  assert.equal(box.heightM, 0.8);
  assert.equal(box.depthM, 0.35);
  assert.equal(box.specialDims, undefined);
});
