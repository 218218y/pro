import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CORNER_CONNECTOR_ATTACH_ROD_POLICY,
  CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY,
  CORNER_CONNECTOR_INTERIOR_POLICY,
  CORNER_CONNECTOR_SPECIAL_POST_POLICY,
} from '../esm/shared/dimensions/corner_connector_interior_policy.ts';
import { CM_PER_METER, MM_PER_METER } from '../esm/shared/dimensions/units.ts';
import { CORNER_CONNECTOR_INTERIOR_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import { applyCornerConnectorAttachRod } from '../esm/native/builder/corner_connector_interior_rod.ts';
import {
  createLeftShelvesContentsPlan,
  createPentagonTopContentsPlan,
} from '../esm/native/builder/corner_connector_interior_special_contents.ts';
import {
  createEqualShelfBottomYs,
  resolveCornerConnectorSpecialMetrics,
} from '../esm/native/builder/corner_connector_interior_special_metrics.ts';
import { canonicalizeComparableProjectConfigSnapshot } from '../esm/native/features/project_config/api.ts';
import { readPersistedProjectConfigSnapshot } from '../esm/native/io/project_config_persisted_snapshot.ts';

const EXPECTED_CORNER_CONNECTOR_INTERIOR_LEAVES = Object.freeze({
  specialPost: {
    depthDefaultCm: 55,
    heightDefaultCm: 180,
    topCellHeightDefaultCm: 30,
    depthMinM: 0.05,
    postInsetClearanceM: 0.02,
    panelGapEpsilonM: 0.0006,
    minAvailableHeightM: 0.35,
    postHeightMinM: 0.2,
    postOffsetNormMin: 0.05,
    postOffsetNormMax: 0.95,
    postClampEdgeInsetM: 0.03,
    shelfSpanMinM: 0.35,
    shelfNetMinM: 0.12,
    shelfTopClearanceM: 0.002,
    panelMinLengthM: 0.01,
    shelfPlanMinDimensionM: 0.05,
    shelfCeilingClearanceM: 0.005,
    shelfFitToleranceM: 0.002,
  },
  attachRod: {
    heightDefaultCm: 150,
    endInsetDefaultCm: 2,
    radiusDefaultMm: 15,
    verticalClearanceM: 0.05,
    minRodLengthM: 0.08,
    contentsWidthClearanceM: 0.06,
    contentsWidthMinM: 0.08,
    contentsBottomClearanceM: 0.02,
    contentsHeightMinM: 0.55,
    contentsDepthHintM: 0.32,
    wallBackClearanceM: 0.08,
  },
  foldedContents: {
    leftWidthMinM: 0.28,
    leftDepthMinM: 0.18,
    surfaceHeightClearanceM: 0.02,
    surfaceMinHeightM: 0.08,
    surfaceYOffsetM: 0.002,
    widthMinM: 0.2,
    widthClearanceM: 0.06,
    maxHeightMinM: 0.12,
    maxHeightMaxM: 0.65,
    pentagonSafeZMinM: 0.14,
    pentagonSafeZRatio: 0.35,
    pentagonSafeZEndClearanceM: 0.18,
    pentagonSafeWidthMinM: 0.35,
    pentagonSafeWidthRatio: 0.85,
    pentagonSafeWidthMaxM: 0.9,
    pentagonSafeDepthMinM: 0.22,
    pentagonSafeDepthMaxM: 0.34,
    pentagonSafeDepthEndClearanceM: 0.12,
  },
});

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${String(actual)} to be within ${String(epsilon)} of ${String(expected)}`
  );
}

test('Corner Connector Interior preserves every pre-migration leaf and compatibility identity', () => {
  assert.deepEqual(CORNER_CONNECTOR_INTERIOR_POLICY, EXPECTED_CORNER_CONNECTOR_INTERIOR_LEAVES);
  assert.equal(CORNER_CONNECTOR_INTERIOR_DIMENSIONS, CORNER_CONNECTOR_INTERIOR_POLICY);
  assert.equal(CORNER_CONNECTOR_INTERIOR_POLICY.specialPost, CORNER_CONNECTOR_SPECIAL_POST_POLICY);
  assert.equal(CORNER_CONNECTOR_INTERIOR_POLICY.attachRod, CORNER_CONNECTOR_ATTACH_ROD_POLICY);
  assert.equal(CORNER_CONNECTOR_INTERIOR_POLICY.foldedContents, CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY);

  for (const policy of [
    CORNER_CONNECTOR_SPECIAL_POST_POLICY,
    CORNER_CONNECTOR_ATTACH_ROD_POLICY,
    CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY,
    CORNER_CONNECTOR_INTERIOR_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Special Post defaults convert from centimeters and preserve clamping and shelf-fit calculations', () => {
  const metrics = resolveCornerConnectorSpecialMetrics({
    uiAny: {},
    mx: x => x,
    L: 1,
    Dmain: 0.6,
    woodThick: 0.018,
    shelfThick: 0.018,
    startY: 0,
    wingH: 2.4,
    panelThick: 0.018,
    backPanelThick: 0.005,
    backPanelOutsideInsetZ: 0.002,
  });

  assert.ok(metrics);
  assert.equal(CORNER_CONNECTOR_SPECIAL_POST_POLICY.depthDefaultCm / CM_PER_METER, 0.55);
  assert.equal(CORNER_CONNECTOR_SPECIAL_POST_POLICY.heightDefaultCm / CM_PER_METER, 1.8);
  assert.equal(CORNER_CONNECTOR_SPECIAL_POST_POLICY.topCellHeightDefaultCm / CM_PER_METER, 0.3);
  assertClose(metrics.depth, 0.55);
  assertClose(metrics.backInset, 0.0076);
  assertClose(metrics.sideInset, 0.0186);
  assertClose(metrics.floorTopY, 0.018);
  assertClose(metrics.ceilBottomY, 2.382);
  assertClose(metrics.availH, 2.364);
  assertClose(metrics.postHClamped, 1.728);
  assertClose(metrics.needH, 2.364);
  assertClose(metrics.shelf1BottomY, 1.746);
  assertClose(metrics.shelf2BottomY, 2.064);
  assertClose(metrics.wallX, -1);
  assertClose(metrics.postX, -0.5);

  const clamped = resolveCornerConnectorSpecialMetrics({
    uiAny: {
      cornerPentSpecialPostDepthCm: 1,
      cornerPentSpecialPostHeightCm: 999,
      cornerPentSpecialTopCellHeightCm: 30,
      cornerPentSpecialPostOffsetFromWallCm: 999,
    },
    mx: x => x,
    L: 1,
    Dmain: 0.01,
    woodThick: 0.018,
    shelfThick: 0.018,
    startY: 0,
    wingH: 2.4,
    panelThick: 0.018,
    backPanelThick: 0.005,
    backPanelOutsideInsetZ: 0.002,
  });
  assert.ok(clamped);
  assert.equal(clamped.depth, CORNER_CONNECTOR_SPECIAL_POST_POLICY.depthMinM);
  assertClose(clamped.postX, -0.05);
  assert.ok(clamped.postHClamped <= clamped.availH);

  assert.equal(
    resolveCornerConnectorSpecialMetrics({
      uiAny: {},
      mx: x => x,
      L: 1,
      Dmain: 0.6,
      woodThick: 0.018,
      shelfThick: 0.018,
      startY: 0,
      wingH: 0.3,
      panelThick: 0.018,
      backPanelThick: 0.005,
      backPanelOutsideInsetZ: 0.002,
    }),
    null
  );

  assert.deepEqual(
    createEqualShelfBottomYs({
      enabled: true,
      floorTopY: 0.018,
      targetTop: 1.8,
      shelfThick: 0.018,
    }),
    [0.45, 0.9, 1.35]
  );
  assert.deepEqual(
    createEqualShelfBottomYs({
      enabled: true,
      floorTopY: 0,
      targetTop: CORNER_CONNECTOR_SPECIAL_POST_POLICY.shelfSpanMinM - 0.001,
      shelfThick: 0.018,
    }),
    []
  );
});

test('Attach Rod preserves radius, placement, wall clearance, and dependent clothes geometry', () => {
  const cylinderCalls: number[][] = [];
  const hangerCalls: unknown[][] = [];
  const clothesCalls: unknown[][] = [];

  class Position {
    values: [number, number, number] = [0, 0, 0];

    set(x: number, y: number, z: number): void {
      this.values = [x, y, z];
    }
  }

  class Group {
    position = new Position();
    rotation = { y: 0 };
    userData: Record<string, unknown> = {};
    children: unknown[] = [];

    add(child: unknown): void {
      this.children.push(child);
    }
  }

  class Mesh {
    rotation = { z: 0, y: 0 };
    position = new Position();
    userData: Record<string, unknown> = {};

    constructor(
      readonly geometry: unknown,
      readonly material: unknown
    ) {}
  }

  class CylinderGeometry {
    constructor(...args: number[]) {
      cylinderCalls.push(args);
    }
  }

  const cornerGroup = new Group();

  applyCornerConnectorAttachRod({
    ctx: {
      App: {},
      THREE: { Mesh, CylinderGeometry, Group },
      woodThick: 0.018,
      startY: 0,
      wingH: 2.4,
      uiAny: {
        cornerPentAttachRodEnabled: true,
        cornerPentAttachRodSide: 'wing',
      },
      doorStyle: 'flat',
      __sketchMode: false,
      showHangerEnabled: true,
      showContentsEnabled: true,
      addOutlines() {},
      getMaterial() {
        return { kind: 'metal' };
      },
    },
    locals: {
      pts: [
        { x: 0, z: 0 },
        { x: -1, z: 1 },
        { x: 0, z: 1 },
        { x: 0, z: 0.6 },
        { x: -1, z: 0.6 },
      ],
      mx: (x: number) => x,
      L: 1,
      Dmain: 0.6,
      panelThick: 0.018,
      backPanelThick: 0.005,
      cornerGroup,
    },
    helpers: {
      reportErrorThrottled() {},
    },
    emitters: {
      emitRealisticHanger(...args: unknown[]) {
        hangerCalls.push(args);
      },
      emitHangingClothes(...args: unknown[]) {
        clothesCalls.push(args);
      },
    },
  } as never);

  assert.equal(CORNER_CONNECTOR_ATTACH_ROD_POLICY.heightDefaultCm / CM_PER_METER, 1.5);
  assert.equal(CORNER_CONNECTOR_ATTACH_ROD_POLICY.endInsetDefaultCm / CM_PER_METER, 0.02);
  assert.equal(CORNER_CONNECTOR_ATTACH_ROD_POLICY.radiusDefaultMm / MM_PER_METER, 0.015);
  assert.equal(cylinderCalls.length, 1);
  assertClose(cylinderCalls[0][0], 0.015);
  assertClose(cylinderCalls[0][1], 0.015);
  assertClose(cylinderCalls[0][2], 0.946);
  assert.equal(cylinderCalls[0][3], 16);

  const rod = cornerGroup.children[0] as Mesh;
  assert.deepEqual(
    rod.position.values.map(value => Number(value.toFixed(6))),
    [-0.5, 1.5, 0.498]
  );
  assert.equal(rod.userData.partId, 'corner_pent_attach_rod_wing');

  assert.equal(hangerCalls.length, 1);
  assertClose(hangerCalls[0][4] as number, 0.946);

  assert.equal(clothesCalls.length, 1);
  assertClose(clothesCalls[0][3] as number, 0.886);
  assertClose(clothesCalls[0][5] as number, 1.462);
  assert.equal(clothesCalls[0][6], CORNER_CONNECTOR_ATTACH_ROD_POLICY.contentsDepthHintM);
});

test('Folded Contents preserves left-surface and pentagon-safe geometry', () => {
  const leftPlans = createLeftShelvesContentsPlan({
    postX: -0.2,
    wallX: -1,
    depth: 0.6,
    backInset: 0.1,
    floorTopY: 0.018,
    shelf1BottomY: 1,
    woodThick: 0.018,
    leftShelfBottomYs: [0.5],
  });

  assert.equal(leftPlans.length, 2);
  assert.deepEqual(
    leftPlans.map(plan => plan.op),
    ['special:leftSurface:floor', 'special:leftSurface:shelf:1']
  );
  for (const [plan, expectedY] of [
    [leftPlans[0], 0.02],
    [leftPlans[1], 0.52],
  ] as const) {
    assertClose(plan.x, -0.6);
    assertClose(plan.y, expectedY);
    assertClose(plan.z, 0.35);
    assertClose(plan.width, 0.74);
    assertClose(plan.maxHeight, 0.462);
    assertClose(plan.maxDepth, 0.5);
  }

  const pentagonPlans = createPentagonTopContentsPlan({
    mx: x => x,
    L: 1,
    shelf1Added: true,
    shelf1BottomY: 0.8,
    shelf2Added: true,
    shelf2BottomY: 1.4,
    woodThick: 0.018,
    ceilBottomY: 2.2,
  });

  assert.equal(pentagonPlans.length, 2);
  assert.deepEqual(
    pentagonPlans.map(plan => plan.op),
    ['special:topContents:lower', 'special:topContents:upper']
  );
  for (const [plan, expectedY, expectedMaxHeight] of [
    [pentagonPlans[0], 0.82, 0.56],
    [pentagonPlans[1], 1.42, 0.65],
  ] as const) {
    assertClose(plan.x, -0.5);
    assertClose(plan.y, expectedY);
    assertClose(plan.z, 0.35);
    assertClose(plan.width, 0.85);
    assertClose(plan.maxHeight, expectedMaxHeight);
    assertClose(plan.maxDepth, 0.34);
  }
});

test('Corner Connector Interior configuration survives canonical persistence roundtrip', () => {
  const cornerConfiguration = {
    layout: 'shelves',
    cornerPentSpecialInternal: true,
    cornerPentSpecialPostDepthCm: 62,
    cornerPentSpecialPostHeightCm: 191,
    cornerPentSpecialTopCellHeightCm: 31,
    cornerPentSpecialPostOffsetFromWallCm: 44,
    cornerPentAttachRodEnabled: true,
    cornerPentAttachRodSide: 'main',
    cornerPentAttachRodHeightCm: 149,
    cornerPentAttachRodEndInsetCm: 3,
    cornerPentAttachRodRadiusMm: 14,
  };

  const first = readPersistedProjectConfigSnapshot(
    canonicalizeComparableProjectConfigSnapshot({
      settings: {
        wardrobeType: 'hinged',
        width: 160,
        height: 240,
        depth: 55,
        doors: 4,
        structureSelection: '[1,1,1,1]',
        singleDoorPos: 'left',
      },
      cornerConfiguration,
    } as never)
  );

  const second = readPersistedProjectConfigSnapshot(
    canonicalizeComparableProjectConfigSnapshot({
      settings: {
        wardrobeType: 'hinged',
        width: 160,
        height: 240,
        depth: 55,
        doors: 4,
        structureSelection: '[1,1,1,1]',
        singleDoorPos: 'left',
      },
      ...first,
    } as never)
  );

  for (const [key, value] of Object.entries(cornerConfiguration)) {
    assert.equal((first.cornerConfiguration as Record<string, unknown>)[key], value);
    assert.equal((second.cornerConfiguration as Record<string, unknown>)[key], value);
  }
});
