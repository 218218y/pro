import test from 'node:test';
import assert from 'node:assert/strict';

import { tryApplyManualLayoutSketchHoverClick } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.js';
import { createRodRemoveHoverRecord } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_hover_records.js';

const host = { tool: 'sketch_rod', moduleKey: 0, isBottom: false, ts: 1_000 } as const;

test('hover click apply removes one preset-backed split rod without moving the remaining rod off its exact preset height', () => {
  const cfg: Record<string, unknown> = {
    layout: 'hanging_split',
    isCustom: false,
  };
  let patchCalls = 0;
  let patchMeta: Record<string, unknown> | null = null;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 0,
    topY: 1.2,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: createRodRemoveHoverRecord({
      host,
      removeKind: 'base',
      removeIdx: null,
      rodIndex: 6,
    }),
    __hoverOk: true,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchCalls += 1;
      patchMeta = meta;
      patchFn(cfg);
      return null;
    },
    __wp_clearSketchHover: () => {},
  });

  const customData = cfg.customData as
    | {
        rods?: boolean[];
        shelves?: boolean[];
        rodOps?: Array<{ gridIndex?: number; yFactor?: number }>;
      }
    | undefined;
  assert.equal(applied, true);
  assert.equal(patchCalls, 1);
  assert.equal(patchMeta?.source, 'sketch.hoverRemoveRod');
  assert.equal(cfg.isCustom, true);
  assert.ok(Array.isArray(customData?.shelves));
  assert.ok(Array.isArray(customData?.rods));
  assert.equal(customData?.rods?.[5], false);
  assert.equal(customData?.rods?.[2], true);
  assert.deepEqual(customData?.rodOps, [
    {
      gridIndex: 3,
      yFactor: 2.8,
      enableHangingClothes: true,
      enableSingleHanger: true,
      limitFactor: 2.8,
      limitAdd: 0,
    },
  ]);
});

test('hover click apply removes sketch rod from sketch extras list', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      rods: [
        { id: 'r1', yNorm: 0.4 },
        { id: 'r2', yNorm: 0.7 },
      ],
    },
  };

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 0,
    topY: 1.2,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: createRodRemoveHoverRecord({
      host,
      removeKind: 'sketch',
      removeIdx: 1,
      rodIndex: null,
    }),
    __hoverOk: true,
    __patchConfigForKey: (_mk, patchFn) => {
      patchFn(cfg);
      return null;
    },
    __wp_clearSketchHover: () => {},
  });

  const rods = ((cfg.sketchExtras as { rods?: Array<{ id: string }> }).rods ?? []).map(entry => entry.id);
  assert.equal(applied, true);
  assert.deepEqual(rods, ['r1']);
});
