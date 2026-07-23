import test from 'node:test';
import assert from 'node:assert/strict';

import { DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY } from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import {
  fillManualLayoutShelves,
  isManualLayoutShelfBlockedBySketchDrawers,
  removeManualLayoutBaseRod,
  removeManualLayoutBaseShelf,
  removeManualLayoutSketchExtraByIndex,
  resolveManualLayoutShelfFillPlan,
  toggleManualLayoutRod,
  toggleManualLayoutShelf,
  toggleManualLayoutStorage,
} from '../esm/native/services/canvas_picking_manual_layout_config_ops.ts';

test('manual-layout config ops fill all shelves seeds a clean brace layout grid', () => {
  const cfg: Record<string, unknown> = {
    customData: {
      shelves: [false],
      rods: [true, true],
      shelfVariants: ['glass'],
      rodOps: [{ gridIndex: 2 }],
      storage: false,
    },
    braceShelves: [2],
  };

  fillManualLayoutShelves(cfg, {
    divs: 6,
    shelfVariant: 'brace',
    topY: 2.4,
    bottomY: 0,
  });

  const customData = cfg.customData as {
    shelves: boolean[];
    rods: boolean[];
    shelfVariants: string[];
    rodOps: unknown[];
    storage: boolean;
  };

  assert.equal(cfg.isCustom, true);
  assert.equal(cfg.gridDivisions, 6);
  assert.equal(cfg.manualLayoutGridEdited, true);
  assert.deepEqual(cfg.savedDims, { top: 2.4, bottom: 0 });
  assert.deepEqual(customData.shelves, [true, true, true, true, true]);
  assert.deepEqual(customData.rods, []);
  assert.deepEqual(customData.shelfVariants, ['brace', 'brace', 'brace', 'brace', 'brace']);
  assert.deepEqual(customData.rodOps, []);
  assert.deepEqual(cfg.braceShelves, [1, 2, 3, 4, 5]);
});

test('manual-layout config ops skip auto-filled shelves that collide with sketch drawer stacks', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'internal-drawers', yNormC: 0.4, drawerHeightM: 0.18 }],
      extDrawers: [{ id: 'external-drawers', yNormC: 0.6, count: 1, drawerHeightM: 0.18 }],
    },
    braceShelves: [],
  };

  const plan = fillManualLayoutShelves(cfg, {
    divs: 5,
    shelfVariant: 'brace',
    topY: 1.2,
    bottomY: 0,
    pad: 0.02,
    woodThick: 0.018,
  });

  const customData = cfg.customData as { shelves: boolean[]; shelfVariants: string[] };
  assert.deepEqual(plan.skippedIndexes, [2, 3]);
  assert.deepEqual(plan.allowedIndexes, [1, 4]);
  assert.equal(plan.builtCount, 2);
  assert.equal(plan.skippedCount, 2);
  assert.deepEqual(customData.shelves, [true, false, false, true]);
  assert.deepEqual(customData.shelfVariants, ['brace', '', '', 'brace']);
  assert.deepEqual(cfg.braceShelves, [1, 4]);
});

test('manual-layout config ops expose a pure fill plan without mutating config state', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'internal-drawers', yNormC: 0.5, drawerHeightM: 0.18 }],
    },
  };

  const plan = resolveManualLayoutShelfFillPlan({
    cfgRef: cfg,
    divs: 4,
    shelfVariant: 'regular',
    topY: 1.2,
    bottomY: 0,
    pad: 0.02,
    woodThick: 0.018,
  });

  assert.deepEqual(plan.allowedIndexes, [1, 3]);
  assert.deepEqual(plan.skippedIndexes, [2]);
  assert.deepEqual(
    plan.shelfYs.map(value => Math.round(value * 100) / 100),
    [0.3, 0.9]
  );
  assert.equal(cfg.customData, undefined);
});

test('manual-layout config ops block adding a single shelf over sketch drawers', () => {
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: {
      shelves: [false, false],
      rods: [],
      shelfVariants: ['', ''],
      storage: false,
    },
    sketchExtras: {
      drawers: [{ id: 'internal-drawers', yNormC: 0.3333333333333333, drawerHeightM: 0.18 }],
    },
  };

  const result = toggleManualLayoutShelf(cfg, {
    divs: 3,
    topY: 1.2,
    bottomY: 0,
    reset: false,
    arrayIdx: 0,
    shelfVariant: 'regular',
    pad: 0.02,
    woodThick: 0.018,
  });

  const customData = cfg.customData as { shelves: boolean[]; shelfVariants: string[] };
  assert.deepEqual(result, { changed: false, blockedBySketchDrawers: true });
  assert.deepEqual(customData.shelves, [false, false]);
  assert.deepEqual(customData.shelfVariants, ['', '']);
});

test('manual-layout shelf collision preserves custom pad precedence and all focused policy branches', () => {
  const policy = DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY;
  const minWoodThick = policy.internalClampPadMinM / policy.internalClampPadWoodRatio / 2;
  const ratioWoodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const maxWoodThick = (policy.internalClampPadMaxM / policy.internalClampPadWoodRatio) * 2;
  const expectedPad = (woodThick: number) =>
    Math.min(
      policy.internalClampPadMaxM,
      Math.max(policy.internalClampPadMinM, woodThick * policy.internalClampPadWoodRatio)
    );
  const collides = (args: { yNormC: number; pad?: unknown; woodThick?: unknown }) =>
    isManualLayoutShelfBlockedBySketchDrawers({
      cfgRef: {
        sketchExtras: {
          drawers: [{ id: 'pad-probe', yNormC: args.yNormC, drawerHeightM: 0.02 }],
        },
      },
      divs: 4,
      topY: 1,
      bottomY: 0,
      shelfIndex: 2,
      shelfVariant: 'regular',
      pad: args.pad,
      woodThick: args.woodThick,
    });

  assert.equal(expectedPad(minWoodThick), policy.internalClampPadMinM);
  assert.equal(collides({ yNormC: 0.575, pad: Number.NaN, woodThick: minWoodThick }), false);

  const ratioPad = expectedPad(ratioWoodThick);
  assert.equal(ratioPad, ratioWoodThick * policy.internalClampPadWoodRatio);
  assert.equal(collides({ yNormC: 0.575, pad: Number.NaN, woodThick: ratioWoodThick }), true);

  assert.equal(expectedPad(maxWoodThick), policy.internalClampPadMaxM);
  assert.equal(collides({ yNormC: 0.578, pad: Number.NaN, woodThick: maxWoodThick }), true);

  assert.equal(collides({ yNormC: 0.578, pad: 0, woodThick: ratioWoodThick }), true);
  assert.equal(collides({ yNormC: 0.578, pad: Number.NaN, woodThick: ratioWoodThick }), false);
  assert.equal(
    collides({ yNormC: 0.575, pad: policy.internalClampPadMinM, woodThick: ratioWoodThick }),
    false
  );

  for (const invalidPad of [-1, '0', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      collides({ yNormC: 0.575, pad: invalidPad, woodThick: ratioWoodThick }),
      collides({ yNormC: 0.575, pad: ratioPad, woodThick: ratioWoodThick })
    );
  }
});

test('manual-layout shelf collision preserves custom wood thickness and fail-closed fallback inputs', () => {
  const policy = DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY;
  const defaultWoodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const customWoodThick = policy.internalClampPadMinM / policy.internalClampPadWoodRatio / 2;
  const collides = (woodThick: unknown) =>
    isManualLayoutShelfBlockedBySketchDrawers({
      cfgRef: {
        sketchExtras: {
          drawers: [{ id: 'wood-probe', yNormC: 0.575, drawerHeightM: 0.02 }],
        },
      },
      divs: 4,
      topY: 1,
      bottomY: 0,
      shelfIndex: 2,
      shelfVariant: 'regular',
      pad: Number.NaN,
      woodThick,
    });

  assert.equal(collides(customWoodThick), false);
  assert.equal(collides(defaultWoodThick), true);
  for (const invalidWoodThick of [0, -1, '0.018', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(collides(invalidWoodThick), collides(defaultWoodThick));
  }
});

test('manual-layout shelf collision distinguishes clear, internal, and external drawer ranges', () => {
  const base = {
    divs: 4,
    topY: 1.2,
    bottomY: 0,
    shelfIndex: 2,
    shelfVariant: 'regular' as const,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  };

  assert.equal(isManualLayoutShelfBlockedBySketchDrawers({ ...base, cfgRef: {} }), false);
  assert.equal(
    isManualLayoutShelfBlockedBySketchDrawers({
      ...base,
      cfgRef: {
        sketchExtras: {
          drawers: [{ id: 'internal', yNormC: 0.5, drawerHeightM: 0.18 }],
        },
      },
    }),
    true
  );
  assert.equal(
    isManualLayoutShelfBlockedBySketchDrawers({
      ...base,
      cfgRef: {
        sketchExtras: {
          extDrawers: [{ id: 'external', yNormC: 0.5, count: 1, drawerHeightM: 0.18 }],
        },
      },
    }),
    true
  );
});

test('manual-layout config ops preserve blocked variant-change removal semantics', () => {
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: {
      shelves: [true, false],
      rods: [],
      shelfVariants: ['', ''],
      storage: false,
    },
    sketchExtras: {
      drawers: [{ id: 'internal-drawers', yNormC: 1 / 3, drawerHeightM: 0.18 }],
    },
  };

  const result = toggleManualLayoutShelf(cfg, {
    divs: 3,
    topY: 1.2,
    bottomY: 0,
    reset: false,
    arrayIdx: 0,
    shelfVariant: 'glass',
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  });

  const customData = cfg.customData as { shelves: boolean[]; shelfVariants: string[] };
  assert.deepEqual(result, { changed: true, blockedBySketchDrawers: true });
  assert.deepEqual(customData.shelves, [false, false]);
  assert.deepEqual(customData.shelfVariants, ['', '']);
});

test('manual-layout config ops toggle storage resets stale shelf and rod arrays for a new editable grid', () => {
  const cfg: Record<string, unknown> = {
    isCustom: false,
    customData: {
      shelves: [true, true],
      rods: [true, false],
      shelfVariants: ['glass', ''],
      rodOps: [{ gridIndex: 1 }],
      storage: false,
    },
    braceShelves: [1],
  };

  toggleManualLayoutStorage(cfg, {
    divs: 5,
    topY: 2,
    bottomY: 0.2,
    reset: true,
  });

  const customData = cfg.customData as {
    shelves: boolean[];
    rods: boolean[];
    shelfVariants: string[];
    rodOps: unknown[];
    storage: boolean;
  };

  assert.equal(customData.storage, true);
  assert.deepEqual(customData.shelves, []);
  assert.deepEqual(customData.rods, []);
  assert.deepEqual(customData.shelfVariants, []);
  assert.deepEqual(customData.rodOps, []);
  assert.deepEqual(cfg.braceShelves, []);
});

test('manual-layout config ops remove only the exact preset rod metadata for the removed rod index', () => {
  const cfg: Record<string, unknown> = {
    layout: 'hanging_split',
    isCustom: false,
  };

  removeManualLayoutBaseRod(cfg, {
    divs: 6,
    rodIndex: 5,
    topY: 1.2,
    bottomY: 0,
  });

  const customData = cfg.customData as {
    rods: boolean[];
    rodOps: Array<{ gridIndex?: number; yFactor?: number }>;
  };

  assert.equal(customData.rods[4], false);
  assert.equal(customData.rods[1], true);
  assert.deepEqual(customData.rodOps, [
    {
      gridIndex: 2,
      yFactor: 2.3,
      enableHangingClothes: true,
      enableSingleHanger: true,
      limitFactor: 1.3,
      limitAdd: 0,
    },
  ]);
});

test('manual-layout config ops toggle rod preserves unrelated exact preset rod metadata', () => {
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: {
      shelves: [],
      rods: [false, true, false, false],
      shelfVariants: [],
      rodOps: [
        { gridIndex: 2, yFactor: 2.3, enableHangingClothes: true },
        { gridIndex: 4, yFactor: 4.1, enableHangingClothes: true },
      ],
      storage: false,
    },
    braceShelves: [],
  };

  toggleManualLayoutRod(cfg, {
    divs: 4,
    topY: 2.1,
    bottomY: 0,
    reset: false,
    arrayIdx: 1,
  });

  const customData = cfg.customData as {
    rods: boolean[];
    rodOps: Array<{ gridIndex?: number; yFactor?: number }>;
  };

  assert.equal(customData.rods[1], false);
  assert.deepEqual(customData.rodOps, [{ gridIndex: 4, yFactor: 4.1, enableHangingClothes: true }]);
});

test('manual-layout config ops clear base brace shelf state and trim sketch extras by index', () => {
  const cfg: Record<string, unknown> = {
    layout: 'shelves',
    isCustom: false,
    braceShelves: [1, 3],
    sketchExtras: {
      shelves: [{ id: 'keep-0' }, { id: 'drop-1' }, { id: 'keep-2' }],
    },
  };

  removeManualLayoutBaseShelf(cfg, {
    divs: 4,
    shelfIndex: 3,
    topY: 2.2,
    bottomY: 0,
  });
  removeManualLayoutSketchExtraByIndex(cfg, 'shelves', 1);

  const customData = cfg.customData as { shelves: boolean[]; shelfVariants: string[] };
  assert.equal(customData.shelves[2], false);
  assert.equal(customData.shelfVariants[2], '');
  assert.deepEqual(cfg.braceShelves, [1]);
  assert.deepEqual((cfg.sketchExtras as any).shelves, [{ id: 'keep-0' }, { id: 'keep-2' }]);
});
