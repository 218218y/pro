import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureSketchCommitRecordList,
  readSketchCommitNumber,
  writeSketchCommitClampedUnitNumber,
  writeSketchCommitPositiveNumber,
} from '../esm/native/services/canvas_picking_sketch_commit_geometry.ts';
import { commitSketchModuleBoxContent } from '../esm/native/services/canvas_picking_sketch_box_content_commit.ts';
import { commitSketchFreePlacementHoverRecord } from '../esm/native/services/canvas_picking_sketch_free_commit.ts';

test('sketch commit geometry accepts only finite runtime numbers and does not parse draft strings', () => {
  assert.equal(readSketchCommitNumber(0.42), 0.42);
  assert.equal(readSketchCommitNumber('0.42'), null);
  assert.equal(readSketchCommitNumber(Number.NaN), null);

  const item: Record<string, unknown> = {};
  assert.equal(writeSketchCommitPositiveNumber(item, 'heightM', '0.7'), false);
  assert.equal(item.heightM, undefined);
  assert.equal(writeSketchCommitPositiveNumber(item, 'heightM', 0.7), true);
  assert.equal(item.heightM, 0.7);
  assert.equal(writeSketchCommitClampedUnitNumber(item, 'yNorm', 1.4, 0.5), 1);
  assert.equal(item.yNorm, 1);
});

test('sketch commit lists preserve valid existing records while pruning legacy junk entries', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        { id: 'kept-free', freePlacement: true, absX: 0, absY: 1, widthM: 0.8, heightM: 1, depthM: 0.4 },
        'legacy-junk',
      ],
    },
  };

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            _side: string,
            _moduleKey: unknown,
            patcher: (cfgRef: Record<string, unknown>) => void
          ) => patcher(cfg),
        },
      },
    } as never,
    host: { moduleKey: 1, isBottom: false },
    hoverRec: {
      kind: 'box',
      freePlacement: true,
      xCenter: 0.25,
      yCenter: 1.1,
      heightM: 0.9,
      widthM: 0.7,
      depthM: 0.4,
    } as never,
  });

  assert.deepEqual(result, { committed: true, nextHover: null });
  const boxes = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>) || [];
  assert.equal(boxes.length, 2);
  assert.equal(boxes[0]?.id, 'kept-free');
  assert.equal(boxes[1]?.freePlacement, true);
  assert.equal(typeof boxes[1]?.heightM, 'number');
});

test('sketch-box content commit preserves valid existing content when pruning mixed legacy arrays', () => {
  const box: Record<string, unknown> = {
    id: 'sb1',
    absX: 1,
    absY: 1,
    widthM: 1,
    heightM: 1,
    depthM: 0.6,
    drawers: [{ id: 'kept-drawer', yNormC: 0.2 }, 'legacy-junk'],
  };

  commitSketchModuleBoxContent({
    box: box as never,
    boxId: 'sb1',
    contentKind: 'drawers',
    hoverRec: {
      kind: 'box_content',
      contentKind: 'drawers',
      boxId: 'sb1',
      op: 'add',
      boxYNorm: 0.6,
      boxBaseYNorm: 0.42,
      contentXNorm: 0.4,
      drawerHeightM: 0.18,
    },
  });

  const drawers = box.drawers as Array<Record<string, unknown>>;
  assert.equal(drawers.length, 2);
  assert.equal(drawers[0]?.id, 'kept-drawer');
  assert.equal(drawers[1]?.yNormC, 0.6);
  assert.equal(drawers[1]?.yNorm, 0.42);
  assert.equal(drawers[1]?.xNorm, 0.4);
  assert.equal(drawers[1]?.drawerHeightM, 0.18);
});

test('ensureSketchCommitRecordList mutates the owner list so callers can append through the returned array', () => {
  const owner: Record<string, unknown> = { shelves: ['junk', { id: 'kept', yNorm: 0.4 }] };
  const list = ensureSketchCommitRecordList(owner, 'shelves');
  list.push({ id: 'added', yNorm: 0.7 });
  assert.deepEqual(owner.shelves, [
    { id: 'kept', yNorm: 0.4 },
    { id: 'added', yNorm: 0.7 },
  ]);
});
