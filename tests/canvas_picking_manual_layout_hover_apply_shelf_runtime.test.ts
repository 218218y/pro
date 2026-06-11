import test from 'node:test';
import assert from 'node:assert/strict';

import { tryApplyManualLayoutSketchHoverClick } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.js';

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
    __hoverRec: { kind: 'shelf', op: 'remove', removeKind: 'base', shelfIndex: 2 },
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
    __hoverRec: { kind: 'shelf', op: 'remove', removeKind: 'sketch', removeIdx: 0 },
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
