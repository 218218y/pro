import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fillManualLayoutShelves,
  removeManualLayoutBaseRod,
  removeManualLayoutBaseShelf,
  removeManualLayoutSketchExtraByIndex,
  toggleManualLayoutRod,
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
  assert.deepEqual(cfg.savedDims, { top: 2.4, bottom: 0 });
  assert.deepEqual(customData.shelves, [true, true, true, true, true]);
  assert.deepEqual(customData.rods, []);
  assert.deepEqual(customData.shelfVariants, ['brace', 'brace', 'brace', 'brace', 'brace']);
  assert.deepEqual(customData.rodOps, []);
  assert.deepEqual(cfg.braceShelves, [1, 2, 3, 4, 5]);
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
