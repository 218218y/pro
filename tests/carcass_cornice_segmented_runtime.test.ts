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
