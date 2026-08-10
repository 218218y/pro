import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePartHoverPreviewCommand } from '../esm/native/services/canvas_picking_part_hover_preview_protocol.ts';
import { createPartHoverPreviewRuntime } from '../esm/native/services/canvas_picking_part_hover_preview_runtime.ts';

function createApp() {
  return {
    deps: {
      get(key: string) {
        return key === 'THREE' ? { marker: 'three' } : null;
      },
    },
  } as any;
}

const BOX_COMMAND = {
  kind: 'box' as const,
  anchor: { id: 'anchor' },
  anchorParent: { id: 'parent' },
  op: 'add' as const,
  x: 1,
  y: 2,
  z: 3,
  w: 0.8,
  boxH: 1.9,
  d: 0.55,
  woodThick: 0.018,
  fillFront: true,
  fillBack: false,
  overlayThroughScene: false,
};

test('part-hover preview protocol validates typed box and object-box commands', () => {
  assert.deepEqual(validatePartHoverPreviewCommand(BOX_COMMAND), []);
  assert.deepEqual(
    validatePartHoverPreviewCommand({ ...BOX_COMMAND, kind: 'object_boxes', previewObjects: [{}] }),
    []
  );
  assert.deepEqual(validatePartHoverPreviewCommand({ ...BOX_COMMAND, w: Number.NaN }), [
    'w must be positive and finite',
  ]);
  assert.deepEqual(
    validatePartHoverPreviewCommand({ ...BOX_COMMAND, kind: 'object_boxes', previewObjects: [] }),
    ['object_boxes preview requires at least one preview object']
  );
});

test('part-hover preview runtime owns cleanup ordering and raw RenderOps payload construction', () => {
  const App = createApp();
  const calls: string[] = [];
  const payloads: Record<string, unknown>[] = [];
  const runtime = createPartHoverPreviewRuntime({
    App,
    hideLayoutPreview(payload) {
      calls.push(`layout:${String(payload.App === App)}`);
    },
    hideSketchPreview(payload) {
      calls.push(`sketch:${String(payload.App === App)}`);
    },
    previewRo: {
      setSketchPlacementPreview(payload: Record<string, unknown>) {
        calls.push('show');
        payloads.push(payload);
      },
    },
  });

  assert.equal(runtime.canShow, true);
  assert.equal(
    runtime.apply({
      type: 'show',
      clearScope: 'layout-and-sketch',
      reason: 'runtime-test',
      command: BOX_COMMAND,
    }),
    true
  );
  assert.deepEqual(calls, ['layout:true', 'sketch:true', 'show']);
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0]?.App, App);
  assert.equal(payloads[0]?.kind, 'box');
  assert.equal(payloads[0]?.op, 'add');
  assert.equal(payloads[0]?.w, 0.8);
  assert.equal(payloads[0]?.boxH, 1.9);
});

test('part-hover preview runtime preserves scoped cleanup and fails closed on invalid commands', () => {
  const calls: string[] = [];
  const runtime = createPartHoverPreviewRuntime({
    App: createApp(),
    hideLayoutPreview() {
      calls.push('layout');
    },
    hideSketchPreview() {
      calls.push('sketch');
    },
    previewRo: {
      setSketchPlacementPreview() {
        calls.push('show');
      },
    },
  });

  assert.equal(runtime.apply({ type: 'clear', clearScope: 'sketch', reason: 'target-not-resolved' }), false);
  assert.deepEqual(calls, ['sketch']);

  calls.length = 0;
  assert.equal(
    runtime.apply({
      type: 'show',
      clearScope: 'layout-and-sketch',
      reason: 'invalid-command-test',
      command: { ...BOX_COMMAND, d: 0 },
    }),
    false
  );
  assert.deepEqual(calls, ['layout', 'sketch']);
});
