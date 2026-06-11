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

test('wave cornice front fascia is vertically aligned with side fascia anchors', () => {
  const ops = asRecord(
    computeCarcassOps({
      totalW: 2.4,
      D: 0.6,
      H: 2.4,
      woodThick: 0.018,
      baseType: '',
      doorsCount: 4,
      hasCornice: true,
      corniceType: 'wave',
    })
  );

  const cornice = asRecord(ops.cornice);
  const segments = asSegments(cornice.segments);
  const front = segments.find(seg => seg.kind === 'cornice_wave_front');
  const left = segments.find(seg => seg.partId === 'cornice_wave_side_left');
  const right = segments.find(seg => seg.partId === 'cornice_wave_side_right');

  assert.ok(front, 'expected wave front cornice segment');
  assert.ok(left, 'expected left wave side cornice segment');
  assert.ok(right, 'expected right wave side cornice segment');

  const frontY = Number(front?.y);
  const frontHeightMax = Number(front?.heightMax);
  const leftY = Number(left?.y);
  const leftHeight = Number(left?.height);
  const rightY = Number(right?.y);
  const rightHeight = Number(right?.height);

  assert.ok(Number.isFinite(frontY));
  assert.ok(Number.isFinite(frontHeightMax));
  assert.ok(Number.isFinite(leftY));
  assert.ok(Number.isFinite(leftHeight));
  assert.ok(Number.isFinite(rightY));
  assert.ok(Number.isFinite(rightHeight));

  const frontBottom = frontY - frontHeightMax / 2;
  const leftBottom = leftY - leftHeight / 2;
  const rightBottom = rightY - rightHeight / 2;

  assert.ok(
    Math.abs(frontBottom - leftBottom) < 1e-9,
    `front bottom ${frontBottom} should match left bottom ${leftBottom}`
  );
  assert.ok(
    Math.abs(frontBottom - rightBottom) < 1e-9,
    `front bottom ${frontBottom} should match right bottom ${rightBottom}`
  );
});
