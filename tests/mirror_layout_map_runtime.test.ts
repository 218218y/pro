import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cloneMirrorLayoutList,
  findMirrorLayoutMatchInRect,
  readMirrorLayoutMap,
  resolveMirrorPlacementListInRect,
} from '../esm/native/features/mirror_layout.ts';

test('mirror layout runtime clones map/list payloads so callers cannot mutate canonical mirror snapshots', () => {
  const source = {
    d1: [{ widthCm: 55, heightCm: 65, centerXNorm: 0.2 }],
  };

  const map = readMirrorLayoutMap(source);
  assert.notEqual(map.d1, source.d1);
  assert.notEqual(map.d1[0], source.d1[0]);

  map.d1[0].widthCm = 90;
  assert.equal(source.d1[0].widthCm, 55);

  const cloned = cloneMirrorLayoutList(source.d1);
  assert.notEqual(cloned, source.d1);
  assert.notEqual(cloned[0], source.d1[0]);
  cloned[0].heightCm = 12;
  assert.equal(source.d1[0].heightCm, 65);
});

test('mirror layout runtime preserves placement/match parity after family split', () => {
  const rect = { minX: 0, maxX: 1.4, minY: 0, maxY: 2.1 };
  const layouts = [
    { widthCm: 60, heightCm: 80, centerXNorm: 0.3, centerYNorm: 0.35 },
    { widthCm: 40, heightCm: 50, centerXNorm: 0.7, centerYNorm: 0.65, faceSign: -1 },
  ];

  const placements = resolveMirrorPlacementListInRect({ rect, layouts });
  assert.equal(placements.length, 2);
  assert.equal(placements[0].faceSign, 1);
  assert.equal(placements[1].faceSign, -1);

  const match = findMirrorLayoutMatchInRect({
    rect,
    layouts,
    hitX: placements[1].centerX,
    hitY: placements[1].centerY,
    toleranceM: 0.001,
    faceSign: -1,
  });
  assert.ok(match);
  assert.equal(match!.index, 1);
  assert.equal(match!.layout.faceSign, -1);
  assert.notEqual(match!.layout, layouts[1]);
});
