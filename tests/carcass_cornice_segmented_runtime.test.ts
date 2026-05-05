import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_pure_compute.ts';

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return (value && typeof value === 'object' ? value : {}) as AnyRecord;
}

function asSegments(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function moduleInternalWidth(totalW: number, woodThick: number, moduleCount: number): number {
  return (totalW - (moduleCount + 1) * woodThick) / moduleCount;
}

function frontProfileSegments(segments: AnyRecord[]): AnyRecord[] {
  return segments.filter(
    seg => seg.kind === 'cornice_profile_seg' && Math.abs(Number(seg.rotationY) + Math.PI / 2) < 1e-9
  );
}

test('segmented classic cornice follows the top height of each stepped module', () => {
  const totalW = 2.4;
  const woodThick = 0.018;
  const w = moduleInternalWidth(totalW, woodThick, 3);
  const ops = asRecord(
    computeCarcassOps({
      totalW,
      D: 0.55,
      H: 2.6,
      woodThick,
      baseType: '',
      doorsCount: 3,
      hasCornice: true,
      corniceType: 'classic',
      moduleInternalWidths: [w, w, w],
      moduleHeightsTotal: [2.4, 2.6, 2.4],
      moduleDepthsTotal: [0.55, 0.55, 0.55],
    })
  );

  const cornice = asRecord(ops.cornice);
  assert.equal(cornice.mode, 'profile_open_back_segmented');

  const fronts = frontProfileSegments(asSegments(cornice.segments));
  assert.equal(fronts.length, 3);
  assert.deepEqual(
    fronts.map(seg => Number(Number(seg.y).toFixed(4))),
    [2.4006, 2.6006, 2.4006]
  );
});

test('segmented classic cornice follows module depth and only exposes the deeper shared side', () => {
  const totalW = 2.4;
  const woodThick = 0.018;
  const w = moduleInternalWidth(totalW, woodThick, 3);
  const ops = asRecord(
    computeCarcassOps({
      totalW,
      D: 0.55,
      H: 2.4,
      woodThick,
      baseType: '',
      doorsCount: 3,
      hasCornice: true,
      corniceType: 'classic',
      moduleInternalWidths: [w, w, w],
      moduleHeightsTotal: [2.4, 2.4, 2.4],
      moduleDepthsTotal: [0.55, 0.75, 0.55],
    })
  );

  const cornice = asRecord(ops.cornice);
  assert.equal(cornice.mode, 'profile_open_back_segmented');

  const segments = asSegments(cornice.segments);
  const fronts = frontProfileSegments(segments);
  assert.equal(fronts.length, 3);
  assert.deepEqual(
    fronts.map(seg => Number(Number(seg.z).toFixed(3))),
    [0.275, 0.475, 0.275]
  );

  const sideProfiles = segments.filter(
    seg => seg.kind === 'cornice_profile_seg' && Number(seg.rotationY) === 0
  );
  assert.equal(sideProfiles.length, 4);
  assert.equal(
    sideProfiles.filter(seg => Number(Number(seg.length).toFixed(3)) === 0.24).length,
    2,
    'only the deeper middle run should get short internal side returns for the exposed depth extension'
  );
});

test('segmented wave cornice fronts follow the module depth instead of the global cabinet depth', () => {
  const totalW = 2.4;
  const woodThick = 0.018;
  const w = moduleInternalWidth(totalW, woodThick, 3);
  const ops = asRecord(
    computeCarcassOps({
      totalW,
      D: 0.55,
      H: 2.4,
      woodThick,
      baseType: '',
      doorsCount: 3,
      hasCornice: true,
      corniceType: 'wave',
      moduleInternalWidths: [w, w, w],
      moduleHeightsTotal: [2.4, 2.4, 2.4],
      moduleDepthsTotal: [0.55, 0.75, 0.55],
    })
  );

  const cornice = asRecord(ops.cornice);
  assert.equal(cornice.mode, 'wave_frame_segmented');

  const fronts = asSegments(cornice.segments).filter(seg => seg.kind === 'cornice_wave_front');
  assert.equal(fronts.length, 3);
  assert.deepEqual(
    fronts.map(seg => Number(Number(seg.z).toFixed(3))),
    [0.257, 0.457, 0.257]
  );
});

function profileSegmentXBounds(seg: AnyRecord): [number, number] {
  const x = Number(seg.x);
  const length = Number(seg.length);
  return [Number((x - length / 2).toFixed(3)), Number((x + length / 2).toFixed(3))];
}

function moduleRunBoundaries(totalW: number, woodThick: number, moduleCount: number): number[] {
  const w = moduleInternalWidth(totalW, woodThick, moduleCount);
  const boundaries = [-totalW / 2];
  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleCount; i++) {
    const right = i === moduleCount - 1 ? totalW / 2 : internalLeft + w + woodThick;
    boundaries.push(Number(right.toFixed(3)));
    internalLeft += w + (i < moduleCount - 1 ? woodThick : 0);
  }
  return boundaries;
}

function sideProfileSegmentsAt(segments: AnyRecord[], x: number): AnyRecord[] {
  return segments.filter(
    seg =>
      seg.kind === 'cornice_profile_seg' && Number(seg.rotationY) === 0 && Math.abs(Number(seg.x) - x) < 1e-6
  );
}

function renderedProfileXBounds(seg: AnyRecord): [number, number] {
  const profile = asSegments(seg.profile);
  const xs = profile.map(point => Number(point.x)).filter(Number.isFinite);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const origin = Number(seg.x);
  if (seg.flipX) {
    return [Number((origin - max).toFixed(3)), Number((origin - min).toFixed(3))];
  }
  return [Number((origin + min).toFixed(3)), Number((origin + max).toFixed(3))];
}

function assertInternalSideStopsAtBoundary(seg: AnyRecord, boundary: number): void {
  const [minX, maxX] = renderedProfileXBounds(seg);
  const roundedBoundary = Number(boundary.toFixed(3));
  if (seg.flipX) {
    assert.equal(maxX, roundedBoundary);
    assert.ok(minX < roundedBoundary);
  } else {
    assert.equal(minX, roundedBoundary);
    assert.ok(maxX > roundedBoundary);
  }
}

function assertExternalSideHasDecorativeOverhang(seg: AnyRecord, boundary: number): void {
  const [minX, maxX] = renderedProfileXBounds(seg);
  const roundedBoundary = Number(boundary.toFixed(3));
  assert.ok(
    minX < roundedBoundary && maxX > roundedBoundary,
    `external side should straddle boundary ${roundedBoundary}, got [${minX}, ${maxX}]`
  );
}

function sideAtY(sides: AnyRecord[], y: number): AnyRecord {
  const match = sides.find(seg => Number(Number(seg.y).toFixed(4)) === y);
  assert.ok(match, `expected cornice side at y=${y}`);
  return match;
}

test('segmented classic cornice gives the taller middle module exterior side caps and cuts the lower neighbors straight', () => {
  const totalW = 2.4;
  const woodThick = 0.018;
  const w = moduleInternalWidth(totalW, woodThick, 3);
  const [, boundary01, boundary12] = moduleRunBoundaries(totalW, woodThick, 3);
  const ops = asRecord(
    computeCarcassOps({
      totalW,
      D: 0.55,
      H: 2.6,
      woodThick,
      baseType: '',
      doorsCount: 3,
      hasCornice: true,
      corniceType: 'classic',
      moduleInternalWidths: [w, w, w],
      moduleHeightsTotal: [2.4, 2.6, 2.4],
      moduleDepthsTotal: [0.55, 0.55, 0.55],
    })
  );

  const segments = asSegments(asRecord(ops.cornice).segments);
  const fronts = frontProfileSegments(segments);
  assert.deepEqual(fronts.map(profileSegmentXBounds), [
    [-1.26, boundary01],
    [Number((boundary01 - 0.06).toFixed(3)), Number((boundary12 + 0.06).toFixed(3))],
    [boundary12, 1.26],
  ]);

  const leftBoundarySides = sideProfileSegmentsAt(segments, boundary01);
  const rightBoundarySides = sideProfileSegmentsAt(segments, boundary12);
  assert.equal(leftBoundarySides.length, 2);
  assert.equal(rightBoundarySides.length, 2);

  assertInternalSideStopsAtBoundary(sideAtY(leftBoundarySides, 2.4006), boundary01);
  assertExternalSideHasDecorativeOverhang(sideAtY(leftBoundarySides, 2.6006), boundary01);
  assertExternalSideHasDecorativeOverhang(sideAtY(rightBoundarySides, 2.6006), boundary12);
  assertInternalSideStopsAtBoundary(sideAtY(rightBoundarySides, 2.4006), boundary12);
});

test('segmented classic cornice cuts the shorter middle module straight and gives the taller neighbors exterior side caps', () => {
  const totalW = 2.4;
  const woodThick = 0.018;
  const w = moduleInternalWidth(totalW, woodThick, 3);
  const [, boundary01, boundary12] = moduleRunBoundaries(totalW, woodThick, 3);
  const ops = asRecord(
    computeCarcassOps({
      totalW,
      D: 0.55,
      H: 2.6,
      woodThick,
      baseType: '',
      doorsCount: 3,
      hasCornice: true,
      corniceType: 'classic',
      moduleInternalWidths: [w, w, w],
      moduleHeightsTotal: [2.6, 2.4, 2.6],
      moduleDepthsTotal: [0.55, 0.55, 0.55],
    })
  );

  const segments = asSegments(asRecord(ops.cornice).segments);
  const fronts = frontProfileSegments(segments);
  assert.deepEqual(fronts.map(profileSegmentXBounds), [
    [-1.26, Number((boundary01 + 0.06).toFixed(3))],
    [boundary01, boundary12],
    [Number((boundary12 - 0.06).toFixed(3)), 1.26],
  ]);

  const leftBoundarySides = sideProfileSegmentsAt(segments, boundary01);
  const rightBoundarySides = sideProfileSegmentsAt(segments, boundary12);
  assert.equal(leftBoundarySides.length, 2);
  assert.equal(rightBoundarySides.length, 2);

  assertExternalSideHasDecorativeOverhang(sideAtY(leftBoundarySides, 2.6006), boundary01);
  assertInternalSideStopsAtBoundary(sideAtY(leftBoundarySides, 2.4006), boundary01);
  assertInternalSideStopsAtBoundary(sideAtY(rightBoundarySides, 2.4006), boundary12);
  assertExternalSideHasDecorativeOverhang(sideAtY(rightBoundarySides, 2.6006), boundary12);
});
