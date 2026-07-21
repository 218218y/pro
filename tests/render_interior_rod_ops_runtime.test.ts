import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderInteriorRodOps } from '../esm/native/builder/render_interior_rod_ops.ts';
import { CARCASS_INTERIOR_GRID_POLICY } from '../esm/shared/dimensions/carcass_interior_grid_policy.ts';
import {
  FOLDED_CLOTHES_VISUAL_POLICY,
  HANGER_VISUAL_POLICY,
} from '../esm/shared/dimensions/content_visual_policy.ts';
import { DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY } from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import {
  INTERIOR_PRESET_ROD_FACTORS_POLICY,
  INTERIOR_PRESET_SHELF_ROWS_POLICY,
  INTERIOR_ROD_PLACEMENT_POLICY,
  INTERIOR_ROD_RENDER_POLICY,
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
} from '../esm/shared/dimensions/interior_fittings_policy.ts';
import { INTERIOR_STORAGE_BARRIER_POLICY } from '../esm/shared/dimensions/interior_storage_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY } from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  resolveSketchExternalDrawerMetrics,
  resolveSketchInternalDrawerMetrics,
} from '../esm/native/features/sketch_drawer_sizing.ts';
import {
  canSingleHangerFitBelowRod,
  resolveInteriorRodAvailableHeight,
  resolveSingleHangerRequiredClearance,
} from '../esm/native/builder/render_interior_rod_clearance.ts';

function assertClose(actual: number, expected: number, message?: string): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9, message ?? `${actual} must equal ${expected}`);
}

function makeFakeThree() {
  class CylinderGeometry {
    args: unknown[];

    constructor(...args: unknown[]) {
      this.args = args;
    }
  }

  class MeshStandardMaterial {
    params: Record<string, unknown>;

    constructor(params: Record<string, unknown>) {
      this.params = params;
    }
  }

  class Mesh {
    geometry: unknown;
    material: unknown;
    rotation = { x: 0, y: 0, z: 0 };
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      },
    };

    constructor(geometry: unknown, material: unknown) {
      this.geometry = geometry;
      this.material = material;
    }
  }

  return { CylinderGeometry, MeshStandardMaterial, Mesh } as any;
}

function createRodOpsHarness() {
  const App = {} as any;
  const cache: Record<string, unknown> = {};
  const added: any[] = [];
  const group = {
    add: (obj: unknown) => {
      added.push(obj);
    },
  } as any;
  const ops = createBuilderRenderInteriorRodOps({
    app: () => App,
    ops: () => ({}),
    wardrobeGroup: () => group,
    three: value => value,
    matCache: () => cache,
    renderOpsHandleCatch: () => {},
    assertTHREE: () => ({}),
  });

  return { ops, App, cache, added, group };
}

test('render interior rod keeps rod material independent from base leg material', () => {
  const THREE = makeFakeThree();
  const { ops, cache, added, group } = createRodOpsHarness();
  const legMat = { id: 'base-leg-material' };

  const created = ops.createRodWithContents({
    THREE,
    yPos: 1.4,
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    legMat,
  });

  assert.equal(created, true);
  assert.equal(added.length, 1);
  assert.notEqual(added[0].material, legMat);
  assert.equal(added[0].material, cache.interiorRodMat);
  assert.equal((added[0].geometry as { args: unknown[] }).args[3], INTERIOR_ROD_RENDER_POLICY.radialSegments);
  assert.deepEqual((added[0].material as any).params, {
    color: 0x888888,
    metalness: 0.8,
    roughness: 0.2,
  });
});

test('render interior rod reuses the same neutral rod material when leg color changes', () => {
  const THREE = makeFakeThree();
  const { ops, cache, added, group } = createRodOpsHarness();

  ops.createRodWithContents({
    THREE,
    yPos: 1.4,
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    legMat: { color: 'first-leg-color' },
  });

  const firstRodMat = added[0].material;

  ops.createRodWithContents({
    THREE,
    yPos: 1.5,
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    legMat: { color: 'second-leg-color' },
  });

  assert.equal(added.length, 2);
  assert.equal(added[1].material, firstRodMat);
  assert.equal(added[1].material, cache.interiorRodMat);
});

test('render interior rod sends hanging clothes through default hanging_top2 clearance', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 1.52,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    config: { layout: 'hanging_top2', isCustom: false },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    sketchMode: true,
    addOutlines: () => undefined,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  assert.equal(Number(clothesCalls[0][5].toFixed(2)), 1.52);
  assert.equal(clothesCalls[0][7].sketchMode, true);
  assert.equal(typeof clothesCalls[0][7].addOutlines, 'function');
});

test('render interior rod recomputes edited custom hanging clearance instead of stale preset limits', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 0.92,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    manualHeightLimit: 0.52,
    config: {
      isCustom: true,
      gridDivisions: 6,
      customData: {
        shelves: [false, false, false, false, true],
        rods: [false, true, false, false, true, false],
        rodOps: [
          {
            gridIndex: 2,
            yFactor: 2.3,
            enableHangingClothes: true,
            enableSingleHanger: true,
            limitFactor: 1.3,
            limitAdd: 0,
          },
          {
            gridIndex: 5,
            yFactor: 4.8,
            enableHangingClothes: true,
            enableSingleHanger: true,
            limitFactor: 2.5,
            limitAdd: 0,
          },
        ],
        storage: false,
      },
    },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  assert.equal(Number(clothesCalls[0][5].toFixed(2)), 0.92);
});

test('render interior rod shortens hanging clothes above sketch drawer stacks', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 0.9,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    woodThick: 0.02,
    config: {
      sketchExtras: {
        drawers: [{ id: 'int-bottom', yNorm: 0 }],
        extDrawers: [{ id: 'ext-bottom', yNorm: 0, count: 2 }],
      },
    },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  // The external sketch drawer stack is taller than the internal two-drawer stack here,
  // so it is the nearest real blocker below the rod: 0.9m rod - 0.44m stack top.
  assert.equal(Number(clothesCalls[0][5].toFixed(3)), 0.46);
});

test('render interior rod skips single hanger when external drawer clearance below the rod is too short', () => {
  const THREE = makeFakeThree();
  const { ops, added, group } = createRodOpsHarness();
  const hangerCalls: any[] = [];
  const innerW = 0.8;
  const yPos = 1.0;
  const requiredClearance = resolveSingleHangerRequiredClearance(innerW);

  assert.ok(requiredClearance > 0.22, 'test should exercise the real single-hanger height');

  const created = ops.createRodWithContents({
    THREE,
    yPos,
    effectiveBottomY: yPos - requiredClearance + 0.015,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    config: {},
    innerW,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showHangerEnabled: true,
    addRealisticHanger(...args: any[]) {
      hangerCalls.push(args);
    },
  });

  assert.equal(created, true);
  assert.equal(added.length, 1, 'the rod itself must still render');
  assert.equal(hangerCalls.length, 0, 'the single hanger should be suppressed when it hits drawers below');
});

test('render interior rod keeps single hanger when the nearest blocker leaves enough clearance', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const hangerCalls: any[] = [];
  const innerW = 0.8;
  const yPos = 1.0;
  const requiredClearance = resolveSingleHangerRequiredClearance(innerW);

  const created = ops.createRodWithContents({
    THREE,
    yPos,
    effectiveBottomY: yPos - requiredClearance - 0.02,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    config: {},
    innerW,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showHangerEnabled: true,
    addRealisticHanger(...args: any[]) {
      hangerCalls.push(args);
    },
  });

  assert.equal(created, true);
  assert.equal(hangerCalls.length, 1);
});

test('render interior rod keeps single hanger when a shelf top stays below the hanger bottom', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const hangerCalls: any[] = [];
  const innerW = 0.8;
  const yPos = 1.0;

  const created = ops.createRodWithContents({
    THREE,
    yPos,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.25,
    shelfThick: 0.02,
    config: {
      isCustom: true,
      customData: {
        shelves: [false, false, true],
        rods: [],
        rodOps: [],
        storage: false,
      },
    },
    innerW,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showHangerEnabled: true,
    addRealisticHanger(...args: any[]) {
      hangerCalls.push(args);
    },
  });

  assert.equal(created, true);
  assert.equal(hangerCalls.length, 1, 'folded shelf contents must not suppress a non-colliding hanger');
});

test('render interior rod skips single hanger when the physical shelf slab intersects it', () => {
  const THREE = makeFakeThree();
  const { ops, added, group } = createRodOpsHarness();
  const hangerCalls: any[] = [];
  const innerW = 0.8;
  const yPos = 1.0;

  const created = ops.createRodWithContents({
    THREE,
    yPos,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.29,
    shelfThick: 0.02,
    config: {
      isCustom: true,
      customData: {
        shelves: [false, false, true],
        rods: [],
        rodOps: [],
        storage: false,
      },
    },
    innerW,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showHangerEnabled: true,
    addRealisticHanger(...args: any[]) {
      hangerCalls.push(args);
    },
  });

  assert.equal(created, true);
  assert.equal(added.length, 1, 'the rod itself must still render when only the hanger collides');
  assert.equal(hangerCalls.length, 0, 'the hanger must be removed when the shelf slab reaches into it');
});

test('render interior rod skips single hanger when sketch drawers are the nearest blocker below', () => {
  const THREE = makeFakeThree();
  const { ops, added, group } = createRodOpsHarness();
  const hangerCalls: any[] = [];

  const created = ops.createRodWithContents({
    THREE,
    yPos: 0.6,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    woodThick: 0.02,
    config: {
      sketchExtras: {
        extDrawers: [{ id: 'ext-bottom', yNorm: 0, count: 2 }],
      },
    },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showHangerEnabled: true,
    addRealisticHanger(...args: any[]) {
      hangerCalls.push(args);
    },
  });

  assert.equal(created, true);
  assert.equal(added.length, 1, 'the rod should still render without the hanger');
  assert.equal(hangerCalls.length, 0);
});

test('render interior rod reserves folded clothes above shelf blockers', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 1.2,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    woodThick: 0.02,
    config: {
      isCustom: true,
      customData: {
        shelves: [true],
        rods: [],
        rodOps: [],
        storage: false,
      },
    },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  // Shelf center 0.4 + 0.01m half board + max folded stack (7 * 0.025m) + 0.006m contents gap.
  assert.equal(Number(clothesCalls[0][5].toFixed(3)), 0.609);
});

test('render interior rod rejects string-encoded runtime coordinates', () => {
  const THREE = makeFakeThree();
  const { ops, added, group } = createRodOpsHarness();

  const created = ops.createRodWithContents({
    THREE,
    yPos: '1.4',
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
  });

  assert.equal(created, false);
  assert.equal(added.length, 0);
});

test('rod clearance ignores string-encoded custom rod runtime positions', () => {
  const availableHeight = resolveInteriorRodAvailableHeight({
    config: {
      isCustom: true,
      customData: {
        shelves: [],
        rods: [],
        rodOps: [{ gridIndex: '2', yFactor: '2', yAdd: '0' }],
        storage: false,
      },
    },
    yPos: 1.2,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    localGridStep: 0.4,
    gridDivisions: 6,
  });

  assert.equal(Number(availableHeight.toFixed(3)), 1.2);
});

test('rod clearance preserves focused hanger scaling and fit tolerance boundaries', () => {
  const shoulderHeightM: number = HANGER_VISUAL_POLICY.shoulderHeightM;
  const fullRequired =
    HANGER_VISUAL_POLICY.rodYOffsetM +
    Math.abs(
      Math.min(
        -shoulderHeightM - HANGER_VISUAL_POLICY.shoulderDropM,
        -shoulderHeightM - HANGER_VISUAL_POLICY.barYOffsetM - HANGER_VISUAL_POLICY.barRadiusM,
        0
      )
    );
  const totalWidth = HANGER_VISUAL_POLICY.halfWidthM * 2;

  assertClose(resolveSingleHangerRequiredClearance(undefined), fullRequired);
  assertClose(
    resolveSingleHangerRequiredClearance(HANGER_VISUAL_POLICY.moduleWidthClearanceM),
    HANGER_VISUAL_POLICY.rodYOffsetM
  );
  assertClose(
    resolveSingleHangerRequiredClearance(HANGER_VISUAL_POLICY.moduleWidthClearanceM + totalWidth / 2),
    HANGER_VISUAL_POLICY.rodYOffsetM + (fullRequired - HANGER_VISUAL_POLICY.rodYOffsetM) / 2
  );
  assertClose(
    resolveSingleHangerRequiredClearance(HANGER_VISUAL_POLICY.moduleWidthClearanceM + totalWidth),
    fullRequired
  );

  const tolerance = Math.max(1e-5, fullRequired * 1e-4);
  assert.equal(
    canSingleHangerFitBelowRod({ availableHeight: fullRequired - tolerance, moduleWidth: undefined }),
    true
  );
  assert.equal(
    canSingleHangerFitBelowRod({
      availableHeight: fullRequired - tolerance - 1e-6,
      moduleWidth: undefined,
    }),
    false
  );
  for (const invalid of ['1', NaN, Infinity, -Infinity]) {
    assert.equal(canSingleHangerFitBelowRod({ availableHeight: invalid, moduleWidth: 0.8 }), false);
  }
});

test('rod clearance preserves folded-clothes content and physical-surface shelf blockers', () => {
  const foldedHeight =
    FOLDED_CLOTHES_VISUAL_POLICY.itemHeightM *
      (FOLDED_CLOTHES_VISUAL_POLICY.stackBaseItems +
        Math.max(0, FOLDED_CLOTHES_VISUAL_POLICY.randomItemsRange - 1)) +
    INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM;
  const shelfY = 0.4;
  const shelfThick = 0.02;
  const shelfTop = shelfY + shelfThick / 2;
  const common = {
    config: {
      isCustom: true,
      customData: { shelves: [true], rods: [], rodOps: [], storage: false },
    },
    yPos: 1.2,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    localGridStep: 0.4,
    gridDivisions: 6,
    shelfThick,
  };

  assertClose(
    resolveInteriorRodAvailableHeight({ ...common, shelfBlockerMode: 'contents' }),
    common.yPos - (shelfTop + foldedHeight)
  );
  assertClose(
    resolveInteriorRodAvailableHeight({ ...common, shelfBlockerMode: 'surface' }),
    common.yPos - shelfTop
  );
});

test('rod clearance preserves explicit, configured, rounded, and fallback grid divisions', () => {
  const pad = SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMinM;
  const resolveWith = (gridDivisions: unknown, configGridDivisions: unknown): number =>
    resolveInteriorRodAvailableHeight({
      config: {
        gridDivisions: configGridDivisions,
        sketchExtras: { rods: [{ yNorm: 1 }] },
      },
      yPos: 3,
      effectiveBottomY: 0,
      localGridStep: 0.4,
      gridDivisions,
    });

  assertClose(resolveWith(5, 3), 3 - (5 * 0.4 - pad));
  assertClose(resolveWith(4.6, 3), 3 - (5 * 0.4 - pad));
  assertClose(resolveWith(undefined, 4.6), 3 - (5 * 0.4 - pad));
  assertClose(resolveWith('5', -1), 3 - (CARCASS_INTERIOR_GRID_POLICY.divisions * 0.4 - pad));
});

test('rod clearance preserves all preset shelf rows and rod factors', () => {
  const shelfTop = (row: number): number => row * 0.4 + MATERIAL_THICKNESS_POLICY.wood.thicknessM / 2;
  const cases = [
    {
      layout: 'shelves',
      yPos: 2.2,
      blocker: shelfTop(INTERIOR_PRESET_SHELF_ROWS_POLICY.fullShelfRows.at(-1) ?? 0),
    },
    {
      layout: 'mixed',
      yPos: 1.5,
      blocker: INTERIOR_PRESET_ROD_FACTORS_POLICY.mixedRodYFactor * 0.4,
    },
    {
      layout: 'hanging',
      yPos: 1.6,
      blocker: INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor * 0.4,
    },
    {
      layout: 'hanging_top2',
      yPos: 1.6,
      blocker: INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor * 0.4,
    },
    {
      layout: 'hanging_split',
      yPos: 1,
      blocker: INTERIOR_PRESET_ROD_FACTORS_POLICY.splitLowerRodYFactor * 0.4,
    },
    {
      layout: 'storage',
      yPos: 1.6,
      blocker: INTERIOR_PRESET_ROD_FACTORS_POLICY.storageRodYFactor * 0.4,
    },
    {
      layout: 'storage_shelf',
      yPos: 1.6,
      blocker: INTERIOR_PRESET_ROD_FACTORS_POLICY.storageRodYFactor * 0.4,
    },
  ];

  for (const item of cases) {
    assertClose(
      resolveInteriorRodAvailableHeight({
        config: { layout: item.layout, isCustom: false },
        yPos: item.yPos,
        effectiveBottomY: 0,
        effectiveTopY: 3,
        localGridStep: 0.4,
        gridDivisions: 6,
        shelfBlockerMode: 'surface',
      }),
      item.yPos - item.blocker,
      item.layout
    );
  }
});

test('rod clearance preserves custom rods, rodOps precedence, shelves, and storage', () => {
  const base = {
    yPos: 1.2,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    localGridStep: 0.4,
    gridDivisions: 6,
    shelfBlockerMode: 'surface' as const,
  };
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: {
        isCustom: true,
        customData: { shelves: [true], rods: [], rodOps: [], storage: false },
      },
    }),
    base.yPos - (0.4 + MATERIAL_THICKNESS_POLICY.wood.thicknessM / 2)
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: {
        isCustom: true,
        customData: { shelves: [], rods: [false, true], rodOps: [], storage: false },
      },
    }),
    base.yPos - (0.8 + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM)
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: {
        isCustom: true,
        customData: {
          shelves: [],
          rods: [false, true],
          rodOps: [{ gridIndex: 2, yFactor: 2, yAdd: 0.1 }],
          storage: false,
        },
      },
    }),
    base.yPos - 0.9
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: {
        isCustom: true,
        customData: { shelves: [], rods: [], rodOps: [], storage: true },
      },
    }),
    base.yPos - INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM
  );
});

test('rod clearance preserves explicit thickness and focused material fallbacks', () => {
  const resolveShelf = (woodThick: unknown, shelfThick: unknown): number =>
    resolveInteriorRodAvailableHeight({
      config: {
        isCustom: true,
        customData: { shelves: [true], rods: [], rodOps: [], storage: false },
      },
      yPos: 1,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.4,
      gridDivisions: 6,
      woodThick,
      shelfThick,
      shelfBlockerMode: 'surface',
    });

  assertClose(resolveShelf(0.04, undefined), 1 - (0.4 + 0.04 / 2));
  assertClose(resolveShelf(undefined, 0.1), 1 - (0.4 + 0.1 / 2));
  for (const invalid of [undefined, 0, -1, NaN, Infinity]) {
    assertClose(resolveShelf(invalid, invalid), 1 - (0.4 + MATERIAL_THICKNESS_POLICY.wood.thicknessM / 2));
  }
});

test('rod clearance preserves internal drawer pad min, ratio, max, fit, and invalid-position paths', () => {
  const metrics = resolveSketchInternalDrawerMetrics({
    drawerHeightM: DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  });
  const resolveDrawer = (
    woodThick: number,
    effectiveTopY = 2,
    item: Record<string, unknown> = { yNorm: 0 }
  ): number =>
    resolveInteriorRodAvailableHeight({
      config: { sketchExtras: { drawers: [item] } },
      yPos: 1,
      effectiveBottomY: 0,
      effectiveTopY,
      localGridStep: 0.4,
      gridDivisions: 6,
      manualHeightLimit: 0.25,
      woodThick,
    });
  const expectedWithPad = (woodThick: number): number => {
    const pad = Math.min(
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMaxM,
      Math.max(
        DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMinM,
        woodThick * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadWoodRatio
      )
    );
    return 1 - (pad + metrics.stackH);
  };

  assertClose(resolveDrawer(0.001), expectedWithPad(0.001));
  assertClose(resolveDrawer(0.02), expectedWithPad(0.02));
  assertClose(resolveDrawer(0.1), expectedWithPad(0.1));
  const ratioPad = 0.02 * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadWoodRatio;
  assert.equal(
    ratioPad > DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMinM &&
      ratioPad < DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMaxM,
    true
  );
  assertClose(resolveDrawer(0.02, metrics.stackH + ratioPad * 2 - 1e-6), 0.25);
  assertClose(resolveDrawer(0.02, 2, { yNorm: '0' }), 0.25);
});

test('rod clearance preserves external drawers and sketch shelf, rod, and storage extras', () => {
  const externalMetrics = resolveSketchExternalDrawerMetrics({
    drawerCount: 2,
    drawerHeightM: DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  });
  assertClose(
    resolveInteriorRodAvailableHeight({
      config: { sketchExtras: { extDrawers: [{ yNorm: 0, count: 2 }] } },
      yPos: 1,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.4,
      gridDivisions: 6,
    }),
    1 - externalMetrics.stackH
  );

  const pad = SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMinM;
  const shelfThick = 0.02;
  assertClose(
    resolveInteriorRodAvailableHeight({
      config: { sketchExtras: { shelves: [{ yNorm: 0 }] } },
      yPos: 1,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.4,
      gridDivisions: 6,
      shelfThick,
      shelfBlockerMode: 'surface',
    }),
    1 - (pad + shelfThick / 2)
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      config: { sketchExtras: { rods: [{ yNorm: 1 }] } },
      yPos: 2.2,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.4,
      gridDivisions: 6,
    }),
    2.2 - (2 - pad)
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      config: { sketchExtras: { storageBarriers: [{ yNorm: 0, heightM: 0.4 }] } },
      yPos: 1,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.4,
      gridDivisions: 6,
    }),
    1 - (pad + 0.2)
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      config: { sketchExtras: { storageBarriers: [{ yNorm: 0 }] } },
      yPos: 1,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.4,
      gridDivisions: 6,
    }),
    1 - (pad + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM / 2)
  );
});

test('rod clearance preserves nearest-blocker, same-rod tolerance, evidence, and manual fallbacks', () => {
  const base = {
    yPos: 1,
    effectiveBottomY: 0,
    effectiveTopY: 2,
    localGridStep: 1,
    gridDivisions: 2,
  };
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: {
        isCustom: true,
        customData: {
          shelves: [],
          rods: [],
          rodOps: [{ yFactor: 0.4 }, { yFactor: 0.8 }, { yFactor: 1.2 }],
          storage: false,
        },
      },
    }),
    0.2
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: {
        isCustom: true,
        customData: { shelves: [], rods: [], rodOps: [{ yFactor: 0.99995 }], storage: false },
      },
    }),
    1
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: {
        isCustom: true,
        customData: { shelves: [], rods: [], rodOps: [{ yFactor: 0.9998 }], storage: false },
      },
    }),
    0.0002
  );
  assertClose(
    resolveInteriorRodAvailableHeight({
      ...base,
      config: { layout: 'shelves', isCustom: false },
      manualHeightLimit: 0.05,
    }),
    1
  );
  assertClose(resolveInteriorRodAvailableHeight({ ...base, config: {}, manualHeightLimit: 0.05 }), 0.05);
  assertClose(resolveInteriorRodAvailableHeight({ ...base, config: {} }), 1);
  assert.equal(resolveInteriorRodAvailableHeight({ ...base, yPos: '1' as unknown as number, config: {} }), 0);
  assert.equal(resolveInteriorRodAvailableHeight({ ...base, yPos: NaN, config: {} }), 0);
});
