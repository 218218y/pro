import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBraceShelvesHoverRecord,
  createPresetLayoutHoverRecord,
  createShelfGridHoverRecord,
  decodeFreeBoxCommand,
  readBraceShelvesFreeBoxCommand,
  readPresetLayoutFreeBoxCommand,
  readShelfGridFreeBoxCommand,
} from '../esm/native/services/canvas_picking_manual_layout_free_box_hover_protocol.ts';

const host = { moduleKey: 'm1', isBottom: false } as never;

test('manual free-box shelf-grid hover protocol preserves the exact preview plan for commit', () => {
  const hover = createShelfGridHoverRecord({
    host,
    boxId: 'box-1',
    shelfVariant: 'glass',
    plan: {
      shelfYs: [0.2, 0.4],
      shelfYNorms: [0.25, 0.75],
      cellXNormMin: 0.1,
      cellXNormMax: 0.4,
      cellYNormMin: 0.2,
      cellYNormMax: 0.8,
      contentXNorm: 0.25,
      previewX: 0,
      previewW: 1,
      previewInternalZ: 0,
      previewInnerD: 0.5,
      previewWoodThick: 0.018,
      depthM: 0.42,
      blockedReason: null,
    },
  });

  assert.deepEqual(readShelfGridFreeBoxCommand(hover), {
    kind: 'shelf-grid',
    boxId: 'box-1',
    shelfYNorms: [0.25, 0.75],
    variant: 'glass',
    depthM: 0.42,
    blockedReason: null,
    cellXNormMin: 0.1,
    cellXNormMax: 0.4,
    cellYNormMin: 0.2,
    cellYNormMax: 0.8,
    contentXNorm: 0.25,
  });
});

test('manual free-box preset hover protocol keeps shelves, rods and storage in one typed command', () => {
  const hover = createPresetLayoutHoverRecord({
    host,
    boxId: 'box-2',
    plan: {
      layoutType: 'storage',
      shelfYs: [0.1],
      shelfYNorms: [0.2],
      rodYs: [0.7],
      rodYNorms: [0.8],
      storageBarrier: { y: 0.3, h: 0.2, z: 0.4 },
      storageYNorm: 0.35,
      cellXNormMin: 0,
      cellXNormMax: 1,
      cellYNormMin: 0,
      cellYNormMax: 1,
      contentXNorm: 0.5,
      previewX: 0,
      previewW: 1,
      previewInternalZ: 0,
      previewInnerD: 0.5,
      previewWoodThick: 0.018,
      shelfDepthM: 0.45,
      blockedReason: 'collision',
    },
  });

  assert.deepEqual(readPresetLayoutFreeBoxCommand(hover), {
    kind: 'preset-layout',
    boxId: 'box-2',
    shelfYNorms: [0.2],
    rodYNorms: [0.8],
    storageYNorm: 0.35,
    storageHeightM: 0.2,
    variant: 'regular',
    depthM: 0.45,
    blockedReason: 'collision',
    cellXNormMin: 0,
    cellXNormMax: 1,
    cellYNormMin: 0,
    cellYNormMax: 1,
    contentXNorm: 0.5,
  });
});

test('manual free-box brace protocol validates identity and narrows the target variant', () => {
  const hover = createBraceShelvesHoverRecord({
    host,
    boxId: 'box-3',
    plan: {
      shelfId: 'shelf-9',
      shelfIdx: 2,
      shelfY: 1,
      shelfYNorm: 0.5,
      contentXNorm: 0.5,
      previewX: 0,
      previewW: 1,
      previewInternalZ: 0,
      previewInnerD: 0.5,
      previewWoodThick: 0.018,
      currentVariant: 'regular',
      nextVariant: 'brace',
      nextDepthM: 0.5,
    },
  });

  assert.deepEqual(readBraceShelvesFreeBoxCommand(hover), {
    kind: 'brace-shelf',
    boxId: 'box-3',
    shelfId: 'shelf-9',
    shelfIdx: 2,
    variant: 'brace',
    depthM: 0.5,
  });
  assert.equal(readBraceShelvesFreeBoxCommand({ ...hover, boxId: '' }), null);
});

test('manual free-box protocol rejects missing, malformed and unknown-version envelopes', () => {
  const hover = createShelfGridHoverRecord({
    host,
    boxId: 'box-strict',
    shelfVariant: 'regular',
    plan: {
      shelfYs: [0.5],
      shelfYNorms: [0.5],
      cellXNormMin: 0,
      cellXNormMax: 1,
      cellYNormMin: 0,
      cellYNormMax: 1,
      contentXNorm: 0.5,
      previewX: 0,
      previewW: 1,
      previewInternalZ: 0,
      previewInnerD: 0.5,
      previewWoodThick: 0.018,
      depthM: null,
      blockedReason: null,
    },
  });

  const withoutEnvelope = { ...hover };
  delete withoutEnvelope.freeBoxCommand;
  assert.deepEqual(decodeFreeBoxCommand(withoutEnvelope), {
    ok: false,
    reason: 'missing-envelope',
  });

  assert.deepEqual(decodeFreeBoxCommand({ ...hover, freeBoxCommand: { version: 2, command: {} } }), {
    ok: false,
    reason: 'unsupported-version',
  });
  assert.deepEqual(decodeFreeBoxCommand({ ...hover, freeBoxCommand: { version: 1 } }), {
    ok: false,
    reason: 'invalid-command',
  });
});

test('manual free-box protocol rejects incomplete, non-finite and out-of-range commands', () => {
  const hover = createShelfGridHoverRecord({
    host,
    boxId: 'box-invalid',
    shelfVariant: 'regular',
    plan: {
      shelfYs: [0.5],
      shelfYNorms: [0.5],
      cellXNormMin: 0.2,
      cellXNormMax: 0.8,
      cellYNormMin: 0.1,
      cellYNormMax: 0.9,
      contentXNorm: 0.5,
      previewX: 0,
      previewW: 1,
      previewInternalZ: 0,
      previewInnerD: 0.5,
      previewWoodThick: 0.018,
      depthM: 0.4,
      blockedReason: null,
    },
  });
  const envelope = structuredClone(hover.freeBoxCommand) as {
    version: number;
    command: Record<string, unknown>;
  };

  for (const mutate of [
    (command: Record<string, unknown>) => delete command.shelfYNorms,
    (command: Record<string, unknown>) => (command.shelfYNorms = 'not-an-array'),
    (command: Record<string, unknown>) => (command.shelfYNorms = [Number.NaN]),
    (command: Record<string, unknown>) => (command.shelfYNorms = [Number.POSITIVE_INFINITY]),
    (command: Record<string, unknown>) => (command.shelfYNorms = []),
    (command: Record<string, unknown>) => (command.shelfYNorms = [0.95]),
    (command: Record<string, unknown>) => {
      command.cellXNormMin = 0.9;
      command.cellXNormMax = 0.1;
    },
    (command: Record<string, unknown>) => (command.contentXNorm = 1.5),
    (command: Record<string, unknown>) => (command.kind = 'preset-layout'),
  ]) {
    const invalidEnvelope = structuredClone(envelope);
    mutate(invalidEnvelope.command);
    assert.deepEqual(decodeFreeBoxCommand({ ...hover, freeBoxCommand: invalidEnvelope }), {
      ok: false,
      reason: 'invalid-command',
    });
  }
});

test('manual free-box protocol rejects route and payload identity drift', () => {
  const hover = createShelfGridHoverRecord({
    host,
    boxId: 'box-route',
    shelfVariant: 'regular',
    plan: {
      shelfYs: [0.5],
      shelfYNorms: [0.5],
      cellXNormMin: 0,
      cellXNormMax: 1,
      cellYNormMin: 0,
      cellYNormMax: 1,
      contentXNorm: 0.5,
      previewX: 0,
      previewW: 1,
      previewInternalZ: 0,
      previewInnerD: 0.5,
      previewWoodThick: 0.018,
      depthM: null,
      blockedReason: null,
    },
  });

  assert.deepEqual(decodeFreeBoxCommand({ ...hover, boxId: 'other-box' }), {
    ok: false,
    reason: 'route-mismatch',
  });
  assert.deepEqual(decodeFreeBoxCommand({ ...hover, kind: 'box_content_preset' }), {
    ok: false,
    reason: 'route-mismatch',
  });
});
