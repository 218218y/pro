import test from 'node:test';
import assert from 'node:assert/strict';

import {
  commitSketchFreePlacementHoverRecord,
  createSketchFreePlacementBoxHoverRecord,
} from '../esm/native/services/canvas_picking_sketch_free_commit.ts';

test('sketch-free placement hover record keeps canonical host/free-placement fields', () => {
  const hoverRecord = createSketchFreePlacementBoxHoverRecord({
    tool: 'sketch_box_free',
    host: { moduleKey: 3, isBottom: true },
    op: 'add',
    previewX: 0.25,
    previewY: 1.1,
    previewH: 0.9,
    previewW: 0.7,
    previewD: 0.4,
    ts: 123,
  });

  assert.deepEqual(hoverRecord, {
    ts: 123,
    tool: 'sketch_box_free',
    moduleKey: 3,
    isBottom: true,
    hostModuleKey: 3,
    hostIsBottom: true,
    kind: 'box',
    op: 'add',
    freePlacement: true,
    xCenter: 0.25,
    yCenter: 1.1,
    heightM: 0.9,
    widthM: 0.7,
    depthM: 0.4,
    removeId: null,
  });
});

test('sketch-free placement commit adds a free-placement box through the canonical modules patch seam', () => {
  const cfg: Record<string, unknown> = {};
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }> = [];

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            side: string,
            moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void,
            options: Record<string, unknown>
          ) => {
            patchCalls.push({ side, moduleKey, options });
            patcher(cfg);
          },
        },
      },
    } as never,
    host: { moduleKey: 7, isBottom: false },
    hoverRec: createSketchFreePlacementBoxHoverRecord({
      tool: 'sketch_box_free',
      host: { moduleKey: 7, isBottom: false },
      op: 'add',
      previewX: 0.15,
      previewY: 0.95,
      previewH: 0.9,
      previewW: 0.72,
      previewD: 0.42,
      ts: 1,
    }) as never,
  });

  assert.deepEqual(result, { committed: true, nextHover: null });
  assert.equal(patchCalls.length, 1);
  assert.equal(patchCalls[0]?.side, 'top');
  assert.equal(patchCalls[0]?.moduleKey, 7);
  assert.deepEqual(patchCalls[0]?.options, { source: 'manualSketchBoxFree', immediate: true });

  const boxes =
    ((cfg.sketchExtras as Record<string, unknown> | undefined)?.boxes as Array<Record<string, unknown>>) ||
    [];
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0]?.freePlacement, true);
  assert.equal(boxes[0]?.absX, 0.15);
  assert.equal(boxes[0]?.absY, 0.95);
  assert.equal(boxes[0]?.heightM, 0.9);
  assert.equal(boxes[0]?.widthM, 0.72);
  assert.equal(boxes[0]?.depthM, 0.42);
  assert.match(String(boxes[0]?.id || ''), /^sbf_/);
});

test('sketch-free placement content commit routes free-placement door removal through the canonical content seam', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1,
          doors: [{ id: 'door-1', xNorm: 0.5, hinge: 'right', enabled: true }],
        },
      ],
    },
  };
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }> = [];

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            side: string,
            moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void,
            options: Record<string, unknown>
          ) => {
            patchCalls.push({ side, moduleKey, options });
            patcher(cfg);
          },
        },
      },
    } as never,
    host: { moduleKey: 'corner', isBottom: true },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-1',
      contentKind: 'door',
      op: 'remove',
      contentXNorm: 0.5,
      doorId: 'door-1',
      hinge: 'right',
    } as never,
    freeBoxContentKind: 'door',
    floorY: 0,
  });

  assert.deepEqual(result, { committed: true, nextHover: null });
  assert.equal(patchCalls.length, 1);
  assert.equal(patchCalls[0]?.side, 'bottom');
  assert.equal(patchCalls[0]?.moduleKey, 'corner');
  assert.deepEqual(patchCalls[0]?.options, { source: 'manualSketchBoxContentFree', immediate: true });
  const boxes =
    ((cfg.sketchExtras as Record<string, unknown> | undefined)?.boxes as Array<Record<string, unknown>>) ||
    [];
  assert.deepEqual((boxes[0]?.doors as unknown[]) || [], []);
});
