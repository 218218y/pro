import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMirrorLayoutFromHit,
  buildSnappedMirrorCenterFromHit,
  findMirrorLayoutMatchInRect,
  readMirrorLayoutListForPart,
  resolveMirrorPlacementInRect,
  resolveMirrorPlacementListInRect,
} from '../esm/native/features/mirror_layout.ts';

test('mirror layout runtime resolves scoped part lookup and canonical full-key fallback for lower stacks', () => {
  const scopedOnly = readMirrorLayoutListForPart({
    map: {
      lower_corner_door_1_full: [{ widthCm: 50, heightCm: 60, centerXNorm: 0.25, centerYNorm: 0.5 }],
    },
    partId: 'corner_door_1_full',
    scopedPartId: 'lower_corner_door_1_full',
    preferScopedOnly: true,
  });
  assert.equal(scopedOnly.length, 1);
  assert.equal(scopedOnly[0].widthCm, 50);
  assert.equal(scopedOnly[0].heightCm, 60);
  assert.equal(scopedOnly[0].centerXNorm, 0.25);

  const canonicalFull = readMirrorLayoutListForPart({
    map: {
      corner_pent_door_2_full: [{ widthCm: 44, heightCm: 70, faceSign: -1 }],
    },
    partId: 'corner_pent_door_2',
  });
  assert.equal(canonicalFull.length, 1);
  assert.equal(canonicalFull[0].widthCm, 44);
  assert.equal(canonicalFull[0].heightCm, 70);
  assert.equal(canonicalFull[0].faceSign, -1);
});

test('mirror layout runtime reuses rect math consistently across single and multi-placement resolution', () => {
  const rect = { minX: 1.2, maxX: -0.2, minY: 0.8, maxY: -0.4 };
  const single = resolveMirrorPlacementInRect({
    rect,
    layout: { widthCm: 80, heightCm: 60, centerXNorm: 0.75, centerYNorm: 0.25, faceSign: -1 },
  });
  const multi = resolveMirrorPlacementListInRect({
    rect,
    layouts: [
      { widthCm: 80, heightCm: 60, centerXNorm: 0.75, centerYNorm: 0.25, faceSign: -1 },
      { widthCm: 40, heightCm: 30 },
    ],
  });

  assert.equal(multi.length, 2);
  assert.deepEqual(multi[0], single);
  assert.equal(multi[0].faceSign, -1);
  assert.equal(multi[1].faceSign, 1);
  assert.equal(multi[0].mirrorWidthM, 0.8);
  assert.equal(multi[0].mirrorHeightM, 0.6);
  assert.equal(multi[1].centerXNorm, 0.5);
  assert.equal(multi[1].centerYNorm, 0.5);
});

test('mirror layout runtime keeps snapped-center build and face-aware hit matching behavior', () => {
  const rect = { minX: 0, maxX: 1.2, minY: 0, maxY: 2 };
  const center = buildSnappedMirrorCenterFromHit({
    rect,
    hitX: 0.61,
    hitY: 1.01,
    thresholdNorm: 0.03,
  });
  assert.equal(center.snappedX, true);
  assert.equal(center.snappedY, true);
  assert.equal(center.isCentered, true);
  assert.equal(center.centerXNorm, 0.5);
  assert.equal(center.centerYNorm, 0.5);

  const front = buildMirrorLayoutFromHit({
    rect,
    hitX: 0.15,
    hitY: 0.45,
    draft: { widthCm: 35, heightCm: 45 },
    faceSign: 1,
  });
  const back = buildMirrorLayoutFromHit({
    rect,
    hitX: 1.02,
    hitY: 1.55,
    draft: { widthCm: 35, heightCm: 45 },
    faceSign: -1,
  });
  assert.ok(front);
  assert.ok(back);

  const frontMatch = findMirrorLayoutMatchInRect({
    rect,
    layouts: [front, back],
    hitX: 0.15,
    hitY: 0.45,
    toleranceM: 0.001,
    faceSign: 1,
  });
  assert.ok(frontMatch);
  assert.equal(frontMatch!.index, 0);
  assert.equal(frontMatch!.layout.faceSign, undefined);

  const backMatch = findMirrorLayoutMatchInRect({
    rect,
    layouts: [front, back],
    hitX: 1.02,
    hitY: 1.55,
    toleranceM: 0.001,
    faceSign: -1,
  });
  assert.ok(backMatch);
  assert.equal(backMatch!.index, 1);
  assert.equal(backMatch!.layout.faceSign, -1);

  const wrongFace = findMirrorLayoutMatchInRect({
    rect,
    layouts: [front, back],
    hitX: 1.02,
    hitY: 1.55,
    toleranceM: 0.001,
    faceSign: 1,
  });
  assert.equal(wrongFace, null);
});
