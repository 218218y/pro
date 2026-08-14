import test from 'node:test';
import assert from 'node:assert/strict';

import { computeExternalDrawersOpsForModule } from '../esm/native/builder/core_storage_compute_external_drawers.ts';
import { applyExternalDrawersForModule } from '../esm/native/builder/external_drawers_pipeline.ts';
import { createModuleDoorSpanResolver } from '../esm/native/builder/module_loop_pipeline_runtime_shared.ts';
import { createSketchBoxExternalDrawerOpPlan } from '../esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts';
import { createSketchExternalDrawerOpPlan } from '../esm/native/builder/render_interior_sketch_drawers_external_plan.ts';
import { DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY } from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import { STACK_SPLIT_POLICY } from '../esm/shared/dimensions/stack_split_policy.ts';
import {
  EXTERNAL_DRAWER_BOX_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
  resolveExternalDrawerGeometry,
} from '../esm/shared/dimensions/external_drawer_policy.ts';

test('external drawer fronts use the shared 2mm front seam policy', () => {
  assert.equal(EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM, STACK_SPLIT_POLICY.seam.gapM);
  assert.equal(EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM, 0.002);
});

function assertApprox(actual: number, expected: number, message?: string): void {
  assert.ok(Math.abs(actual - expected) <= 1e-12, message ?? `${actual} ≈ ${expected}`);
}

test('external drawer op producer rejects string-encoded numeric compute inputs', () => {
  const stringWidth = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    moduleIndex: 2,
    startDoorId: 1,
    externalCenterX: 0,
    externalW: '0.8',
    depth: 0.55,
    startY: 0,
    woodThick: 0.018,
    regCount: 1,
  });
  assert.equal(stringWidth.drawers.length, 0);

  const stringCount = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    moduleIndex: 2,
    startDoorId: 1,
    externalCenterX: 0,
    externalW: 0.8,
    depth: 0.55,
    startY: 0,
    woodThick: 0.018,
    regCount: '2',
  });
  assert.equal(stringCount.drawers.length, 0);
});

test('external drawer pipeline does not apply string-encoded face overrides to builder ops', () => {
  const applied: Array<Record<string, unknown>> = [];
  const App = {
    services: {
      builder: {
        renderOps: {
          applyExternalDrawersOps: (input: Record<string, unknown>) => {
            applied.push(input);
          },
        },
      },
    },
  };

  const ok = applyExternalDrawersForModule({
    App: App as never,
    THREE: {} as never,
    cfg: { wardrobeType: 'hinged' },
    config: {},
    moduleIndex: 0,
    startDoorId: 1,
    externalCenterX: 0,
    externalW: 0.8,
    drawerFaceW: '1.2' as never,
    drawerFaceOffsetX: '0.1' as never,
    depth: 0.55,
    frontZ: '0.3' as never,
    startY: 0,
    woodThick: 0.018,
    hasShoe: false,
    regCount: 1,
    bodyMat: 'body',
    createBoard: () => ({ userData: {} }) as never,
    innerW: 0.8,
    internalDepth: 0.5,
    internalCenterX: 0,
    internalZ: 0,
    effectiveBottomY: 0.4,
  });

  assert.equal(ok, true);
  assert.equal(applied.length, 1);
  const ops = applied[0]?.ops as { drawers?: Array<Record<string, unknown>> } | undefined;
  const firstDrawer = ops?.drawers?.[0];
  assert.ok(firstDrawer);
  assert.equal(Object.prototype.hasOwnProperty.call(firstDrawer, 'faceW'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(firstDrawer, 'faceOffsetX'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(firstDrawer, 'frontZ'), false);
});

test('module door span resolver ignores string-encoded pivot-map geometry', () => {
  const resolveSpan = createModuleDoorSpanResolver({
    1: { pivotX: '0.1', doorWidth: '0.5', isLeftHinge: true },
    2: { pivotX: '1.1', doorWidth: '0.4', isLeftHinge: false },
  });

  assert.deepEqual(resolveSpan(1, 2, 9, 8), { spanW: 8, centerX: 9 });
});

test('external drawer core preserves shoe-first ordering, sizing, and regular drawer coordinates', () => {
  const result = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    moduleIndex: 3,
    startDoorId: 7,
    externalCenterX: 0.4,
    externalW: 0.9,
    depth: 0.58,
    frontZ: 0.29,
    startY: 0.12,
    woodThick: 0.02,
    shoeDrawerHeight: 0.19,
    regDrawerHeight: 0.24,
    hasShoe: true,
    regCount: 2,
    keyPrefix: 'module_',
  });

  assertApprox(result.drawerHeightTotal, 0.67);
  assert.equal(result.drawers.length, 3);
  assert.deepEqual(
    result.drawers.map(drawer => drawer.kind),
    ['shoe', 'regular', 'regular']
  );
  const [shoe, firstRegular, secondRegular] = result.drawers;
  assert.equal(shoe?.partId, 'd7_draw_shoe');
  assert.equal(firstRegular?.partId, 'd7_draw_1');
  assert.equal(secondRegular?.partId, 'd7_draw_2');
  assert.equal(shoe?.closed.y, 0.12 + 0.02 + 0.19 / 2);
  assert.equal(firstRegular?.closed.y, 0.12 + 0.02 + 0.19 + 0.24 / 2);
  assert.equal(secondRegular?.closed.y, 0.12 + 0.02 + 0.19 + 0.24 + 0.24 / 2);
  assert.equal(shoe?.visualH, 0.19 - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM);
  assert.equal(shoe?.boxH, 0.19 - EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM);
  assert.equal(shoe?.runnerMountWidth, 0.9);
  assert.equal(firstRegular?.runnerMountWidth, 0.9);
  assert.equal(firstRegular?.visualH, 0.24 - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM);
  assert.equal(firstRegular?.boxH, 0.24 - EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM);

  const sixRegularDrawers = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    externalW: 0.9,
    depth: 0.58,
    regDrawerHeight: EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM,
    regCount: 6,
  });
  assert.equal(sixRegularDrawers.drawers.length, 6);
  assertApprox(sixRegularDrawers.drawerHeightTotal, 6 * EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM);

  assert.deepEqual(
    computeExternalDrawersOpsForModule({
      wardrobeType: 'sliding',
      moduleIndex: 3,
      hasShoe: true,
      regCount: 2,
    }),
    { moduleIndex: 3, drawerHeightTotal: 0, drawers: [] }
  );
});

test('both external drawer plans preserve focused fallback geometry and explicit op precedence', () => {
  const fallback = resolveExternalDrawerGeometry({
    externalWidthM: 0.8,
    depthM: 0.55,
    woodThicknessM: 0.018,
    frontZM: 0.275,
    drawerHeightM: 0.22,
  });
  const sketchContext = {
    outerW: 0.8,
    outerD: 0.55,
    woodThick: 0.018,
    frontZ: 0.275,
    input: {},
    internalCenterX: 0.1,
    visualT: 0.024,
    effectiveBottomY: 0,
    effectiveTopY: 1,
    doorFaceTopY: 1,
    resolvePartMaterial: (partId: string) => `front:${partId}`,
    resolveDrawerBoxMaterial: (partId: string) => `box:${partId}`,
  } as never;
  const sketchStack = {
    drawerH: 0.22,
    centerY: 0.5,
    drawerCount: 1,
    drawerOps: [],
    baseY: 0.39,
    stackH: 0.22,
    keyPrefix: 'sketch_',
  } as never;
  const boxContext = {
    shell: { boxMat: 'shell', geometry: { centerX: 0.1 } },
    outerD: 0.55,
    woodThick: 0.018,
    frontZ: 0.275,
    input: {},
    visualT: 0.024,
    resolvePartMaterial: (partId: string) => `front:${partId}`,
    resolveDrawerBoxMaterial: (partId: string) => `box:${partId}`,
  } as never;
  const boxStack = {
    item: {},
    drawerId: 'box',
    outerW: 0.8,
    drawerH: 0.22,
    centerY: 0.5,
    drawerCount: 1,
    drawerOps: [],
    baseY: 0.39,
    stackH: 0.22,
    containerMinY: 0,
    containerMaxY: 1,
    faceFlushTargetMinY: 0,
    faceFlushTargetMaxY: 1,
    keyPrefix: 'box_',
  } as never;

  const fallbackPlans = [
    createSketchExternalDrawerOpPlan(sketchContext, sketchStack, {}, 0),
    createSketchBoxExternalDrawerOpPlan(boxContext, boxStack, {}, 0),
  ];
  for (const plan of fallbackPlans) {
    assert.ok(plan);
    assert.equal(plan.pz, fallback.zClosed);
    assert.equal(
      plan.visualW,
      Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM, fallback.visualW)
    );
    assert.equal(plan.visualD, 0.024);
    assert.equal(
      plan.boxW,
      Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewBoxMinDimensionM, fallback.boxW)
    );
    assert.equal(
      plan.boxH,
      Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewBoxMinDimensionM, fallback.boxH)
    );
    assert.equal(
      plan.boxD,
      Math.max(DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewBoxMinDimensionM, fallback.boxD)
    );
    assert.equal(plan.boxOffsetZ, fallback.boxOffsetZ);
    assert.equal(plan.connectorW, null);
    assert.equal(plan.connectorH, null);
    assert.equal(plan.connectorD, null);
    assert.equal(plan.connectorZ, fallback.connectZ);
  }

  const explicitOp = {
    closed: { x: 0.31, y: 0.52, z: 0.41 },
    open: { x: 0.31, y: 0.52, z: 1.11 },
    visualW: 0.62,
    faceW: 0.6,
    faceOffsetX: 0.03,
    visualH: 0.2,
    visualT: 0.035,
    boxW: 0.5,
    boxH: 0.18,
    boxD: 0.44,
    boxOffsetZ: -0.21,
    connectW: 0.47,
    connectH: 0.17,
    connectD: 0.08,
    connectZ: 0.14,
  };
  const explicitPlans = [
    createSketchExternalDrawerOpPlan(sketchContext, sketchStack, explicitOp, 0),
    createSketchBoxExternalDrawerOpPlan(boxContext, boxStack, explicitOp, 0),
  ];
  for (const plan of explicitPlans) {
    assert.ok(plan);
    assert.deepEqual(plan.closed, explicitOp.closed);
    assert.deepEqual(plan.open, explicitOp.open);
    assert.equal(plan.px, explicitOp.closed.x);
    assert.equal(plan.py, explicitOp.closed.y);
    assert.equal(plan.pz, explicitOp.closed.z);
    assert.equal(plan.visualW, explicitOp.visualW);
    assert.equal(plan.faceW, explicitOp.faceW);
    assert.equal(plan.faceOffsetX, explicitOp.faceOffsetX);
    assertApprox(plan.visualH, explicitOp.visualH);
    assert.equal(plan.visualD, explicitOp.visualT);
    assert.equal(plan.boxW, explicitOp.boxW);
    assert.equal(plan.boxH, explicitOp.boxH);
    assert.equal(plan.boxD, explicitOp.boxD);
    assert.equal(plan.boxOffsetZ, explicitOp.boxOffsetZ);
    assert.equal(plan.connectorW, explicitOp.connectW);
    assert.equal(plan.connectorH, explicitOp.connectH);
    assert.equal(plan.connectorD, explicitOp.connectD);
    assert.equal(plan.connectorZ, explicitOp.connectZ);
  }
});

test('module sketch drawer above standard external drawers preserves the same front reveal as regular drawers', () => {
  const drawerH = 0.22;
  const boundaryY = 0.5;
  const gap = EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM;
  const context = {
    outerW: 0.8,
    outerD: 0.55,
    woodThick: 0.018,
    frontZ: 0.275,
    input: { startY: 0.042, cfgSnapshot: { extDrawersCount: 2 } },
    internalCenterX: 0,
    visualT: 0.02,
    effectiveBottomY: boundaryY,
    effectiveTopY: 1.5,
    doorFaceTopY: 1.5,
    resolvePartMaterial: () => null,
    resolveDrawerBoxMaterial: () => null,
  } as never;
  const stack = {
    drawerH,
    centerY: boundaryY + drawerH / 2,
    drawerCount: 1,
    drawerOps: [{}],
    baseY: boundaryY,
    stackH: drawerH,
    keyPrefix: 'sketch_',
  } as never;

  const plan = createSketchExternalDrawerOpPlan(context, stack, {}, 0);
  assert.ok(plan);
  assertApprox(plan.visualH, drawerH - gap);
  assertApprox(plan.faceMinY, boundaryY + gap / 2);

  const standardTopFaceMaxY = boundaryY - gap / 2;
  assertApprox(plan.faceMinY - standardTopFaceMaxY, gap);
});
