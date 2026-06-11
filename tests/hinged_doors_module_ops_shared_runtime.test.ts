import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampHandleAbsY,
  computeDefaultHandleAbsY,
  createHingedDoorIterationState,
  createHingedDoorModuleOpsContext,
  pushHingedDoorSegment,
} from '../esm/native/builder/hinged_doors_module_ops_shared.ts';

test('hinged_doors_module_ops_shared builds canonical context and resolves split/full curtain fallback', () => {
  const ctx = createHingedDoorModuleOpsContext({
    cfg: {
      wardrobeType: 'hinged',
      isMultiColorMode: true,
      curtainMap: { d1_full: 'linen' },
      doorSpecialMap: { d1_full: 'glass' },
    },
    moduleIndex: 0,
    modulesLength: 2,
    moduleDoors: 2,
    modWidth: 0.8,
    currentX: -0.4,
    drawerHeightTotal: 0.3,
    effectiveBottomY: 0.018,
    startY: 0,
    woodThick: 0.018,
    cabinetBodyHeight: 2.4,
    D: 0.55,
    opsList: [],
  });

  assert.ok(ctx);
  assert.ok(Math.abs((ctx?.doorBottomY ?? 0) - 0.02) < 1e-9);
  assert.equal(ctx?.singleDoorW, 0.4);
  assert.equal(ctx?.resolveCurtainForPart('d1_top', null), 'linen');
  assert.equal(ctx?.resolveSpecialForPart('d1_top', 'linen'), 'glass');
});

test('hinged_doors_module_ops_shared computes iteration overrides and clamps long edge handles', () => {
  const ctx = createHingedDoorModuleOpsContext({
    cfg: {
      wardrobeType: 'hinged',
      globalHandleType: 'edge',
      handlesMap: { __wp_edge_handle_variant_global: 'long' },
    },
    moduleIndex: 1,
    modulesLength: 2,
    moduleDoors: 1,
    modWidth: 0.9,
    currentX: 0.1,
    effectiveBottomY: 0.018,
    startY: 0,
    woodThick: 0.018,
    cabinetBodyHeight: 2.4,
    D: 0.55,
    opsList: [],
    hingedDoorPivotMap: {
      3: { pivotX: 1.1, meshOffsetX: -0.45, isLeftHinge: false, doorWidth: 0.92 },
    },
  });
  assert.ok(ctx);
  const state = createHingedDoorIterationState(ctx!, 0, 3);
  assert.equal(state.pivotX, 1.1);
  assert.equal(state.meshOffsetX, -0.45);
  assert.equal(state.isLeftHinge, false);
  assert.equal(state.doorWidth, 0.92);

  assert.equal(clampHandleAbsY(ctx!, 0.1, 0.02, 2.0, 'd3_full'), 0.22);
  assert.equal(clampHandleAbsY(ctx!, 1.95, 0.02, 2.0, 'd3_full'), 1.8);
});

test('hinged_doors_module_ops_shared derives default handle height and emits segment ops', () => {
  const opsList: unknown[] = [];
  const ctx = createHingedDoorModuleOpsContext({
    cfg: {
      wardrobeType: 'hinged',
      globalHandleType: 'edge',
      handlesMap: { __wp_edge_handle_variant_global: 'long' },
      isMultiColorMode: true,
      doorSpecialMap: { d4_top: 'mirror' },
    },
    moduleIndex: 0,
    modulesLength: 1,
    moduleDoors: 1,
    modWidth: 0.8,
    currentX: 0,
    effectiveBottomY: 0.018,
    startY: 0,
    woodThick: 0.018,
    cabinetBodyHeight: 2.4,
    D: 0.55,
    opsList,
    moduleCfgList: [{ hasShoeDrawer: true, extDrawersCount: 4 }],
    removeDoorsEnabled: true,
    isDoorRemoved: partId => partId === 'd4_top',
  });
  assert.ok(ctx);
  const state = createHingedDoorIterationState(ctx!, 0, 4);
  const absY = computeDefaultHandleAbsY(ctx!, 4);
  assert.ok(Math.abs(absY - 1.348) < 1e-9);

  pushHingedDoorSegment(ctx!, state, {
    partId: 'd4_top',
    segH: 0.9,
    segY: 1.3,
    curtainVal: null,
    grooveFlag: true,
    handleAbsY: 1.2,
    allowHandle: true,
    colorVal: null,
  });

  assert.equal(opsList.length, 1);
  assert.deepEqual(opsList[0], {
    partId: 'd4_top',
    moduleIndex: 0,
    pivotX: state.pivotX,
    y: 1.3,
    z: ctx!.doorFrontZ + 0.01,
    width: state.doorWidth,
    height: 0.9,
    meshOffsetX: state.meshOffsetX,
    isLeftHinge: state.isLeftHinge,
    isMirror: true,
    hasGroove: false,
    curtain: null,
    style: null,
    handleAbsY: 1.2,
    allowHandle: true,
    isRemoved: true,
  });
});
