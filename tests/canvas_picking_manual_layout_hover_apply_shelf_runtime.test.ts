import test from 'node:test';
import assert from 'node:assert/strict';

import { tryApplyManualLayoutSketchHoverClick } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.js';
import {
  createShelfAddHoverRecord,
  createShelfRemoveHoverRecord,
} from '../esm/native/services/canvas_picking_sketch_module_surface_preview_hover_records.js';

const host = { tool: 'sketch_shelf:regular', moduleKey: 0, isBottom: false, ts: 1_000 } as const;

test('manual-layout hover click removes one base shelf and clears variant plus brace metadata canonically', () => {
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: {
      shelves: [true, true, true, true, true],
      shelfVariants: ['', 'oak', '', '', 'walnut'],
    },
    braceShelves: [2, 5],
  };
  let patchMeta: Record<string, unknown> | null = null;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 0,
    topY: 2.4,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: createShelfRemoveHoverRecord({
      host,
      removeKind: 'base',
      removeIdx: null,
      shelfIndex: 2,
    }),
    __hoverOk: true,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg);
      return null;
    },
    __wp_clearSketchHover: () => {},
  });

  const customData = cfg.customData as { shelves: boolean[]; shelfVariants: string[] };
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.hoverRemoveShelf', immediate: true });
  assert.equal(customData.shelves[1], false);
  assert.equal(customData.shelfVariants[1], '');
  assert.deepEqual(cfg.braceShelves, [5]);
});

test('manual-layout hover click removes one sketch shelf from sketch extras without touching other shelves', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      shelves: [
        { id: 's1', yNorm: 0.3 },
        { id: 's2', yNorm: 0.6 },
      ],
    },
  };

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 0,
    topY: 2.4,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: createShelfRemoveHoverRecord({
      host,
      removeKind: 'sketch',
      removeIdx: 0,
      shelfIndex: null,
    }),
    __hoverOk: true,
    __patchConfigForKey: (_mk, patchFn) => {
      patchFn(cfg);
      return null;
    },
    __wp_clearSketchHover: () => {},
  });

  const shelves = (((cfg.sketchExtras as { shelves?: Array<{ id: string }> }) || {}).shelves ?? []).map(
    entry => entry.id
  );
  assert.equal(applied, true);
  assert.deepEqual(shelves, ['s2']);
});

test('manual-layout hover click adds the shelf at the preview yNorm even when a nearby board is also hit', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      shelves: [{ id: 'existing', yNorm: 0.25, variant: 'regular' }],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;
  let cleared = false;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 0,
    topY: 2.4,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: createShelfAddHoverRecord({
      host: { ...host, tool: 'sketch_shelf:glass' },
      yNorm: 0.5,
      variant: 'glass',
      depthM: 0.42,
    }),
    __hoverOk: true,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg);
      return null;
    },
    __wp_clearSketchHover: () => {
      cleared = true;
    },
  });

  const shelves = ((cfg.sketchExtras as { shelves?: Array<Record<string, unknown>> }) || {}).shelves ?? [];
  assert.equal(applied, true);
  assert.equal(cleared, true);
  assert.deepEqual(patchMeta, { source: 'sketch.hoverAddShelf', immediate: true });
  assert.deepEqual(shelves, [
    { id: 'existing', yNorm: 0.25, variant: 'regular' },
    { yNorm: 0.5, variant: 'glass', depthM: 0.42 },
  ]);
});

test('manual-layout hover click rejects a shelf payload without an explicit versioned operation before patch', () => {
  const cfg: Record<string, unknown> = { sketchExtras: { shelves: [] } };
  let patchCalls = 0;
  let cleared = false;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 0,
    topY: 2.4,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: { kind: 'shelf', yNorm: 0.5, variant: 'regular', depthM: 0.4 },
    __hoverOk: true,
    __patchConfigForKey: () => {
      patchCalls += 1;
      return null;
    },
    __wp_clearSketchHover: () => {
      cleared = true;
    },
  });

  assert.equal(applied, true);
  assert.equal(cleared, true);
  assert.equal(patchCalls, 0);
  assert.deepEqual(cfg, { sketchExtras: { shelves: [] } });
});

test('manual-layout hover click consumes malformed payloads from every command family before patch or fallback', () => {
  const kinds = ['box', 'shelf', 'rod', 'storage', 'drawers', 'ext_drawers'] as const;

  for (const kind of kinds) {
    let patchCalls = 0;
    let clearCalls = 0;
    const applied = tryApplyManualLayoutSketchHoverClick({
      App: {} as never,
      __activeModuleKey: 0,
      topY: 2.4,
      bottomY: 0,
      __gridInfo: { gridDivisions: 6 },
      __hoverRec: { kind, op: 'add' },
      __hoverOk: true,
      __patchConfigForKey: () => {
        patchCalls += 1;
        return null;
      },
      __wp_clearSketchHover: () => {
        clearCalls += 1;
      },
    });

    assert.equal(applied, true, kind);
    assert.equal(patchCalls, 0, kind);
    assert.equal(clearCalls, 1, kind);
  }
});
