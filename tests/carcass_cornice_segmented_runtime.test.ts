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

test('segmented wave cornice paints internal depth-step side returns with the front fascia', () => {
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

  const segments = asSegments(asRecord(ops.cornice).segments);
  const shortInternalReturns = segments.filter(
    seg =>
      seg.kind === 'cornice_wave_side' &&
      seg.partId === 'cornice_wave_front' &&
      Number(Number(seg.depth).toFixed(3)) === 0.2
  );
  assert.equal(
    shortInternalReturns.length,
    2,
    'the two exposed side returns of a deeper module should not share paint keys with the cabinet outer sides'
  );

  assert.equal(
    segments.filter(seg => seg.partId === 'cornice_wave_side_left').length,
    1,
    'only the real exterior left cornice side should keep the left-side paint key'
  );
  assert.equal(
    segments.filter(seg => seg.partId === 'cornice_wave_side_right').length,
    1,
    'only the real exterior right cornice side should keep the right-side paint key'
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

function profileSegmentPathXBounds(seg: AnyRecord): [number, number] {
  const x = Number(seg.x);
  const length = Number(seg.length);
  const rotationY = Number(seg.rotationY);
  const halfDx = (Math.abs(Math.sin(rotationY)) * length) / 2;
  return [Number((x - halfDx).toFixed(3)), Number((x + halfDx).toFixed(3))];
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

test('classic cornice follows a hex-cell roof footprint instead of stopping at the side depth', () => {
  const totalW = 1;
  const woodThick = 0.018;
  const w = totalW - woodThick * 2;
  const ops = asRecord(
    computeCarcassOps({
      totalW,
      D: 0.6,
      H: 2.4,
      woodThick,
      baseType: '',
      doorsCount: 2,
      hasCornice: true,
      corniceType: 'classic',
      moduleInternalWidths: [w],
      moduleHeightsTotal: [2.4],
      moduleDepthsTotal: [0.5],
      moduleCfgList: [{ hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 40 } }],
    })
  );

  const cornice = asRecord(ops.cornice);
  assert.equal(cornice.mode, 'profile_open_back_segmented');
  const segments = asSegments(cornice.segments);
  const fronts = segments.filter(seg => seg.kind === 'cornice_profile_seg' && Number(seg.rotationY) !== 0);
  assert.equal(fronts.length, 3);
  const doorFront = fronts.find(
    seg => Math.abs(Number(seg.rotationY) + Math.PI / 2) < 1e-9 && Number(seg.z) > 0.29
  );
  assert.ok(doorFront, 'expected a straight cornice segment on the projected door front');
  assert.ok(
    Number(doorFront?.miterStartTrim) > 0 && Number(doorFront?.miterEndTrim) > 0,
    'expected the projected door-front profile to be miter-cut toward both diagonal hex runs'
  );
  assert.deepEqual(
    [
      Number(Number(doorFront?.miterStartTrim).toFixed(4)),
      Number(Number(doorFront?.miterEndTrim).toFixed(4)),
    ],
    [0.0065, 0.0065],
    'the shared front-path miter trim should fully bevel both joining profile runs so the front and diagonal profiles close cleanly'
  );
  const diagonals = fronts.filter(seg => Math.abs(Number(seg.rotationY) + Math.PI / 2) > 1e-3);
  assert.equal(diagonals.length, 2, 'expected both diagonal hex-cell cornice runs to be present');
  assert.ok(
    diagonals.every(seg => Number(seg.miterStartTrim) > 0 || Number(seg.miterEndTrim) > 0),
    'expected each diagonal profile run to expose a miter cut at its connection'
  );
  assert.ok(
    fronts.every(seg => seg.miterMode === 'outer_extend'),
    'hex-cell front and diagonal profile runs should extend only their outer lips at miter joints so their roof-edge bases still meet at the footprint vertices'
  );
  const leftDiagonal = diagonals.find(seg => Number(seg.x) < 0);
  const rightDiagonal = diagonals.find(seg => Number(seg.x) > 0);
  assert.ok(leftDiagonal, 'expected the left diagonal hex cornice run');
  assert.ok(rightDiagonal, 'expected the right diagonal hex cornice run');
  assert.deepEqual(
    [profileSegmentPathXBounds(leftDiagonal), profileSegmentPathXBounds(rightDiagonal)],
    [
      [-0.5, -0.2],
      [0.2, 0.5],
    ],
    'hex diagonal cornice runs should stop at the side boundaries instead of being extended outward past the side returns'
  );

  const exteriorSides = segments.filter(
    seg => seg.kind === 'cornice_profile_seg' && Number(seg.rotationY) === 0
  );
  assert.equal(exteriorSides.length, 2, 'expected the two exterior profile side returns');
  assert.ok(
    exteriorSides.every(seg => Number(Number(seg.length).toFixed(4)) === 0.4922),
    'hex-cell side returns should stop at the side-wall front; only their outer lips are miter-extended toward the diagonal profile'
  );
  assert.ok(
    exteriorSides.every(seg => seg.miterMode === 'outer_extend' && Number(seg.miterEndTrim) > 0),
    'hex-cell exterior side returns should receive an outer-lip miter instead of extending the whole straight side forward'
  );
});

test('wave cornice follows a hex-cell roof footprint with straight diagonal fillers and a waved door front', () => {
  const totalW = 1;
  const woodThick = 0.018;
  const w = totalW - woodThick * 2;
  const ops = asRecord(
    computeCarcassOps({
      totalW,
      D: 0.6,
      H: 2.4,
      woodThick,
      baseType: '',
      doorsCount: 2,
      hasCornice: true,
      corniceType: 'wave',
      moduleInternalWidths: [w],
      moduleHeightsTotal: [2.4],
      moduleDepthsTotal: [0.5],
      moduleCfgList: [{ hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 40 } }],
    })
  );

  const cornice = asRecord(ops.cornice);
  assert.equal(cornice.mode, 'wave_frame_segmented');
  const segments = asSegments(cornice.segments);
  const waveFronts = segments.filter(seg => seg.kind === 'cornice_wave_front');
  assert.equal(waveFronts.length, 1);
  assert.ok(
    waveFronts.some(seg => Math.abs(Number(seg.rotationY)) < 1e-9 && Number(seg.z) > 0.28),
    'expected the projected door front to keep the waved fascia'
  );

  const diagonalFillers = segments.filter(
    seg => seg.kind === 'cornice_wave_side' && seg.partId === 'cornice_wave_front'
  );
  assert.equal(diagonalFillers.length, 2);
  assert.ok(
    diagonalFillers.every(seg => seg.kind === 'cornice_wave_side' && Number(seg.height) > 0),
    'expected both diagonal hex-cell runs to use straight filler cornice without the top wave crown'
  );
  assert.ok(
    diagonalFillers.every(seg => !('waveAmp' in seg) && !('heightMax' in seg)),
    'diagonal hex-cell wave fillers must not carry wave-front geometry inputs'
  );
  assert.equal(
    diagonalFillers.filter(seg => Math.abs(Number(seg.rotationY)) > 1e-3).length,
    2,
    'expected both straight diagonal fillers to be rotated onto the hex roof diagonals'
  );
  const frontPaintSegments = segments.filter(seg => seg.partId === 'cornice_wave_front');
  assert.ok(
    frontPaintSegments.length === 3,
    'the waved door front and both diagonal fillers should share the main front paint part'
  );
});

function corniceSegmentLeftEdge(segment: AnyRecord): number {
  return Number(segment.x) - Number(segment.length ?? segment.width) / 2;
}

function corniceSegmentRightEdge(segment: AnyRecord): number {
  return Number(segment.x) + Number(segment.length ?? segment.width) / 2;
}

const REMOVED_SIDE_CORNICE_BASE = {
  totalW: 2,
  D: 0.6,
  H: 2.4,
  woodThick: 0.018,
  doorsCount: 4,
  baseType: '',
  hasCornice: true,
};

function profileSideSegments(segments: AnyRecord[]): AnyRecord[] {
  return segments.filter(seg => seg.kind === 'cornice_profile_seg' && Number(seg.rotationY) === 0);
}

function waveSideSegment(segments: AnyRecord[], partId: string): AnyRecord {
  const side = segments.find(seg => seg.kind === 'cornice_wave_side' && seg.partId === partId);
  assert.ok(side, `expected ${partId}`);
  return side;
}

function assertApprox(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
}

test('classic cornice keeps the left return and shifts the complete terminal shape inward when the left frame side is removed', () => {
  const intact = asRecord(
    computeCarcassOps({
      ...REMOVED_SIDE_CORNICE_BASE,
      corniceType: 'classic',
    })
  );
  const removed = asRecord(
    computeCarcassOps({
      ...REMOVED_SIDE_CORNICE_BASE,
      corniceType: 'classic',
      cfg: { removedDoorsMap: { removed_body_left: true } },
    })
  );

  const intactSegments = asSegments(asRecord(intact.cornice).segments);
  const removedSegments = asSegments(asRecord(removed.cornice).segments);
  const intactFront = frontProfileSegments(intactSegments)[0];
  const removedFront = frontProfileSegments(removedSegments)[0];
  assert.ok(intactFront && removedFront);

  assertApprox(
    corniceSegmentLeftEdge(removedFront),
    corniceSegmentLeftEdge(intactFront) + REMOVED_SIDE_CORNICE_BASE.woodThick,
    'removed-left classic front should shorten by exactly the removed side thickness'
  );
  assertApprox(
    corniceSegmentRightEdge(removedFront),
    corniceSegmentRightEdge(intactFront),
    'removed-left classic front should preserve the intact right terminal'
  );

  const intactSides = profileSideSegments(intactSegments).sort((a, b) => Number(a.x) - Number(b.x));
  const removedSides = profileSideSegments(removedSegments).sort((a, b) => Number(a.x) - Number(b.x));
  assert.equal(removedSides.length, 2, 'both classic terminal returns should remain');
  assertApprox(
    Number(removedSides[0].x),
    Number(intactSides[0].x) + REMOVED_SIDE_CORNICE_BASE.woodThick,
    'left classic return should move onto the roof by the removed side thickness'
  );
  assertApprox(
    Number(removedSides[1].x),
    Number(intactSides[1].x),
    'right classic return should stay unchanged'
  );
  assert.equal(removedSides[0].length, intactSides[0].length);
  assert.deepEqual(removedSides[0].profile, intactSides[0].profile);
});

test('wave cornice keeps the right return and shifts it inward together with the shortened front', () => {
  const intact = asRecord(
    computeCarcassOps({
      ...REMOVED_SIDE_CORNICE_BASE,
      corniceType: 'wave',
    })
  );
  const removed = asRecord(
    computeCarcassOps({
      ...REMOVED_SIDE_CORNICE_BASE,
      corniceType: 'wave',
      cfg: { removedDoorsMap: { removed_body_right: true } },
    })
  );

  const intactSegments = asSegments(asRecord(intact.cornice).segments);
  const removedSegments = asSegments(asRecord(removed.cornice).segments);
  const intactFront = intactSegments.find(seg => seg.kind === 'cornice_wave_front');
  const removedFront = removedSegments.find(seg => seg.kind === 'cornice_wave_front');
  assert.ok(intactFront && removedFront);

  assertApprox(
    corniceSegmentLeftEdge(removedFront),
    corniceSegmentLeftEdge(intactFront),
    'removed-right wave front should preserve the intact left terminal'
  );
  assertApprox(
    corniceSegmentRightEdge(removedFront),
    corniceSegmentRightEdge(intactFront) - REMOVED_SIDE_CORNICE_BASE.woodThick,
    'removed-right wave front should shorten by exactly the removed side thickness'
  );

  const intactLeft = waveSideSegment(intactSegments, 'cornice_wave_side_left');
  const intactRight = waveSideSegment(intactSegments, 'cornice_wave_side_right');
  const removedLeft = waveSideSegment(removedSegments, 'cornice_wave_side_left');
  const removedRight = waveSideSegment(removedSegments, 'cornice_wave_side_right');
  assertApprox(Number(removedLeft.x), Number(intactLeft.x), 'left wave return should stay unchanged');
  assertApprox(
    Number(removedRight.x),
    Number(intactRight.x) - REMOVED_SIDE_CORNICE_BASE.woodThick,
    'right wave return should move onto the roof by the removed side thickness'
  );
  assert.equal(removedRight.width, intactRight.width);
  assert.equal(removedRight.depth, intactRight.depth);
});

test('segmented cornice shifts both exterior returns inward while preserving the stepped terminal geometry', () => {
  const moduleWidth = moduleInternalWidth(
    REMOVED_SIDE_CORNICE_BASE.totalW,
    REMOVED_SIDE_CORNICE_BASE.woodThick,
    2
  );
  const common = {
    ...REMOVED_SIDE_CORNICE_BASE,
    corniceType: 'classic',
    moduleInternalWidths: [moduleWidth, moduleWidth],
    moduleHeightsTotal: [2.2, 2.4],
    moduleDepthsTotal: [0.6, 0.6],
  };
  const intact = asRecord(computeCarcassOps(common));
  const removed = asRecord(
    computeCarcassOps({
      ...common,
      cfg: {
        removedDoorsMap: {
          removed_body_left: true,
          removed_body_right: true,
        },
      },
    })
  );

  const intactSegments = asSegments(asRecord(intact.cornice).segments);
  const removedCornice = asRecord(removed.cornice);
  const removedSegments = asSegments(removedCornice.segments);
  assert.equal(removedCornice.mode, 'profile_open_back_segmented');

  const intactFronts = frontProfileSegments(intactSegments).sort((a, b) => Number(a.x) - Number(b.x));
  const removedFronts = frontProfileSegments(removedSegments).sort((a, b) => Number(a.x) - Number(b.x));
  assert.equal(removedFronts.length, 2);
  assertApprox(
    corniceSegmentLeftEdge(removedFronts[0]),
    corniceSegmentLeftEdge(intactFronts[0]) + REMOVED_SIDE_CORNICE_BASE.woodThick,
    'first segmented front should shorten at the removed left side'
  );
  assertApprox(
    corniceSegmentRightEdge(removedFronts[1]),
    corniceSegmentRightEdge(intactFronts[1]) - REMOVED_SIDE_CORNICE_BASE.woodThick,
    'last segmented front should shorten at the removed right side'
  );

  const intactSides = profileSideSegments(intactSegments).sort((a, b) => Number(a.x) - Number(b.x));
  const removedSides = profileSideSegments(removedSegments).sort((a, b) => Number(a.x) - Number(b.x));
  assert.equal(removedSides.length, intactSides.length, 'segmented exterior returns must not be deleted');
  assertApprox(
    Number(removedSides[0].x),
    Number(intactSides[0].x) + REMOVED_SIDE_CORNICE_BASE.woodThick,
    'segmented left exterior return should shift inward'
  );
  assertApprox(
    Number(removedSides[removedSides.length - 1].x),
    Number(intactSides[intactSides.length - 1].x) - REMOVED_SIDE_CORNICE_BASE.woodThick,
    'segmented right exterior return should shift inward'
  );
});

test('lower-stack removed-side identity shifts only the matching lower cornice return', () => {
  const upperOnly = asRecord(
    computeCarcassOps({
      ...REMOVED_SIDE_CORNICE_BASE,
      corniceType: 'wave',
      frameSidePartIdPrefix: 'lower_',
      cfg: { removedDoorsMap: { removed_body_left: true } },
    })
  );
  const lowerRemoved = asRecord(
    computeCarcassOps({
      ...REMOVED_SIDE_CORNICE_BASE,
      corniceType: 'wave',
      frameSidePartIdPrefix: 'lower_',
      cfg: { removedDoorsMap: { removed_lower_body_left: true } },
    })
  );

  const upperOnlySegments = asSegments(asRecord(upperOnly.cornice).segments);
  const lowerSegments = asSegments(asRecord(lowerRemoved.cornice).segments);
  const upperLeft = waveSideSegment(upperOnlySegments, 'cornice_wave_side_left');
  const lowerLeft = waveSideSegment(lowerSegments, 'cornice_wave_side_left');
  assertApprox(
    Number(lowerLeft.x),
    Number(upperLeft.x) + REMOVED_SIDE_CORNICE_BASE.woodThick,
    'lower removed-left identity should move only the lower cornice terminal inward'
  );
  assert.equal(lowerLeft.width, upperLeft.width);
  assert.equal(lowerLeft.depth, upperLeft.depth);
});
