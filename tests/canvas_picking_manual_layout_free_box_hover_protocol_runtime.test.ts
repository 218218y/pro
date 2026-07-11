import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBraceShelvesHoverRecord,
  createPresetLayoutHoverRecord,
  createShelfGridHoverRecord,
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
