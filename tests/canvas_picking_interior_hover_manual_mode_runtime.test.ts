import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY } from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import {
  INTERIOR_ROD_PLACEMENT_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
} from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_GRID_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import {
  SKETCH_BOX_ROD_PREVIEW_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import { resolveManualLayoutShelfFillPlan } from '../esm/native/services/canvas_picking_manual_layout_config_ops.ts';
import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

type ManualTool = '' | 'shelf' | 'rod' | 'storage';
type UnknownRecord = Record<string, unknown>;

type HoverTarget = {
  hitModuleKey: number;
  hitSelectorObj: UnknownRecord;
  isBottom: boolean;
  hitY: number;
  bottomY: number;
  topY: number;
  spanH: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  backZ: number;
  regularDepth: number;
  intersects: unknown[];
  info: UnknownRecord;
};

type HarnessOptions = {
  manualTool?: ManualTool;
  gridDivisions?: unknown;
  shelfVariant?: unknown;
  freeBoxResult?: boolean;
  target?: Partial<HoverTarget> | null;
  config?: UnknownRecord | null;
  setSketchPreview?: boolean;
  setLayoutPreview?: boolean;
  targetError?: Error | null;
};

function makeTarget(overrides: Partial<HoverTarget> = {}): HoverTarget {
  return {
    hitModuleKey: 0,
    hitSelectorObj: { id: 'module-anchor' },
    isBottom: false,
    hitY: 0.41,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    woodThick: 0.018,
    innerW: 0.9,
    internalCenterX: 0.1,
    internalDepth: 0.5,
    internalZ: -0.05,
    backZ: -0.3,
    regularDepth: 0.45,
    intersects: [],
    info: {},
    ...overrides,
  };
}

function createHarness(options: HarnessOptions = {}) {
  const controls = {
    manualTool: options.manualTool ?? ('shelf' as ManualTool),
    gridDivisions: options.gridDivisions ?? 6,
    shelfVariant: options.shelfVariant ?? 'regular',
    freeBoxResult: options.freeBoxResult ?? false,
    target:
      options.target === null
        ? null
        : makeTarget(options.target && typeof options.target === 'object' ? options.target : {}),
    config:
      options.config === undefined
        ? ({ isCustom: true, gridDivisions: 6, customData: {} } as UnknownRecord)
        : options.config,
    targetError: options.targetError ?? null,
  };
  const calls = {
    freeBox: [] as UnknownRecord[],
    target: 0,
    config: 0,
    sketch: [] as UnknownRecord[],
    layout: [] as UnknownRecord[],
    hideOrder: [] as string[],
  };

  const loaded = loadTsRuntimeModule(
    path.join(process.cwd(), 'esm/native/services/canvas_picking_interior_hover_manual_mode.ts'),
    {
      mocks: {
        './canvas_picking_local_helpers.js': {
          __wp_resolveInteriorHoverTarget() {
            calls.target += 1;
            if (controls.targetError) throw controls.targetError;
            return controls.target;
          },
          __wp_readInteriorModuleConfigRef() {
            calls.config += 1;
            return controls.config;
          },
        },
        './canvas_picking_manual_layout_free_box_content.js': {
          tryHandleManualLayoutFreeBoxHover(args: UnknownRecord) {
            calls.freeBox.push(args);
            return controls.freeBoxResult;
          },
        },
      },
    }
  ) as {
    tryHandleCanvasManualLayoutHover(args: UnknownRecord): boolean;
  };

  const THREE = { source: 'test-three' };
  const state = {
    ui: {
      currentGridDivisions: controls.gridDivisions,
      currentGridShelfVariant: controls.shelfVariant,
    },
    config: {},
    runtime: {},
    mode: { opts: {} },
    meta: {},
  };
  const App = {
    deps: { THREE },
    services: {
      tools: {
        getInteriorManualTool: () => controls.manualTool,
      },
    },
    store: { getState: () => state },
  };
  const previewRo =
    options.setSketchPreview === false
      ? {}
      : {
          setSketchPlacementPreview(payload: UnknownRecord) {
            calls.sketch.push(payload);
          },
        };
  const setLayoutPreview =
    options.setLayoutPreview === false
      ? null
      : (payload: UnknownRecord) => {
          calls.layout.push(payload);
        };

  function run(): boolean {
    state.ui.currentGridDivisions = controls.gridDivisions;
    state.ui.currentGridShelfVariant = controls.shelfVariant;
    return loaded.tryHandleCanvasManualLayoutHover({
      App,
      primaryMode: 'layout',
      ndcX: 0.1,
      ndcY: -0.2,
      raycaster: { id: 'raycaster' },
      mouse: { id: 'mouse' },
      previewRo,
      hideLayoutPreview: () => calls.hideOrder.push('layout'),
      hideSketchPreview: () => calls.hideOrder.push('sketch'),
      setLayoutPreview,
    });
  }

  return { App, THREE, calls, controls, run };
}

function assertApprox(actual: unknown, expected: number, label: string): void {
  assert.equal(typeof actual, 'number', `${label} must be numeric`);
  assert.ok(Math.abs(actual - expected) <= 1e-12, `${label}: expected ${expected}, got ${actual}`);
}

function expectedPad(woodThick: number): number {
  return Math.min(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMaxM,
    Math.max(
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMinM,
      woodThick * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadWoodRatio
    )
  );
}

test('manual interior hover preserves routing, Free Box priority, hide order, and fail-soft exits', () => {
  const noTool = createHarness({ manualTool: '' });
  assert.equal(noTool.run(), false);
  assert.equal(noTool.calls.freeBox.length, 0);
  assert.equal(noTool.calls.target, 0);

  const freeBox = createHarness({ manualTool: 'rod', freeBoxResult: true });
  assert.equal(freeBox.run(), true);
  assert.equal(freeBox.calls.freeBox.length, 1);
  assert.equal(freeBox.calls.target, 0);
  assert.equal(freeBox.calls.sketch.length, 0);

  const missingTarget = createHarness({ target: null });
  assert.equal(missingTarget.run(), false);
  assert.deepEqual(missingTarget.calls.hideOrder, ['sketch', 'layout']);

  const missingSketchSetter = createHarness({ setSketchPreview: false });
  assert.equal(missingSketchSetter.run(), false);
  assert.deepEqual(missingSketchSetter.calls.hideOrder, ['layout']);
  assert.equal(missingSketchSetter.calls.config, 0);

  const exception = createHarness({ targetError: new Error('target failure') });
  assert.equal(exception.run(), false);
  assert.equal(exception.calls.sketch.length, 0);
  assert.equal(exception.calls.layout.length, 0);
});

test('manual interior hover reads canonical grid defaults and preserves the maximum division', () => {
  for (const invalidGridDivisions of ['invalid', Number.NaN, 0, -3]) {
    const invalid = createHarness({
      gridDivisions: invalidGridDivisions,
      manualTool: 'storage',
    });
    assert.equal(invalid.run(), true);
    assert.equal(
      invalid.calls.freeBox[0].currentGridDivisions,
      INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault
    );
  }

  const maximum = createHarness({ gridDivisions: 8, manualTool: 'storage' });
  assert.equal(maximum.run(), true);
  assert.equal(maximum.calls.freeBox[0].currentGridDivisions, 8);
});

test('manual interior hover preserves minimum, wood-ratio, and maximum pad branches', () => {
  const woodCases = [0.0001, 0.018, 1];
  for (const woodThick of woodCases) {
    const pad = expectedPad(woodThick);
    const spanH = pad * 4;
    const harness = createHarness({
      gridDivisions: 8,
      shelfVariant: 'regular',
      target: { woodThick, hitY: -1, topY: spanH, spanH },
      config: { isCustom: true, gridDivisions: 8, customData: { shelves: [] } },
    });
    assert.equal(harness.run(), true);
    assertApprox(harness.calls.sketch[0].y, pad, `pad for wood ${woodThick}`);
  }
});

test('manual interior hover routes new shelf layouts through layout preview and keeps existing layouts single-item', () => {
  const newLayout = createHarness({
    gridDivisions: 6,
    shelfVariant: 'brace',
    config: { isCustom: false, gridDivisions: 4, customData: {} },
  });
  assert.equal(newLayout.run(), true);
  assert.deepEqual(newLayout.calls.hideOrder, ['layout', 'sketch']);
  assert.equal(newLayout.calls.sketch.length, 0);
  assert.equal(newLayout.calls.layout.length, 1);
  const target = newLayout.controls.target as HoverTarget;
  const expectedPlan = resolveManualLayoutShelfFillPlan({
    cfgRef: newLayout.controls.config,
    divs: 6,
    shelfVariant: 'brace',
    topY: target.topY,
    bottomY: target.bottomY,
    pad: expectedPad(target.woodThick),
    woodThick: target.woodThick,
  });
  assert.deepEqual(Array.from(newLayout.calls.layout[0].shelfYs as number[]), expectedPlan.shelfYs);
  assert.deepEqual(Array.from(newLayout.calls.layout[0].rodYs as number[]), []);
  assert.equal(newLayout.calls.layout[0].storageBarrier, null);
  assert.equal(newLayout.calls.layout[0].shelfVariant, 'brace');
  assert.equal(newLayout.calls.layout[0].op, 'add');

  const existingLayout = createHarness({
    gridDivisions: 6,
    config: { isCustom: true, gridDivisions: 6, customData: { shelves: [] } },
  });
  assert.equal(existingLayout.run(), true);
  assert.equal(existingLayout.calls.layout.length, 0);
  assert.equal(existingLayout.calls.sketch.length, 1);
  assert.equal(existingLayout.calls.sketch[0].kind, 'shelf');
});

test('manual interior hover preserves Storage add/remove geometry and thickness precedence', () => {
  const minimum = createHarness({
    manualTool: 'storage',
    target: { innerW: 0.01, woodThick: 0.00001 },
    config: { isCustom: true, gridDivisions: 6, customData: { storage: false } },
  });
  assert.equal(minimum.run(), true);
  const addPayload = minimum.calls.sketch[0];
  const addTarget = minimum.controls.target as HoverTarget;
  assert.equal(addPayload.kind, 'storage');
  assert.equal(addPayload.op, 'add');
  assertApprox(
    addPayload.y,
    addTarget.bottomY + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM / 2,
    'storage center y'
  );
  assertApprox(
    addPayload.z,
    addTarget.internalZ + addTarget.internalDepth / 2 + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
    'storage front z'
  );
  assertApprox(addPayload.w, INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM, 'storage minimum width');
  assertApprox(addPayload.h, INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM, 'storage height');
  assertApprox(
    addPayload.d,
    INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM,
    'storage preview minimum thickness'
  );

  const existing = createHarness({
    manualTool: 'storage',
    target: { innerW: 0.9, woodThick: 0.018 },
    config: { isCustom: true, gridDivisions: 6, customData: { storage: true } },
  });
  assert.equal(existing.run(), true);
  const removePayload = existing.calls.sketch[0];
  assert.equal(removePayload.op, 'remove');
  assertApprox(
    removePayload.w,
    0.9 - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM,
    'storage clearance width'
  );
  assertApprox(removePayload.d, 0.018, 'storage wood thickness precedence');
  assert.equal(removePayload.App, existing.App);
  assert.equal(removePayload.THREE, existing.THREE);
});

test('manual interior hover preserves Rod ceil selection, clamps, detection, and focused preview dimensions', () => {
  const ceilCase = createHarness({
    manualTool: 'rod',
    target: { hitY: 0.21, innerW: 0.9 },
    config: { isCustom: true, gridDivisions: 6, customData: { rods: [false, true] } },
  });
  assert.equal(ceilCase.run(), true);
  const ceilPayload = ceilCase.calls.sketch[0];
  assert.equal(ceilPayload.kind, 'rod');
  assert.equal(ceilPayload.op, 'remove');
  assertApprox(
    ceilPayload.y,
    2 * (1.2 / 6) + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM,
    'rod ceil-selected y'
  );
  assertApprox(ceilPayload.w, 0.9 - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM, 'rod clearance width');
  assertApprox(ceilPayload.h, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM, 'rod preview height');
  assertApprox(ceilPayload.d, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM, 'rod preview depth');

  const lower = createHarness({
    manualTool: 'rod',
    target: { hitY: -10, topY: 0.1, spanH: 0.1, innerW: 0.01 },
    config: { isCustom: true, gridDivisions: 6, customData: { rods: [] } },
  });
  assert.equal(lower.run(), true);
  const lowerPayload = lower.calls.sketch[0];
  assert.equal(lowerPayload.op, 'add');
  assertApprox(lowerPayload.y, expectedPad(0.018), 'rod lower y pad clamp');
  assertApprox(lowerPayload.w, SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM, 'rod minimum length');

  const upper = createHarness({
    manualTool: 'rod',
    target: { hitY: 100, topY: 2, spanH: 3 },
    config: { isCustom: true, gridDivisions: 6, customData: { rods: [] } },
  });
  assert.equal(upper.run(), true);
  const upperPayload = upper.calls.sketch[0];
  assertApprox(upperPayload.y, 2 - expectedPad(0.018), 'rod upper y pad clamp');
  assert.equal(upperPayload.op, 'add');
  assert.equal(upperPayload.App, upper.App);
  assert.equal(upperPayload.THREE, upper.THREE);
});

test('manual interior hover preserves Shelf round/clamp, operation, clearance, depth, and height variants', () => {
  const regular = createHarness({
    shelfVariant: 'regular',
    target: { hitY: 0.41, innerW: 0.9 },
    config: { isCustom: true, gridDivisions: 6, customData: { shelves: [] } },
  });
  assert.equal(regular.run(), true);
  const regularPayload = regular.calls.sketch[0];
  assert.equal(regularPayload.kind, 'shelf');
  assert.equal(regularPayload.variant, 'regular');
  assert.equal(regularPayload.op, 'add');
  assertApprox(regularPayload.y, 0.4, 'shelf rounded grid y');
  assertApprox(
    regularPayload.w,
    0.9 - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM,
    'regular shelf clearance'
  );
  assertApprox(regularPayload.d, 0.45, 'regular shelf depth');
  assertApprox(regularPayload.z, -0.3 + 0.45 / 2, 'regular shelf z');
  assertApprox(regularPayload.h, 0.018, 'regular shelf height');

  const glassPad = expectedPad(0.0001);
  const glassSpan = glassPad * 4;
  const glass = createHarness({
    gridDivisions: 8,
    shelfVariant: 'glass',
    target: { woodThick: 0.0001, hitY: -1, topY: glassSpan, spanH: glassSpan },
    config: {
      isCustom: true,
      gridDivisions: 8,
      customData: { shelves: [true], shelfVariants: ['glass'] },
    },
  });
  assert.equal(glass.run(), true);
  const glassPayload = glass.calls.sketch[0];
  assert.equal(glassPayload.op, 'remove');
  assertApprox(glassPayload.y, glassPad, 'shelf lower index and y clamp');
  assertApprox(glassPayload.h, MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM, 'glass shelf height');

  const doublePad = expectedPad(0.018);
  const doubleSpan = doublePad * 4;
  const double = createHarness({
    gridDivisions: 8,
    shelfVariant: 'double',
    target: { hitY: 100, topY: doubleSpan, spanH: doubleSpan },
    config: {
      isCustom: true,
      gridDivisions: 8,
      customData: {
        shelves: [false, false, false, false, false, false, true],
        shelfVariants: ['', '', '', '', '', '', 'regular'],
      },
    },
  });
  assert.equal(double.run(), true);
  const doublePayload = double.calls.sketch[0];
  assert.equal(doublePayload.op, 'add');
  assertApprox(doublePayload.y, doubleSpan - doublePad, 'shelf upper index and y clamp');
  assertApprox(
    doublePayload.h,
    Math.max(0.018, 0.018 * INTERIOR_SHELF_GEOMETRY_POLICY.doubleThicknessMultiplier),
    'double shelf height'
  );

  const brace = createHarness({
    shelfVariant: 'brace',
    target: { innerW: 0.9, internalDepth: 0.5 },
    config: {
      isCustom: true,
      gridDivisions: 6,
      braceShelves: [2],
      customData: { shelves: [false, true], shelfVariants: ['', 'regular'] },
    },
  });
  assert.equal(brace.run(), true);
  const bracePayload = brace.calls.sketch[0];
  assert.equal(bracePayload.op, 'remove');
  assertApprox(
    bracePayload.w,
    0.9 - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM,
    'brace shelf clearance'
  );
  assertApprox(bracePayload.d, 0.5, 'brace shelf depth');
  assertApprox(bracePayload.z, -0.3 + 0.5 / 2, 'brace shelf z');

  const floor = createHarness({
    shelfVariant: 'regular',
    target: { innerW: SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM / 2 },
    config: { isCustom: true, gridDivisions: 6, customData: { shelves: [] } },
  });
  assert.equal(floor.run(), true);
  assert.equal(floor.calls.sketch[0].w, 0);
  assert.equal(floor.calls.sketch[0].App, floor.App);
  assert.equal(floor.calls.sketch[0].THREE, floor.THREE);
});
