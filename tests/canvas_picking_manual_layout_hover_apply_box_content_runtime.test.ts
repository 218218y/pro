import test from 'node:test';
import assert from 'node:assert/strict';

import { tryApplyManualLayoutSketchHoverClick } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.js';

test('manual-layout hover click commits sketch-box storage content through the canonical content owner and clears hover', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'sb1',
          absX: 1,
          absY: 1,
          widthM: 1,
          heightM: 1,
          depthM: 0.6,
        },
      ],
    },
  };
  let cleared = 0;
  let patchMeta: Record<string, unknown> | null = null;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: {
      kind: 'box_content',
      contentKind: 'storage',
      boxId: 'sb1',
      op: 'add',
      boxYNorm: 0.35,
      contentXNorm: 0.2,
      heightM: 0.42,
    },
    __hoverOk: true,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg);
      return null;
    },
    __wp_clearSketchHover: () => {
      cleared += 1;
    },
  });

  const boxes = ((cfg.sketchExtras as { boxes?: Array<Record<string, unknown>> }) || {}).boxes ?? [];
  const storage = (boxes[0]?.storageBarriers as Array<Record<string, unknown>>) || [];
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'manualSketchBoxStorage', immediate: true });
  assert.equal(cleared, 1);
  assert.equal(storage.length, 1);
  assert.deepEqual(storage[0], { id: storage[0].id, yNorm: 0.35, xNorm: 0.2, heightM: 0.42 });
});

test('manual-layout hover click commits sketch-box divider from canonical hover metadata', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'sb-divider',
          absX: 1,
          absY: 1,
          widthM: 1,
          heightM: 1,
          depthM: 0.6,
        },
      ],
    },
  };
  let cleared = 0;
  let patchMeta: Record<string, unknown> | null = null;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App: {} as never,
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    __gridInfo: { gridDivisions: 6 },
    __hoverRec: {
      kind: 'box_content',
      tool: 'sketch_box_divider',
      moduleKey: 2,
      isBottom: false,
      ts: Date.now(),
      contentKind: 'divider',
      boxId: 'sb-divider',
      freePlacement: false,
      op: 'add',
      dividerXNorm: 0.32,
    },
    __hoverOk: true,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg);
      return null;
    },
    __wp_clearSketchHover: () => {
      cleared += 1;
    },
  });

  const boxes = ((cfg.sketchExtras as { boxes?: Array<Record<string, unknown>> }) || {}).boxes ?? [];
  const dividers = (boxes[0]?.dividers as Array<Record<string, unknown>>) || [];
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'manualSketchBoxDivider', immediate: true });
  assert.equal(cleared, 1);
  assert.equal(dividers.length, 1);
  assert.equal(dividers[0].xNorm, 0.32);
});
