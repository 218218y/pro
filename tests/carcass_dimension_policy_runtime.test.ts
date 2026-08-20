import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCarcassShell } from '../esm/native/builder/core_carcass_shell.ts';
import { createRemovedFrameSideConstructionCapabilities } from '../esm/native/builder/removed_frame_side_construction_capabilities.ts';
import { resolveRemovedFrameSideConstructionPlan } from '../esm/native/builder/removed_frame_side_construction_plan.ts';
import { resolveBuildFlowPlan } from '../esm/native/builder/build_flow_plan.ts';
import {
  createCornerWingCarcassShellMetrics,
  resolveCornerWingHorizPlacement,
  resolveCornerWingWallPlacement,
} from '../esm/native/builder/corner_wing_carcass_shell_metrics.ts';

function roundGeometry(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function boardSnapshot(board: Record<string, unknown>) {
  return {
    partId: board.partId,
    width: roundGeometry(Number(board.width)),
    height: roundGeometry(Number(board.height)),
    depth: roundGeometry(Number(board.depth)),
    x: roundGeometry(Number(board.x)),
    y: roundGeometry(Number(board.y)),
    z: roundGeometry(Number(board.z)),
  };
}

test('carcass shell policy preserves regular shell board and back-panel geometry', () => {
  const result = buildCarcassShell({
    totalW: 1.8,
    D: 0.6,
    H: 2.4,
    woodThick: 0.018,
    startY: 0,
    cabinetBodyHeight: 2.4,
    moduleWidths: null,
    moduleHeightsRaw: null,
    moduleDepths: null,
    isStepped: false,
    isDepthStepped: false,
    removedFrameSidePlan: resolveRemovedFrameSideConstructionPlan({
      capabilities: createRemovedFrameSideConstructionCapabilities({}),
    }),
  } as any);

  assert.deepEqual(result.boards.map(boardSnapshot), [
    { partId: 'body_floor', width: 1.763, height: 0.018, depth: 0.5872, x: 0, y: 0.009, z: 0.0014 },
    { partId: 'body_ceil', width: 1.763, height: 0.018, depth: 0.5872, x: 0, y: 2.391, z: 0.0014 },
    { partId: 'body_left', width: 0.018, height: 2.4, depth: 0.5922, x: -0.891, y: 1.2, z: 0.0039 },
    { partId: 'body_right', width: 0.018, height: 2.4, depth: 0.5922, x: 0.891, y: 1.2, z: 0.0039 },
  ]);
  assert.deepEqual(boardSnapshot(result.backPanel), {
    partId: undefined,
    width: 1.798,
    height: 2.4,
    depth: 0.005,
    x: 0,
    y: 1.2,
    z: -0.295,
  });
  assert.equal(result.backPanels, null);
});

function resolveInteriorPlan(wardrobeType: 'hinged' | 'sliding') {
  return resolveBuildFlowPlan({
    orchestration: {
      resolvePlanMaterials: () => ({}),
      computeModuleLayout: () => ({ carcassD: 0.6 }),
      createBoardFactory: () => () => ({}),
    },
    THREE: null,
    state: null,
    ui: {},
    cfg: { wardrobeType },
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: wardrobeType === 'sliding' ? 2 : 4,
    sketchMode: false,
    getMaterialFn: null,
    addOutlines: null,
    calculateModuleStructureFn: null,
    toStr: (value: unknown, fallback = '') => (value == null ? fallback : String(value)),
  } as any);
}

test('carcass interior policy preserves hinged and sliding internal depth geometry', () => {
  const hinged = resolveInteriorPlan('hinged');
  const sliding = resolveInteriorPlan('sliding');

  assert.deepEqual(
    {
      depthReduction: roundGeometry(hinged.depthReduction),
      internalDepth: roundGeometry(hinged.internalDepth),
      internalZ: roundGeometry(hinged.internalZ),
    },
    { depthReduction: 0.03, internalDepth: 0.57, internalZ: -0.01 }
  );
  assert.deepEqual(
    {
      depthReduction: roundGeometry(sliding.depthReduction),
      internalDepth: roundGeometry(sliding.internalDepth),
      internalZ: roundGeometry(sliding.internalZ),
    },
    { depthReduction: 0.12, internalDepth: 0.48, internalZ: -0.055 }
  );
});

test('carcass shell policy preserves corner-wing shell metrics and placements', () => {
  const params = {
    ctx: { wingD: 0.6 },
    locals: { cornerCells: [{}] },
    helpers: { asRecord: (value: unknown) => value as Record<string, unknown> },
  } as any;
  const metrics = createCornerWingCarcassShellMetrics(params);

  assert.deepEqual(
    Object.fromEntries(
      Object.entries(metrics).map(([key, value]) => [
        key,
        typeof value === 'number' ? roundGeometry(value) : value,
      ])
    ),
    {
      __wingIsUnifiedCabinet: false,
      __wingBackPanelThick: 0.005,
      __wingBackPanelCenterZ: -0.595,
      __carcassBackInsetZ: 0.0078,
      __carcassFrontInsetZ: 0.005,
      __wallZHalfInset: 0.0039,
      __horizZOffset: 0.0014,
    }
  );
  const horizontal = resolveCornerWingHorizPlacement(params, metrics, 0.6);
  const wall = resolveCornerWingWallPlacement(params, metrics, 0.6);
  assert.deepEqual(
    { z: roundGeometry(horizontal.z), depth: roundGeometry(horizontal.depth) },
    { z: -0.2986, depth: 0.5872 }
  );
  assert.deepEqual(
    { z: roundGeometry(wall.z), depth: roundGeometry(wall.depth) },
    { z: -0.2961, depth: 0.5922 }
  );
});
