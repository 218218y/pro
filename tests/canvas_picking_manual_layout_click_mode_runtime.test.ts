import test from 'node:test';
import assert from 'node:assert/strict';

import { tryApplyManualLayoutSketchModeClick } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_mode_flow.ts';
import { __wp_readSketchHover } from '../esm/native/services/canvas_picking_projection_runtime_shared.ts';

function createArgs(overrides: Record<string, unknown> = {}) {
  const cfg: Record<string, unknown> = {};
  const patchCalls: Array<{ meta: Record<string, unknown> }> = [];

  const args = {
    App: {},
    __mt: 'sketch_shelf:glass@45',
    __activeModuleKey: 2,
    __isBottomStack: false,
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    hitY0: 1.2,
    pad: 0.02,
    hitYClamped: 1.2,
    yNorm: 0.5,
    woodThick: 0.02,
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: {},
    __patchConfigForKey: (
      _mk: unknown,
      patchFn: (cfg: Record<string, unknown>) => void,
      meta: Record<string, unknown>
    ) => {
      patchCalls.push({ meta: { ...meta } });
      patchFn(cfg);
    },
    __resolveSketchBoxPlacementMetrics: () => ({
      innerW: 0.9,
      internalCenterX: 0,
      internalDepth: 0.5,
      internalZ: -0.1,
      hitLocalX: 0,
    }),
    __wp_parseSketchBoxToolSpec: () => ({ heightCm: 60, widthCm: 90, depthCm: 50 }),
    __wp_resolveSketchBoxGeometry: () => ({}) as any,
    __SKETCH_BOX_TOOL_PREFIX: 'sketch_box:',
    ...overrides,
  } as any;

  return { args, cfg, patchCalls };
}

test('manual-layout click mode commits shelf tools through the surface path and keeps patch metadata canonical', () => {
  const { args, cfg, patchCalls } = createArgs();

  const handled = tryApplyManualLayoutSketchModeClick(args);
  assert.equal(handled, true);
  assert.deepEqual(patchCalls, [{ meta: { source: 'sketch.place', immediate: true } }]);

  const extra = cfg.sketchExtras as any;
  assert.ok(extra);
  assert.equal(Array.isArray(extra.shelves), true);
  assert.equal(extra.shelves.length, 1);
  assert.deepEqual(extra.shelves[0], {
    yNorm: 0.5,
    variant: 'glass',
    depthM: 0.45,
  });
});

test('manual-layout click mode removes an existing shelf when the pointer hits inside the remove epsilon', () => {
  const { args, cfg } = createArgs({
    yNorm: 0.5,
    hitY0: 1.206,
  });

  cfg.sketchExtras = {
    shelves: [{ yNorm: 0.5, variant: 'glass', depthM: 0.45 }],
  };

  const handled = tryApplyManualLayoutSketchModeClick(args);
  assert.equal(handled, true);
  assert.deepEqual((cfg.sketchExtras as any).shelves, []);
});

test('manual-layout click mode routes sketch drawers through the canonical stack owner and writes hover state', () => {
  const { args, cfg, patchCalls } = createArgs({
    __mt: 'sketch_int_drawers',
    hitY0: 1.1,
    hitYClamped: 1.1,
    yNorm: 0.46,
  });

  const handled = tryApplyManualLayoutSketchModeClick(args);
  assert.equal(handled, true);
  assert.deepEqual(patchCalls, [{ meta: { source: 'sketch.place', immediate: true } }]);

  const extra = cfg.sketchExtras as any;
  assert.ok(extra);
  assert.equal(Array.isArray(extra.drawers), true);
  assert.equal(extra.drawers.length, 1);
  assert.equal(extra.shelves, undefined);

  const hover = __wp_readSketchHover(args.App as never) as Record<string, unknown> | null;
  assert.ok(hover);
  assert.equal(hover?.kind, 'drawers');
  assert.equal(hover?.op, 'remove');
});
